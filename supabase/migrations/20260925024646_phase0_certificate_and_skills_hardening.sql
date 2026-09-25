-- Phase 0 security hotfix (rebuild audit 2026-09-25).
--
-- 1. Certificates were client-writable by any tenant content editor
--    (author, instructor, department_manager ...) with no completion check,
--    so compliance evidence could be forged, including for oneself. At the
--    same time learner-side quiz and learning-path certificates were silently
--    rejected by RLS while the UI reported success.
--    -> Direct INSERT/UPDATE is removed. Every certificate is issued by a
--       SECURITY DEFINER command function that re-checks the business rule:
--         issue_training_certificate  (existing: own completed + passed progress)
--         issue_quiz_certificate      (new: own passed quiz session)
--         issue_path_certificate      (new: all required path courses passed)
--         issue_manual_certificate    (new: admin / training manager, never self)
--
-- 2. skills had no organization_id but was writable by any tenant's author or
--    training manager through org-blind role helpers -> cross-tenant tampering.
--    -> organization_id added (NULL = platform library, read-only to tenants),
--       org-scoped policies, per-org unique names.
--
-- 3. FOR ALL policies without WITH CHECK on document_bookmarks,
--    document_favorites and failed_login_attempts get explicit WITH CHECK.
--
-- Error contract: each rule violation raises with a stable code in HINT
-- (e.g. CERT_SELF_ISSUE) that the frontend maps to a localized message.

-- ---------------------------------------------------------------------------
-- 1. Certificates
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS certificates_ins ON public.certificates;
DROP POLICY IF EXISTS certificates_upd ON public.certificates;
REVOKE INSERT, UPDATE ON public.certificates FROM anon, authenticated;

-- Who may issue certificates by hand for an organization.
CREATE OR REPLACE FUNCTION public.can_issue_certificates(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_org_id IS NOT NULL AND (
    public.platform_operator_has_role('system_owner')
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = p_org_id
        AND m.is_active
        AND m.role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin', 'training_manager')
        AND public.org_is_operational(m.organization_id)
    )
  );
$$;

