-- Training completion & certification correctness, and recertification cycles.
--
-- Fixes:
--   * complete_training_module marked every module passed = true without checking
--     the module's passing_score_percentage.
--   * Certificates copied their score from training_progress.quiz_score, a column the
--     completion RPC never set and the integrity trigger did not protect.
--   * Recertification could not work: training_progress is one row per
--     (user, training) and completion is sticky. process_certificate_expirations
--     "reset" the row without the trusted-write flag, so enforce_training_progress_integrity
--     silently kept it completed; old quiz sessions and block progress would also
--     have satisfied the next completion immediately. Its assignment insert also
--     omitted organization_id (NOT NULL), failing the nightly job for any expiry.
--
-- Model: a learner's progress row now runs in cycles. Starting a new cycle archives
-- the previous completion into training_completion_history, supersedes the active
-- certificate, archives the module's quiz sessions and clears block progress.

-- ---------------------------------------------------------------------------
-- 1. Cycle bookkeeping
-- ---------------------------------------------------------------------------
ALTER TABLE public.training_progress ADD COLUMN IF NOT EXISTS cycle_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.training_completion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_id uuid NOT NULL,
  training_progress_id uuid REFERENCES public.training_progress(id) ON DELETE SET NULL,
  certificate_id uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
  cycle_started_at timestamptz,
  completed_at timestamptz,
  score_percentage numeric,
  passed boolean,
  reason text NOT NULL,
  archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_completion_history_user_training
  ON public.training_completion_history (user_id, training_id);
CREATE INDEX IF NOT EXISTS idx_training_completion_history_org
  ON public.training_completion_history (organization_id);
CREATE INDEX IF NOT EXISTS idx_training_completion_history_progress
  ON public.training_completion_history (training_progress_id);
CREATE INDEX IF NOT EXISTS idx_training_completion_history_certificate
  ON public.training_completion_history (certificate_id);
CREATE INDEX IF NOT EXISTS idx_training_completion_history_archived_by
  ON public.training_completion_history (archived_by);

ALTER TABLE public.training_completion_history ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.training_completion_history FROM anon, authenticated;

DROP POLICY IF EXISTS training_completion_history_select ON public.training_completion_history;
CREATE POLICY training_completion_history_select ON public.training_completion_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id)));