-- Learner: certificate for a passed standalone quiz.
CREATE OR REPLACE FUNCTION public.issue_quiz_certificate(p_quiz_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_session record;
  v_profile record;
  v_cert public.certificates;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501', HINT = 'AUTH_REQUIRED';
  END IF;

  SELECT id, title, passing_score_percentage, organization_id
    INTO v_quiz
    FROM public.learning_quizzes
   WHERE id = p_quiz_id AND coalesce(is_deleted, false) = false;

  IF NOT FOUND OR NOT public.org_visible(v_quiz.organization_id) THEN
    RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002', HINT = 'CERT_QUIZ_NOT_FOUND';
  END IF;

  SELECT id, score_percentage, completed_at
    INTO v_session
    FROM public.unified_quiz_sessions
   WHERE user_id = v_uid
     AND quiz_entity_id = p_quiz_id
     AND passed IS TRUE
     AND completed_at IS NOT NULL
     AND archived_at IS NULL
   ORDER BY completed_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No passed attempt for this quiz' USING ERRCODE = 'P0001', HINT = 'CERT_NOT_PASSED';
  END IF;

  -- Idempotent: one active quiz certificate per learner and quiz.
  SELECT * INTO v_cert
    FROM public.certificates
   WHERE user_id = v_uid
     AND certificate_type = 'sop_quiz'
     AND status = 'active'
     AND metadata ->> 'quiz_id' = p_quiz_id::text
   LIMIT 1;
  IF FOUND THEN
    RETURN v_cert;
  END IF;

  SELECT full_name, email INTO v_profile FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.certificates (
    user_id, organization_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, description, completion_date,
    score, passing_score, status, metadata
  ) VALUES (
    v_uid, v_quiz.organization_id,
    coalesce(v_profile.full_name, v_profile.email, 'Quiz Participant'), v_profile.email,
    'sop_quiz', public.generate_certificate_number(), public.generate_verification_code(),
    v_quiz.title,
    'Successfully completed ' || v_quiz.title || ' with a score of ' || round(coalesce(v_session.score_percentage, 0)) || '%.',
    v_session.completed_at, v_session.score_percentage, v_quiz.passing_score_percentage, 'active',
    jsonb_build_object('quiz_id', p_quiz_id, 'quiz_session_id', v_session.id, 'source', 'server_quiz_completion')
  )
  RETURNING * INTO v_cert;

  RETURN v_cert;
END;
$$;

-- Learner: certificate for a completed learning path.
CREATE OR REPLACE FUNCTION public.issue_path_certificate(p_path_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_path record;
  v_required uuid[];
  v_missing int;
  v_score numeric;
  v_profile record;
  v_cert public.certificates;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501', HINT = 'AUTH_REQUIRED';
  END IF;

  SELECT id, title, description, organization_id, certificate_enabled
    INTO v_path
    FROM public.training_paths
   WHERE id = p_path_id AND coalesce(is_active, true);

  IF NOT FOUND OR NOT public.org_visible(v_path.organization_id) THEN
    RAISE EXCEPTION 'Learning path not found' USING ERRCODE = 'P0002', HINT = 'CERT_PATH_NOT_FOUND';
  END IF;

  IF v_path.certificate_enabled IS FALSE THEN
    RAISE EXCEPTION 'This learning path does not award a certificate' USING ERRCODE = 'P0001', HINT = 'CERT_PATH_DISABLED';
  END IF;

  -- Required = mandatory courses; if none are flagged mandatory, all courses.
  SELECT coalesce(
           array_agg(module_id) FILTER (WHERE is_mandatory IS DISTINCT FROM false),
           array_agg(module_id))
    INTO v_required
    FROM public.training_path_modules
   WHERE path_id = p_path_id AND module_id IS NOT NULL;

  IF v_required IS NULL OR cardinality(v_required) = 0 THEN
    RAISE EXCEPTION 'Learning path has no courses' USING ERRCODE = 'P0001', HINT = 'CERT_PATH_EMPTY';
  END IF;

  SELECT count(*) INTO v_missing
    FROM unnest(v_required) AS r(module_id)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.training_progress tp
      WHERE tp.user_id = v_uid
        AND tp.training_id = r.module_id
        AND tp.status = 'completed'
        AND tp.passed IS TRUE
        AND coalesce(tp.is_deleted, false) = false
   );

  IF v_missing > 0 THEN
    RAISE EXCEPTION '% required course(s) not yet passed', v_missing USING ERRCODE = 'P0001', HINT = 'CERT_PATH_INCOMPLETE';
  END IF;

  SELECT * INTO v_cert
    FROM public.certificates
   WHERE user_id = v_uid
     AND certificate_type = 'achievement'
     AND status = 'active'
     AND metadata ->> 'training_path_id' = p_path_id::text
   LIMIT 1;
  IF FOUND THEN
    RETURN v_cert;
  END IF;

  SELECT round(avg(best.score)) INTO v_score
    FROM (
      SELECT max(coalesce(tp.score_percentage, tp.quiz_score)) AS score
        FROM public.training_progress tp
       WHERE tp.user_id = v_uid AND tp.training_id = ANY (v_required)
         AND tp.passed IS TRUE AND coalesce(tp.is_deleted, false) = false
       GROUP BY tp.training_id
    ) best;

  SELECT full_name, email INTO v_profile FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.certificates (
    user_id, organization_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, description, completion_date,
    score, status, metadata
  ) VALUES (
    v_uid, v_path.organization_id,
    coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    'achievement', public.generate_certificate_number(), public.generate_verification_code(),
    v_path.title, coalesce(v_path.description, 'Completed learning path: ' || v_path.title),
    now(), v_score, 'active',
    jsonb_build_object('training_path_id', p_path_id, 'training_path_title', v_path.title,
                       'required_module_ids', to_jsonb(v_required), 'source', 'server_path_completion')
  )
  RETURNING * INTO v_cert;

  UPDATE public.user_path_enrollments
     SET completed_at = coalesce(completed_at, now())
   WHERE user_id = v_uid AND path_id = p_path_id;

  RETURN v_cert;
END;
$$;

-- Admin / training manager: certificate issued by hand (e.g. classroom
-- training, external course). Never for oneself; always attributed.
CREATE OR REPLACE FUNCTION public.issue_manual_certificate(
  p_organization_id uuid,
  p_user_id uuid,
  p_certificate_type text,
  p_title text,
  p_completion_date timestamptz,
  p_description text DEFAULT NULL,
  p_training_module_id uuid DEFAULT NULL,
  p_expiry_date timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_module record;
  v_profile record;
  v_cert public.certificates;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501', HINT = 'AUTH_REQUIRED';
  END IF;

  IF NOT public.can_issue_certificates(p_organization_id) THEN
    RAISE EXCEPTION 'You are not allowed to issue certificates for this organization'
      USING ERRCODE = '42501', HINT = 'CERT_NOT_ALLOWED';
  END IF;

  IF p_user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot issue a certificate to yourself'
      USING ERRCODE = '42501', HINT = 'CERT_SELF_ISSUE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
     WHERE user_id = p_user_id AND organization_id = p_organization_id AND is_active
  ) THEN
    RAISE EXCEPTION 'The recipient is not an active member of this organization'
      USING ERRCODE = 'P0001', HINT = 'CERT_RECIPIENT_NOT_MEMBER';
  END IF;

  IF p_certificate_type NOT IN ('training', 'sop_quiz', 'compliance', 'achievement') THEN
    RAISE EXCEPTION 'Unknown certificate type' USING ERRCODE = '22023', HINT = 'CERT_INVALID_TYPE';
  END IF;

  IF v_title = '' OR length(v_title) > 200 THEN
    RAISE EXCEPTION 'Title is required (max 200 characters)' USING ERRCODE = '22023', HINT = 'CERT_INVALID_TITLE';
  END IF;

  IF p_completion_date IS NULL OR p_completion_date > now() + interval '1 day' THEN
    RAISE EXCEPTION 'Completion date cannot be in the future' USING ERRCODE = '22023', HINT = 'CERT_INVALID_DATE';
  END IF;

  IF p_expiry_date IS NOT NULL AND p_expiry_date <= p_completion_date THEN
    RAISE EXCEPTION 'Expiry date must be after the completion date' USING ERRCODE = '22023', HINT = 'CERT_INVALID_DATE';
  END IF;

  IF p_certificate_type = 'training' THEN
    SELECT id, organization_id, passing_score_percentage, validity_period_days
      INTO v_module
      FROM public.training_modules
     WHERE id = p_training_module_id;
    IF NOT FOUND OR v_module.organization_id IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Select a course from this organization' USING ERRCODE = 'P0001', HINT = 'CERT_INVALID_COURSE';
    END IF;
  END IF;

  SELECT full_name, email INTO v_profile FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.certificates (
    user_id, organization_id, recipient_name, recipient_email, certificate_type,
    certificate_number, verification_code, title, description, completion_date,
    expiry_date, passing_score, training_module_id, issued_by, status, metadata
  ) VALUES (
    p_user_id, p_organization_id,
    coalesce(v_profile.full_name, v_profile.email, 'Training Participant'), v_profile.email,
    p_certificate_type, public.generate_certificate_number(), public.generate_verification_code(),
    v_title, p_description, p_completion_date,
    coalesce(p_expiry_date,
             CASE WHEN v_module.validity_period_days > 0
                  THEN p_completion_date + make_interval(days => v_module.validity_period_days) END),
    v_module.passing_score_percentage,
    CASE WHEN p_certificate_type = 'training' THEN p_training_module_id END,
    v_uid, 'active',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'manual', 'issued_by', v_uid)
  )
  RETURNING * INTO v_cert;

  PERFORM public.emit_platform_event(
    'certificate.issued_manually', p_organization_id, 'certificate', v_cert.id::text,
    jsonb_build_object('recipient_id', p_user_id, 'certificate_type', p_certificate_type, 'issued_by', v_uid)
  );

  RETURN v_cert;
END;
$$;

REVOKE ALL ON FUNCTION public.can_issue_certificates(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_quiz_certificate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_path_certificate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_manual_certificate(uuid, uuid, text, text, timestamptz, text, uuid, timestamptz, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_issue_certificates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_quiz_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_path_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_manual_certificate(uuid, uuid, text, text, timestamptz, text, uuid, timestamptz, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Skills: tenant-scoped, platform library read-only
-- ---------------------------------------------------------------------------

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_skills_organization_id ON public.skills (organization_id);

ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_skills_org_name
  ON public.skills (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Tenant users always create skills inside their organization; only platform
-- operators may create platform-library rows (organization_id NULL).
CREATE OR REPLACE FUNCTION public.tg_skills_fill_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NOT public.is_platform_operator() THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'organization_id is required for skills' USING ERRCODE = '23502';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skills_fill_organization ON public.skills;
CREATE TRIGGER trg_skills_fill_organization
  BEFORE INSERT ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.tg_skills_fill_organization();

DROP POLICY IF EXISTS p5_skills_select ON public.skills;
DROP POLICY IF EXISTS p5_skills_insert ON public.skills;
DROP POLICY IF EXISTS p5_skills_update ON public.skills;
DROP POLICY IF EXISTS p5_skills_delete ON public.skills;

CREATE POLICY skills_select ON public.skills FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.org_visible(organization_id));

CREATE POLICY skills_insert ON public.skills FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
    OR (organization_id IS NULL AND public.platform_operator_can('master_content.manage'))
  );

CREATE POLICY skills_update ON public.skills FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
    OR (organization_id IS NULL AND public.platform_operator_can('master_content.manage'))
  )
  WITH CHECK (
    (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
    OR (organization_id IS NULL AND public.platform_operator_can('master_content.manage'))
  );

CREATE POLICY skills_delete ON public.skills FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
    OR (organization_id IS NULL AND public.platform_operator_can('master_content.manage'))
  );

-- ---------------------------------------------------------------------------
-- 3. FOR ALL policies get an explicit WITH CHECK
-- ---------------------------------------------------------------------------

ALTER POLICY users_own_bookmarks ON public.document_bookmarks
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can manage their own favorites" ON public.document_favorites
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY failed_login_admin_all ON public.failed_login_attempts
  WITH CHECK (public.is_platform_super_admin());