-- ---------------------------------------------------------------------------
-- 2. Integrity trigger also protects quiz_score and the cycle marker.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_training_progress_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.trusted_progress_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.passed := OLD.passed;
    NEW.score_percentage := OLD.score_percentage;
    NEW.quiz_score := OLD.quiz_score;
    NEW.cycle_started_at := OLD.cycle_started_at;
    -- Neither promote to completed nor demote away from it via an untrusted
    -- write - only the trusted RPCs (which set the bypass flag above) may
    -- change completion state.
    IF OLD.status = 'completed' THEN
      NEW.status := 'completed';
    ELSIF NEW.status = 'completed' THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.completed_at IS NOT NULL THEN
      NEW.completed_at := OLD.completed_at;
    ELSE
      NEW.completed_at := NULL;
    END IF;
  ELSE
    NEW.passed := NULL;
    NEW.score_percentage := NULL;
    NEW.quiz_score := NULL;
    NEW.completed_at := NULL;
    NEW.cycle_started_at := NULL;
    IF NEW.status = 'completed' THEN
      NEW.status := 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Start a new cycle for one progress row (internal).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._reset_training_cycle(p_progress_id uuid, p_reason text, p_actor uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tp public.training_progress%ROWTYPE;
  v_cert_id uuid;
  v_history_id uuid;
  v_block_ids uuid[];
  v_quiz_ids uuid[];
BEGIN
  SELECT * INTO v_tp FROM public.training_progress WHERE id = p_progress_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training progress not found';
  END IF;

  SELECT c.id INTO v_cert_id
    FROM public.certificates c
   WHERE c.training_progress_id = v_tp.id AND c.certificate_type = 'training'
   ORDER BY c.created_at DESC
   LIMIT 1;

  INSERT INTO public.training_completion_history (
    organization_id, user_id, training_id, training_progress_id, certificate_id,
    cycle_started_at, completed_at, score_percentage, passed, reason, archived_by
  ) VALUES (
    v_tp.organization_id, v_tp.user_id, v_tp.training_id, v_tp.id, v_cert_id,
    v_tp.cycle_started_at, v_tp.completed_at, v_tp.score_percentage, v_tp.passed,
    p_reason, p_actor
  ) RETURNING id INTO v_history_id;

  -- A still-valid certificate is replaced by the new cycle's certificate.
  UPDATE public.certificates
     SET status = 'superseded', updated_at = now()
   WHERE training_progress_id = v_tp.id
     AND certificate_type = 'training'
     AND status = 'active';

  SELECT array_agg(b.id),
         array_agg(public._safe_uuid(b.content_data ->> 'quiz_id')) FILTER (WHERE b.type = 'quiz')
    INTO v_block_ids, v_quiz_ids
    FROM public.training_content_blocks_v b
   WHERE b.training_module_id = v_tp.training_id;

  DELETE FROM public.training_block_progress
   WHERE user_id = v_tp.user_id
     AND (training_module_id = v_tp.training_id OR block_id = ANY (COALESCE(v_block_ids, '{}')));

  UPDATE public.unified_quiz_sessions
     SET archived_at = now()
   WHERE user_id = v_tp.user_id
     AND quiz_entity_id = ANY (COALESCE(v_quiz_ids, '{}'))
     AND archived_at IS NULL;

  PERFORM set_config('app.trusted_progress_write', 'on', true);

  UPDATE public.training_progress
     SET status = 'not_started',
         progress_percentage = 0,
         score_percentage = NULL,
         quiz_score = NULL,
         passed = NULL,
         completed_at = NULL,
         last_block_id = NULL,
         last_block_index = NULL,
         cycle_started_at = now(),
         metadata = COALESCE(metadata, '{}'::jsonb) - 'completed_blocks' - 'active_block_id',
         updated_at = now()
   WHERE id = v_tp.id;

  -- The module's quiz-level progress rows restart too.
  UPDATE public.training_progress
     SET status = 'not_started',
         progress_percentage = 0,
         score_percentage = NULL,
         quiz_score = NULL,
         passed = NULL,
         completed_at = NULL,
         cycle_started_at = now(),
         updated_at = now()
   WHERE user_id = v_tp.user_id
     AND lp_content_type = 'quiz'
     AND training_id = ANY (COALESCE(v_quiz_ids, '{}'));

  PERFORM set_config('app.trusted_progress_write', 'off', true);

  RETURN v_history_id;
END;
$function$;

REVOKE ALL ON FUNCTION public._reset_training_cycle(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Module completion: current cycle only, passing score enforced.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_training_module(p_module_id uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_completed_block_ids uuid[] DEFAULT ARRAY[]::uuid[], p_last_block_id uuid DEFAULT NULL::uuid, p_last_block_index integer DEFAULT 0, p_time_spent_seconds integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_module public.training_modules%ROWTYPE;
  v_block record;
  v_quiz_id uuid;
  v_quiz_title text;
  v_require_pass boolean;
  v_require_approval boolean;
  v_session record;
  v_quiz_progress public.training_progress%ROWTYPE;
  v_assignment_sub record;
  v_found boolean;
  v_block_score numeric;
  v_score_sum numeric := 0;
  v_score_n integer := 0;
  v_gate_sum numeric := 0;
  v_gate_n integer := 0;
  v_final_score numeric;
  v_gate_score numeric;
  v_passing_score numeric;
  v_existing public.training_progress%ROWTYPE;
  v_cycle_start timestamptz;
  v_metadata jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_module FROM public.training_modules WHERE id = p_module_id AND is_deleted = false;
  IF NOT FOUND OR NOT (public.org_visible(v_module.organization_id) OR public.is_platform_super_admin()) THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  SELECT * INTO v_existing FROM public.training_progress
   WHERE user_id = v_user_id AND training_id = p_module_id;
  v_cycle_start := COALESCE(v_existing.cycle_started_at, '-infinity'::timestamptz);

  FOR v_block IN
    SELECT id, type, title, content_data, is_mandatory
      FROM public.training_content_blocks_v
     WHERE training_module_id = p_module_id AND is_deleted = false
  LOOP
    v_block_score := NULL;

    -- 1. Quiz blocks
    IF v_block.type = 'quiz' THEN
      v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
      IF v_quiz_id IS NULL THEN
        CONTINUE;
      END IF;

      SELECT title INTO v_quiz_title FROM public.learning_quizzes WHERE id = v_quiz_id;
      v_quiz_title := COALESCE(v_block.content_data ->> 'title', v_block.title, v_quiz_title, 'Knowledge Check');

      v_require_pass := COALESCE(v_block.content_data ->> 'completion_requirement', '') <> 'submitted'
        AND COALESCE((v_block.content_data ->> 'require_passing')::boolean, true);

      -- Best submitted attempt of the current cycle (archived sessions belong
      -- to earlier cycles and never count).
      SELECT * INTO v_session
        FROM public.unified_quiz_sessions
       WHERE user_id = v_user_id
         AND quiz_type = 'learning_quiz'
         AND quiz_entity_id = v_quiz_id
         AND completed_at IS NOT NULL
         AND archived_at IS NULL
       ORDER BY passed DESC NULLS LAST, score_percentage DESC NULLS LAST, completed_at DESC
       LIMIT 1;
      v_found := FOUND;

      IF v_found THEN
        v_block_score := v_session.score_percentage;
        IF v_require_pass AND v_session.passed IS NOT TRUE AND v_block.is_mandatory IS NOT FALSE THEN
          RAISE EXCEPTION 'Quiz "%" has not been passed yet', v_quiz_title;
        END IF;
      ELSE
        -- Legacy results recorded only as quiz-level progress (same cycle).
        SELECT * INTO v_quiz_progress
          FROM public.training_progress
         WHERE user_id = v_user_id
           AND training_id = v_quiz_id
           AND lp_content_type = 'quiz'
           AND status = 'completed'
           AND completed_at >= v_cycle_start;
        IF FOUND THEN
          v_found := true;
          v_block_score := v_quiz_progress.score_percentage;
          IF v_require_pass AND v_quiz_progress.passed IS NOT TRUE AND v_block.is_mandatory IS NOT FALSE THEN
            RAISE EXCEPTION 'Quiz "%" has not been passed yet', v_quiz_title;
          END IF;
        END IF;
      END IF;

      IF NOT v_found AND v_block.is_mandatory IS NOT FALSE THEN
        RAISE EXCEPTION 'Quiz "%" has not been submitted yet', v_quiz_title;
      END IF;

      IF v_block_score IS NOT NULL THEN
        v_score_sum := v_score_sum + v_block_score;
        v_score_n := v_score_n + 1;
        -- The module passing score applies to its mandatory graded quizzes.
        IF v_block.is_mandatory IS NOT FALSE AND v_require_pass THEN
          v_gate_sum := v_gate_sum + v_block_score;
          v_gate_n := v_gate_n + 1;
        END IF;
      END IF;

    -- 2. Assignment / practical blocks (approval is their gate)
    ELSIF v_block.type = 'assignment' OR v_block.type = 'practical'
          OR COALESCE((v_block.content_data ->> 'is_assignment')::boolean, false)
          OR COALESCE((v_block.content_data ->> 'requires_submission')::boolean, false) THEN

      v_require_approval := COALESCE((v_block.content_data ->> 'requires_instructor_approval')::boolean, true);

      SELECT * INTO v_assignment_sub
        FROM public.training_assignment_submissions
       WHERE user_id = v_user_id
         AND training_module_id = p_module_id
         AND block_id = v_block.id::text
         AND is_deleted = false
         AND created_at >= v_cycle_start
       ORDER BY attempt_number DESC, created_at DESC
       LIMIT 1;
      v_found := FOUND;

      IF v_block.is_mandatory IS NOT FALSE THEN
        IF NOT v_found OR v_assignment_sub.status = 'draft' THEN
          RAISE EXCEPTION 'Assignment "%" has not been submitted yet', COALESCE(v_block.title, 'Assignment');
        END IF;

        IF v_require_approval THEN
          IF v_assignment_sub.status IN ('submitted', 'under_review') THEN
            RAISE EXCEPTION 'Assignment "%" is awaiting instructor review', COALESCE(v_block.title, 'Assignment');
          ELSIF v_assignment_sub.status IN ('revision_required', 'rejected') THEN
            RAISE EXCEPTION 'Assignment "%" requires revisions before module completion', COALESCE(v_block.title, 'Assignment');
          ELSIF v_assignment_sub.status <> 'approved' THEN
            RAISE EXCEPTION 'Assignment "%" has not been approved yet', COALESCE(v_block.title, 'Assignment');
          END IF;
        END IF;
      END IF;

      IF v_found AND v_assignment_sub.score IS NOT NULL THEN
        v_score_sum := v_score_sum + v_assignment_sub.score;
        v_score_n := v_score_n + 1;
      END IF;

    -- 3. Standard content blocks
    ELSIF v_block.is_mandatory IS NOT FALSE THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.training_block_progress tbp
         WHERE tbp.user_id = v_user_id
           AND tbp.block_id = v_block.id
           AND tbp.completed_at IS NOT NULL
           AND tbp.completed_at >= v_cycle_start
      ) THEN
        RAISE EXCEPTION 'Required content "%" has not been completed yet', COALESCE(v_block.content_data ->> 'title', v_block.title, 'required content');
      END IF;
    END IF;
  END LOOP;

  v_final_score := CASE WHEN v_score_n > 0 THEN round(v_score_sum / v_score_n) ELSE NULL END;
  v_gate_score := CASE WHEN v_gate_n > 0 THEN round(v_gate_sum / v_gate_n) ELSE NULL END;
  v_passing_score := COALESCE(v_module.passing_score_percentage, 80);

  IF v_gate_score IS NOT NULL AND v_gate_score < v_passing_score THEN
    RAISE EXCEPTION 'Module passing score not met (% of % required) - retake the quizzes to improve your score',
      v_gate_score || '%', v_passing_score || '%';
  END IF;

  v_metadata := COALESCE(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
    'completed_blocks', to_jsonb(COALESCE(p_completed_block_ids, ARRAY[]::uuid[])),
    'active_block_id', p_last_block_id
  );

  PERFORM set_config('app.trusted_progress_write', 'on', true);

  INSERT INTO public.training_progress (
    user_id, training_id, lp_content_type, assignment_id, status,
    progress_percentage, score_percentage, quiz_score, passed, completed_at,
    last_accessed_at, last_activity_at, last_block_id, last_block_index,
    time_spent_seconds, metadata, updated_at
  ) VALUES (
    v_user_id, p_module_id, 'module', p_assignment_id, 'completed',
    100, v_final_score, round(v_final_score)::integer, true, now(),
    now(), now(), p_last_block_id, p_last_block_index,
    p_time_spent_seconds, v_metadata, now()
  )
  ON CONFLICT (user_id, training_id) DO UPDATE SET
    lp_content_type = 'module',
    assignment_id = COALESCE(public.training_progress.assignment_id, EXCLUDED.assignment_id),
    status = 'completed',
    progress_percentage = 100,
    score_percentage = COALESCE(EXCLUDED.score_percentage, public.training_progress.score_percentage),
    quiz_score = COALESCE(EXCLUDED.quiz_score, public.training_progress.quiz_score),
    passed = true,
    completed_at = COALESCE(public.training_progress.completed_at, EXCLUDED.completed_at),
    last_accessed_at = EXCLUDED.last_accessed_at,
    last_activity_at = EXCLUDED.last_activity_at,
    last_block_id = EXCLUDED.last_block_id,
    last_block_index = EXCLUDED.last_block_index,
    time_spent_seconds = GREATEST(COALESCE(public.training_progress.time_spent_seconds, 0), COALESCE(EXCLUDED.time_spent_seconds, 0)),
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_existing;

  PERFORM set_config('app.trusted_progress_write', 'off', true);

  RETURN jsonb_build_object(
    'training_progress_id', v_existing.id,
    'score_percentage', v_existing.score_percentage,
    'passed', v_existing.passed,
    'status', v_existing.status,
    'completed_at', v_existing.completed_at
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Certificates only for a passed completion, carrying the real score and
--    the module's validity period. One ACTIVE certificate per progress row -
--    the old index allowed only one certificate ever, so a recertified learner
--    could never receive a new one.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.ux_certificates_training_progress_id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_certificates_training_progress_id_active
  ON public.certificates (training_progress_id)
  WHERE training_progress_id IS NOT NULL AND status = 'active';

CREATE OR REPLACE FUNCTION public.issue_training_certificate(p_training_progress_id uuid)
RETURNS certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tp record;
  v_module_id uuid;
  v_module_title text;
  v_module_passing_score numeric;
  v_module_validity_days integer;
  v_module_property_id uuid;
  v_module_department_id uuid;
  v_profile record;
  v_cert public.certificates;
  v_cert_number text;
  v_verification_code text;
  v_expiry timestamptz;
BEGIN
  SELECT * INTO v_tp
  FROM public.training_progress
  WHERE id = p_training_progress_id
    AND user_id = auth.uid()
    AND coalesce(is_deleted, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training progress not found';
  END IF;

  IF v_tp.status IS DISTINCT FROM 'completed' OR coalesce(v_tp.passed, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Training not completed or not passed';
  END IF;

  SELECT * INTO v_cert
  FROM public.certificates
  WHERE training_progress_id = p_training_progress_id
    AND certificate_type = 'training'
    AND status = 'active';

  IF FOUND THEN
    RETURN v_cert;
  END IF;

  SELECT id, title, passing_score_percentage, validity_period_days, property_id, department_id
  INTO v_module_id, v_module_title, v_module_passing_score, v_module_validity_days, v_module_property_id, v_module_department_id
  FROM public.training_modules
  WHERE id = v_tp.training_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'This progress record is not tied to a training module';
  END IF;

  SELECT id, full_name, email INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  v_cert_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_verification_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  IF v_module_validity_days IS NOT NULL AND v_module_validity_days > 0 THEN
    v_expiry := coalesce(v_tp.completed_at, now()) + make_interval(days => v_module_validity_days);
  END IF;

  INSERT INTO public.certificates (
    user_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, completion_date, expiry_date,
    score, passing_score, training_module_id, training_progress_id,
    property_id, department_id, status
  ) VALUES (
    auth.uid(), coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    'training', v_cert_number, v_verification_code, coalesce(v_module_title, 'Training Module'),
    coalesce(v_tp.completed_at, now()), v_expiry,
    v_tp.score_percentage, v_module_passing_score, v_module_id, v_tp.id,
    v_module_property_id, v_module_department_id, 'active'
  )
  ON CONFLICT (training_progress_id) WHERE training_progress_id IS NOT NULL AND status = 'active' DO NOTHING
  RETURNING * INTO v_cert;

  IF v_cert.id IS NULL THEN
    SELECT * INTO v_cert FROM public.certificates
    WHERE training_progress_id = p_training_progress_id AND certificate_type = 'training' AND status = 'active';
  END IF;

  RETURN v_cert;
END;
$function$;

CREATE OR REPLACE FUNCTION public.issue_training_certificate_from_training_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_module_title text;
    v_certificate_enabled boolean := false;
    v_passing_score integer := 80;
    v_validity_days integer;
    v_property_id uuid;
    v_department_id uuid;
    v_recipient_name text;
    v_recipient_email text;
BEGIN
    IF COALESCE(NEW.is_deleted, false)
       OR NEW.status <> 'completed'
       OR NEW.completed_at IS NULL
       OR NEW.passed IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    SELECT title, certificate_enabled, COALESCE(passing_score_percentage, 80),
           validity_period_days, property_id, department_id
      INTO v_module_title, v_certificate_enabled, v_passing_score,
           v_validity_days, v_property_id, v_department_id
      FROM public.training_modules
     WHERE id = NEW.training_id;

    IF NOT COALESCE(v_certificate_enabled, false) THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM public.certificates c
         WHERE c.training_progress_id = NEW.id
           AND c.certificate_type = 'training'
           AND c.status = 'active'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(full_name, email, 'Training Participant'), email
      INTO v_recipient_name, v_recipient_email
      FROM public.profiles
     WHERE id = NEW.user_id;

    BEGIN
        INSERT INTO public.certificates (
            user_id, recipient_name, recipient_email, certificate_type,
            certificate_number, verification_code, training_module_id,
            training_progress_id, title, description, completion_date,
            expiry_date, property_id, department_id,
            score, passing_score, status, metadata
        ) VALUES (
            NEW.user_id,
            COALESCE(v_recipient_name, 'Training Participant'),
            v_recipient_email,
            'training',
            public.generate_certificate_number(),
            public.generate_verification_code(),
            NEW.training_id,
            NEW.id,
            v_module_title,
            'Congratulations! You''ve earned a certificate for completing ' || v_module_title || '.',
            NEW.completed_at,
            CASE WHEN v_validity_days > 0 THEN NEW.completed_at + make_interval(days => v_validity_days) END,
            v_property_id,
            v_department_id,
            round(COALESCE(NEW.score_percentage, NEW.quiz_score))::integer,
            v_passing_score,
            'active',
            jsonb_build_object(
                'issued_by', 'training_progress_completion_trigger',
                'source', 'server_side_module_completion',
                'cycle_started_at', NEW.cycle_started_at
            )
        );
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    RETURN NEW;
END;
$function$;

-- Certificates issued by the trigger never received an expiry date, so they
-- could never enter recertification. Backfill from the module's validity period.
UPDATE public.certificates c
   SET expiry_date = c.completion_date + make_interval(days => m.validity_period_days),
       updated_at = now()
  FROM public.training_modules m
 WHERE m.id = c.training_module_id
   AND c.certificate_type = 'training'
   AND c.status = 'active'
   AND c.expiry_date IS NULL
   AND c.completion_date IS NOT NULL
   AND m.validity_period_days > 0;

-- ---------------------------------------------------------------------------
-- 6. Recertification: manual (manager) and automatic (certificate expiry).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._issue_recertification_assignment(
  p_org_id uuid, p_user_id uuid, p_module_id uuid, p_module_title text,
  p_progress_id uuid, p_due_date timestamptz, p_actor uuid, p_message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule_id uuid;
BEGIN
  INSERT INTO public.training_assignment_rules (
    organization_id, target_type, target_id, content_type, content_id, training_module_id,
    due_date, priority, is_active, instructions, created_by, assigned_by, created_at
  ) VALUES (
    p_org_id, 'user', p_user_id::text, 'module', p_module_id, p_module_id,
    p_due_date, 'high', true, p_message, p_actor, p_actor, now()
  ) RETURNING id INTO v_rule_id;

  IF p_progress_id IS NOT NULL THEN
    UPDATE public.training_progress SET assignment_id = v_rule_id, updated_at = now()
     WHERE id = p_progress_id;
  ELSE
    INSERT INTO public.training_progress (user_id, assignment_id, training_id, lp_content_type, status)
    VALUES (p_user_id, v_rule_id, p_module_id, 'module', 'not_started'::training_status)
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, updated_at = now();
  END IF;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, link, entity_type, entity_id)
  VALUES (p_user_id, p_org_id, 'training_recertification', 'Recertification required', p_message,
          '/training/hub/' || p_module_id, 'training_module', p_module_id);

  RETURN v_rule_id;
END;
$function$;

REVOKE ALL ON FUNCTION public._issue_recertification_assignment(uuid, uuid, uuid, text, uuid, timestamptz, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_recertification(p_user_id uuid, p_training_module_id uuid, p_due_date timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_module public.training_modules%ROWTYPE;
  v_progress public.training_progress%ROWTYPE;
  v_history_id uuid;
  v_rule_id uuid;
  v_due timestamptz := COALESCE(p_due_date, now() + interval '14 days');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_module FROM public.training_modules WHERE id = p_training_module_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  IF NOT (public.is_platform_super_admin()
          OR (public.org_visible(v_module.organization_id)
              AND (public.is_tenant_content_editor(v_module.organization_id)
                   OR public.can_manage_learning_assignment(v_module.organization_id, NULL)))) THEN
    RAISE EXCEPTION 'Not authorized to recertify learners for this training';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships om
     WHERE om.user_id = p_user_id AND om.organization_id = v_module.organization_id AND om.is_active
  ) THEN
    RAISE EXCEPTION 'Learner is not an active member of this organization';
  END IF;

  IF v_due <= now() THEN
    RAISE EXCEPTION 'Due date must be in the future';
  END IF;

  SELECT * INTO v_progress FROM public.training_progress
   WHERE user_id = p_user_id AND training_id = p_training_module_id
   FOR UPDATE;

  IF v_progress.id IS NOT NULL AND v_progress.completed_at IS NOT NULL THEN
    v_history_id := public._reset_training_cycle(v_progress.id, 'manual_recertification', v_actor);
  END IF;

  v_rule_id := public._issue_recertification_assignment(
    v_module.organization_id, p_user_id, v_module.id, v_module.title,
    v_progress.id, v_due, v_actor,
    'Recertification required for "' || v_module.title || '". Please complete it by '
      || to_char(v_due, 'YYYY-MM-DD') || '.');

  RETURN jsonb_build_object(
    'assignment_id', v_rule_id,
    'history_id', v_history_id,
    'due_date', v_due
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.start_recertification(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_recertification(uuid, uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_certificate_expirations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_cert record;
    v_progress_id uuid;
    v_processed integer := 0;
BEGIN
    FOR v_cert IN
        SELECT c.id, c.user_id, c.title, c.training_module_id, c.training_progress_id,
               COALESCE(m.organization_id, c.organization_id) AS organization_id,
               (m.id IS NOT NULL AND m.status = 'published' AND m.is_deleted = false) AS module_live
          FROM public.certificates c
          LEFT JOIN public.training_modules m ON m.id = c.training_module_id
         WHERE c.status = 'active'
           AND c.expiry_date IS NOT NULL
           AND c.expiry_date <= now()
    LOOP
        BEGIN
            UPDATE public.certificates SET status = 'expired', updated_at = now() WHERE id = v_cert.id;

            INSERT INTO public.certificate_history (certificate_id, organization_id, action, details)
            VALUES (v_cert.id, v_cert.organization_id, 'updated',
                    jsonb_build_object('reason', 'expired', 'processed_at', now()));

            IF v_cert.module_live AND v_cert.organization_id IS NOT NULL THEN
                SELECT tp.id INTO v_progress_id
                  FROM public.training_progress tp
                 WHERE tp.user_id = v_cert.user_id AND tp.training_id = v_cert.training_module_id;

                IF v_progress_id IS NOT NULL THEN
                    PERFORM public._reset_training_cycle(v_progress_id, 'certificate_expired', NULL);
                END IF;

                PERFORM public._issue_recertification_assignment(
                    v_cert.organization_id, v_cert.user_id, v_cert.training_module_id, v_cert.title,
                    v_progress_id, now() + interval '30 days', NULL,
                    'Your certificate for "' || v_cert.title || '" has expired. Please retake the training within 30 days.');
            ELSE
                INSERT INTO public.notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
                VALUES (v_cert.user_id, v_cert.organization_id, 'training_recertification', 'Certification expired',
                        'Your certificate for "' || v_cert.title || '" has expired.', 'certificate', v_cert.id);
            END IF;

            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            -- One bad row must not stop the nightly batch.
            RAISE WARNING 'process_certificate_expirations: certificate % failed: %', v_cert.id, SQLERRM;
        END;
    END LOOP;

    RETURN v_processed;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_certificate_expirations() FROM PUBLIC, anon, authenticated;
