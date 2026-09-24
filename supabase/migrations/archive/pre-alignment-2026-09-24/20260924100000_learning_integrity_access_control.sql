-- Learning integrity: close the paths that let a learner certify themselves.
--
-- complete_training_module (SECURITY DEFINER) decides completion from rows in
-- unified_quiz_sessions, training_assignment_submissions and learning_assignments,
-- but learners could write those rows directly through PostgREST:
--   * insert a unified_quiz_sessions row with passed = true           -> quiz "passed"
--   * update their own submission to status = 'approved'              -> practical "approved"
--   * edit/delete their own mandatory learning_assignments row        -> compliance "done"
-- Learners could also read every answer key (unified_questions.correct_answer,
-- unified_question_options.is_correct) and use grade_question_attempt as an oracle.
--
-- After this migration learners interact with assessments only through the
-- SECURITY DEFINER RPCs, which grade on the server and enforce tenant scope.

-- ---------------------------------------------------------------------------
-- 1. Quiz sessions and question attempts are written only by server RPCs
--    (submit_quiz_attempt, grade_question_attempt). No client code writes them.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS unified_quiz_sessions_insert ON public.unified_quiz_sessions;
DROP POLICY IF EXISTS unified_quiz_sessions_update ON public.unified_quiz_sessions;
DROP POLICY IF EXISTS unified_question_attempts_insert ON public.unified_question_attempts;

REVOKE INSERT, UPDATE, DELETE ON public.unified_quiz_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.unified_question_attempts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Practical-assignment submissions: learners write content, reviewers grade.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_training_assignment_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_reviewer boolean;
BEGIN
  -- Service-role / scheduled jobs carry no end-user identity.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new submission always starts un-reviewed, whoever creates it.
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'submitted') THEN
      NEW.status := 'submitted';
    END IF;
    NEW.score := NULL;
    NEW.passed := NULL;
    NEW.instructor_feedback := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.training_module_id IS DISTINCT FROM OLD.training_module_id
     OR NEW.block_id IS DISTINCT FROM OLD.block_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.attempt_number IS DISTINCT FROM OLD.attempt_number THEN
    RAISE EXCEPTION 'Submission identity fields cannot be changed';
  END IF;

  -- Nobody reviews their own work, whatever their role.
  v_is_reviewer := OLD.user_id <> v_uid
    AND public.org_visible(OLD.organization_id)
    AND public.is_tenant_content_editor(OLD.organization_id);

  IF v_is_reviewer THEN
    -- Reviewers grade; they cannot rewrite the learner's work.
    NEW.submission_content := OLD.submission_content;
    NEW.attachment_urls := OLD.attachment_urls;
    NEW.submitted_at := OLD.submitted_at;
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.passed IS DISTINCT FROM OLD.passed
       OR NEW.instructor_feedback IS DISTINCT FROM OLD.instructor_feedback THEN
      NEW.reviewed_by := v_uid;
      NEW.reviewed_at := now();
    ELSE
      NEW.reviewed_by := OLD.reviewed_by;
      NEW.reviewed_at := OLD.reviewed_at;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not allowed to modify this submission';
  END IF;

  -- Learner (owner) path.
  IF OLD.status NOT IN ('draft', 'submitted', 'under_review') THEN
    RAISE EXCEPTION 'This submission has already been reviewed; start a new attempt instead';
  END IF;
  IF NEW.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Learners can only save a draft or submit for review';
  END IF;

  NEW.score := OLD.score;
  NEW.passed := OLD.passed;
  NEW.instructor_feedback := OLD.instructor_feedback;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.is_deleted := OLD.is_deleted;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_training_assignment_submission() FROM PUBLIC, anon, authenticated;

-- Named after trg_fill_organization_id so organization_id is already filled.
DROP TRIGGER IF EXISTS trg_guard_training_assignment_submission ON public.training_assignment_submissions;
CREATE TRIGGER trg_guard_training_assignment_submission
  BEFORE INSERT OR UPDATE ON public.training_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_training_assignment_submission();

DROP POLICY IF EXISTS training_assignment_submissions_upd ON public.training_assignment_submissions;
CREATE POLICY training_assignment_submissions_upd ON public.training_assignment_submissions
  FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id)))
  WITH CHECK ((user_id = (SELECT auth.uid())) OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id)));

-- ---------------------------------------------------------------------------
-- 3. learning_assignments are issued by managers; learners only read theirs.
--    (The learner app never writes this table.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS learning_assignments_manage_insert ON public.learning_assignments;
DROP POLICY IF EXISTS learning_assignments_manage_update ON public.learning_assignments;
DROP POLICY IF EXISTS learning_assignments_manage_delete ON public.learning_assignments;

CREATE OR REPLACE FUNCTION public.can_manage_learning_assignment(p_org_id uuid, p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_operator(auth.uid())
    OR (p_org_id = ANY (public.current_user_organization_ids())
        AND public.org_is_operational(p_org_id)
        AND (public.is_tenant_admin(p_org_id)
             OR EXISTS (
               SELECT 1 FROM public.organization_memberships om
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = p_org_id
                  AND om.is_active
                  AND om.role IN ('organization_owner', 'organization_admin', 'hotel_admin',
                                  'department_manager', 'training_manager')
                  AND (om.hotel_id IS NULL OR om.hotel_id = p_hotel_id))));
$function$;

REVOKE ALL ON FUNCTION public.can_manage_learning_assignment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_learning_assignment(uuid, uuid) TO authenticated;

CREATE POLICY learning_assignments_manage_insert ON public.learning_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_learning_assignment(organization_id, hotel_id));
CREATE POLICY learning_assignments_manage_update ON public.learning_assignments
  FOR UPDATE TO authenticated
  USING (public.can_manage_learning_assignment(organization_id, hotel_id))
  WITH CHECK (public.can_manage_learning_assignment(organization_id, hotel_id));
CREATE POLICY learning_assignments_manage_delete ON public.learning_assignments
  FOR DELETE TO authenticated
  USING (public.can_manage_learning_assignment(organization_id, hotel_id));

-- ---------------------------------------------------------------------------
-- 4. Answer keys: only authors/editors read question rows directly. Learners
--    get questions through get_quiz_for_player / get_questions_for_attempt,
--    which never include is_correct / correct_answer / explanation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_author_question(p_org_id uuid, p_created_by uuid, p_is_master boolean)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_super_admin()
    OR p_created_by = auth.uid()
    OR (p_org_id IS NOT NULL AND public.org_visible(p_org_id) AND public.is_tenant_content_editor(p_org_id))
    OR (COALESCE(p_is_master, false) AND EXISTS (
          SELECT 1 FROM public.organization_memberships m
           WHERE m.user_id = auth.uid()
             AND m.is_active
             AND m.role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin',
                            'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
             AND public.org_is_operational(m.organization_id)));
$function$;

REVOKE ALL ON FUNCTION public.can_author_question(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_author_question(uuid, uuid, boolean) TO authenticated;

-- Can the caller take (answer) this question as a learner?
CREATE OR REPLACE FUNCTION public._question_visible_to_learner(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.unified_questions q
     WHERE q.id = p_question_id
       AND q.status = 'published'
       AND (COALESCE(q.is_master_template, false) OR public.org_visible(q.organization_id)));
$function$;

-- Is the question part of a live quiz that withholds per-question feedback?
CREATE OR REPLACE FUNCTION public._question_in_graded_quiz(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.unified_quiz_questions uqq
      JOIN public.learning_quizzes lq ON lq.id = uqq.quiz_id
     WHERE uqq.question_id = p_question_id
       AND NOT COALESCE(lq.is_deleted, false)
       AND lq.show_feedback_during IS FALSE);
$function$;

REVOKE ALL ON FUNCTION public._question_visible_to_learner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._question_in_graded_quiz(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS multitenant_unified_questions_select ON public.unified_questions;
CREATE POLICY multitenant_unified_questions_select ON public.unified_questions
  FOR SELECT TO authenticated
  USING (public.can_author_question(organization_id, created_by, is_master_template));

DROP POLICY IF EXISTS p5_unified_question_options_select ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_select ON public.unified_question_options
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.unified_questions q
     WHERE q.id = unified_question_options.question_id
       AND public.can_author_question(q.organization_id, q.created_by, q.is_master_template)));

-- ---------------------------------------------------------------------------
-- 5. Learner-facing assessment RPCs: tenant scope + no answer oracle.
-- ---------------------------------------------------------------------------

-- When a learner is sent back through a module (recertification), earlier quiz
-- sessions are archived, not deleted: archived sessions stop counting toward
-- attempt limits and completion (see 20260924101000_training_completion_cycles).
ALTER TABLE public.unified_quiz_sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Daily challenge draws only from standalone practice questions the caller can
-- see (quiz questions are excluded so practice can't leak graded answers).
CREATE OR REPLACE FUNCTION public.get_daily_challenge_question_ids(p_count integer DEFAULT 3)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    WITH my_attempts AS (
        SELECT
            question_id,
            bool_or(is_correct) AS ever_correct,
            max(created_at) AS last_attempt_at
        FROM public.unified_question_attempts
        WHERE user_id = auth.uid()
        GROUP BY question_id
    )
    SELECT q.id
    FROM public.unified_questions q
    LEFT JOIN my_attempts a ON a.question_id = q.id
    WHERE auth.uid() IS NOT NULL
      AND q.status = 'published'
      AND q.question_type NOT IN ('ordering', 'matching')
      AND (COALESCE(q.is_master_template, false) OR public.org_visible(q.organization_id))
      AND NOT EXISTS (
          SELECT 1 FROM public.unified_quiz_questions uqq
            JOIN public.learning_quizzes lq ON lq.id = uqq.quiz_id
           WHERE uqq.question_id = q.id AND NOT COALESCE(lq.is_deleted, false))
    ORDER BY
        CASE
            WHEN a.question_id IS NULL THEN 0
            WHEN a.ever_correct IS NOT TRUE THEN 1
            WHEN a.last_attempt_at < now() - interval '14 days' THEN 2
            ELSE 3
        END,
        md5(q.id::text || COALESCE(auth.uid()::text, '') || to_char(now(), 'YYYY-MM-DD')),
        q.id
    LIMIT LEAST(GREATEST(COALESCE(p_count, 3), 1), 20);
$function$;

CREATE OR REPLACE FUNCTION public.get_questions_for_attempt(p_question_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'question_text_ar', q.question_text_ar,
      'question_type', q.question_type,
      'difficulty', q.difficulty,
      'points', q.points,
      'estimated_time_seconds', q.estimated_time_seconds,
      'tags', q.tags,
      'hint', q.hint,
      'hint_ar', q.hint_ar,
      'linked_sop_id', q.linked_sop_id,
      'linked_sop', (
        SELECT jsonb_build_object('id', d.id, 'title', d.title)
        FROM public.documents d
        WHERE d.id = q.linked_sop_id
      ),
      'options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'option_text', o.option_text,
            'option_text_ar', o.option_text_ar,
            'display_order', o.display_order
          ) ORDER BY o.display_order
        )
        FROM public.unified_question_options o
        WHERE o.question_id = q.id
      )
    )
  ) INTO v_result
  FROM public.unified_questions q
  WHERE q.id = ANY(p_question_ids)
    AND q.status = 'published'
    AND (COALESCE(q.is_master_template, false) OR public.org_visible(q.organization_id));

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- Per-question grading reveals the answer key, so it is only allowed where the
-- content is formative: never for questions in a quiz that withholds feedback.
CREATE OR REPLACE FUNCTION public.grade_question_attempt(p_question_id uuid, p_selected_answer text, p_selected_options uuid[] DEFAULT NULL::uuid[], p_session_id uuid DEFAULT NULL::uuid, p_context_type text DEFAULT NULL::text, p_context_entity_id uuid DEFAULT NULL::uuid, p_time_spent_seconds integer DEFAULT NULL::integer, p_hint_used boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_is_correct boolean;
  v_attempt_number integer;
  v_explanation text;
  v_explanation_ar text;
  v_correct_answer text;
  v_options jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public._question_visible_to_learner(p_question_id) THEN
    RAISE EXCEPTION 'Question not found or not published';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.unified_questions WHERE id = p_question_id;

  IF public._question_in_graded_quiz(p_question_id)
     AND NOT (v_org_id IS NOT NULL AND public.is_tenant_content_editor(v_org_id))
     AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'This question belongs to a graded quiz - submit the quiz to see your results';
  END IF;

  -- Per-question checks are never attached to a quiz session: sessions are
  -- created and graded only by submit_quiz_attempt (p_session_id is ignored).
  v_is_correct := public._grade_question_answer(p_question_id, p_selected_answer, p_selected_options);

  SELECT count(*) + 1 INTO v_attempt_number
    FROM public.unified_question_attempts
   WHERE user_id = v_user_id AND question_id = p_question_id;

  INSERT INTO public.unified_question_attempts (
    user_id, question_id, session_id, selected_answer, selected_options,
    is_correct, context_type, context_entity_id, time_spent_seconds,
    attempt_number, hint_used
  ) VALUES (
    v_user_id, p_question_id, NULL, p_selected_answer, p_selected_options,
    v_is_correct, p_context_type, p_context_entity_id, p_time_spent_seconds,
    v_attempt_number, COALESCE(p_hint_used, false)
  );

  SELECT explanation, explanation_ar, correct_answer
    INTO v_explanation, v_explanation_ar, v_correct_answer
    FROM public.unified_questions WHERE id = p_question_id;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'option_text', option_text, 'is_correct', is_correct,
    'display_order', display_order, 'feedback', feedback
  ) ORDER BY display_order)
    INTO v_options
    FROM public.unified_question_options WHERE question_id = p_question_id;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'attempt_number', v_attempt_number,
    'explanation', v_explanation,
    'explanation_ar', v_explanation_ar,
    'correct_answer', v_correct_answer,
    'options', COALESCE(v_options, '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_quiz_for_player(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz public.learning_quizzes%ROWTYPE;
  v_questions jsonb;
  v_is_editor boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_quiz FROM public.learning_quizzes WHERE id = p_quiz_id AND is_deleted = false;
  IF NOT FOUND OR NOT (public.org_visible(v_quiz.organization_id) OR public.is_platform_super_admin()) THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_is_editor := public.is_platform_super_admin()
    OR (v_quiz.organization_id IS NOT NULL AND public.is_tenant_content_editor(v_quiz.organization_id));

  IF v_quiz.status <> 'published' AND v_quiz.created_by IS DISTINCT FROM auth.uid() AND NOT v_is_editor THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id', uq.question_id,
      'display_order', uq.display_order,
      'points_override', uq.points_override,
      'question', jsonb_build_object(
        'id', q.id,
        'question_text', q.question_text,
        'question_text_ar', q.question_text_ar,
        'question_type', q.question_type,
        'points', q.points,
        'hint', q.hint,
        'hint_ar', q.hint_ar,
        'options', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'option_text', o.option_text,
              'option_text_ar', o.option_text_ar,
              'display_order', o.display_order
            ) ORDER BY o.display_order
          )
          FROM public.unified_question_options o
          WHERE o.question_id = q.id
        )
      )
    )
  ) INTO v_questions
  FROM public.unified_quiz_questions uq
  JOIN public.unified_questions q ON q.id = uq.question_id AND q.status = 'published'
  WHERE uq.quiz_id = p_quiz_id;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'time_limit_minutes', v_quiz.time_limit_minutes,
    'passing_score_percentage', v_quiz.passing_score_percentage,
    'max_attempts', v_quiz.max_attempts,
    'randomize_questions', v_quiz.randomize_questions,
    'randomize_answers', v_quiz.randomize_answers,
    'show_feedback_during', v_quiz.show_feedback_during,
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$function$;

-- submit_quiz_attempt: tenant scope, membership-based editor check, and
-- "first answer locks in": if the learner already had a question graded with
-- immediate feedback during this attempt, that first result counts - resending
-- the revealed correct answer on submit does not.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb, p_context_type text DEFAULT 'quiz'::text, p_context_entity_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_time_spent_seconds integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_quiz public.learning_quizzes%ROWTYPE;
  v_is_editor boolean;
  v_attempt_count integer;
  v_attempt_window_start timestamptz;
  v_session_id uuid;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_options uuid[];
  v_is_correct boolean;
  v_locked boolean;
  v_attempt_number integer;
  v_correct_count integer := 0;
  v_total_count integer := 0;
  v_score numeric;
  v_passed boolean;
  v_results jsonb := '[]'::jsonb;
  v_existing public.training_progress%ROWTYPE;
  v_final_score numeric;
  v_final_passed boolean;
  v_metadata jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_quiz FROM public.learning_quizzes WHERE id = p_quiz_id AND is_deleted = false;
  IF NOT FOUND OR NOT (public.org_visible(v_quiz.organization_id) OR public.is_platform_super_admin()) THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_is_editor := public.is_platform_super_admin()
    OR (v_quiz.organization_id IS NOT NULL AND public.is_tenant_content_editor(v_quiz.organization_id));

  IF v_quiz.status <> 'published' AND v_quiz.created_by IS DISTINCT FROM v_user_id AND NOT v_is_editor THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  SELECT count(*) INTO v_attempt_count
    FROM public.unified_quiz_sessions
   WHERE user_id = v_user_id AND quiz_type = 'learning_quiz' AND quiz_entity_id = p_quiz_id
     AND completed_at IS NOT NULL
     AND archived_at IS NULL
     AND (p_context_entity_id IS NULL OR context_entity_id IS NOT DISTINCT FROM p_context_entity_id);

  -- Per-question feedback given since the last submission of this quiz locks in.
  SELECT max(completed_at) INTO v_attempt_window_start
    FROM public.unified_quiz_sessions
   WHERE user_id = v_user_id AND quiz_type = 'learning_quiz' AND quiz_entity_id = p_quiz_id;

  IF v_quiz.max_attempts IS NOT NULL AND v_attempt_count >= v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Maximum attempts reached for this quiz';
  END IF;

  INSERT INTO public.unified_quiz_sessions (
    user_id, quiz_type, quiz_entity_id, started_at, time_limit_seconds, passing_score,
    context_type, context_entity_id
  ) VALUES (
    v_user_id, 'learning_quiz', p_quiz_id,
    now() - make_interval(secs => GREATEST(COALESCE(p_time_spent_seconds, 0), 0)),
    CASE WHEN v_quiz.time_limit_minutes IS NOT NULL THEN v_quiz.time_limit_minutes * 60 ELSE NULL END,
    v_quiz.passing_score_percentage,
    p_context_type, p_context_entity_id
  ) RETURNING id INTO v_session_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb))
  LOOP
    v_question_id := public._safe_uuid(v_answer ->> 'question_id');

    IF v_question_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.unified_quiz_questions
       WHERE quiz_id = p_quiz_id AND question_id = v_question_id
    ) THEN
      CONTINUE;
    END IF;

    -- Each question counts once per submission.
    IF v_results @> jsonb_build_array(jsonb_build_object('question_id', v_question_id)) THEN
      CONTINUE;
    END IF;

    BEGIN
      SELECT array_agg(public._safe_uuid(x)) INTO v_selected_options
        FROM jsonb_array_elements_text(COALESCE(v_answer -> 'selected_options', '[]'::jsonb)) AS x;
    EXCEPTION WHEN others THEN
      v_selected_options := NULL;
    END;

    v_is_correct := public._grade_question_answer(
      v_question_id,
      v_answer ->> 'selected_answer',
      v_selected_options
    );

    SELECT a.is_correct INTO v_locked
      FROM public.unified_question_attempts a
     WHERE a.user_id = v_user_id
       AND a.question_id = v_question_id
       AND a.session_id IS NULL
       AND a.created_at > COALESCE(v_attempt_window_start, '-infinity'::timestamptz)
     ORDER BY a.created_at ASC
     LIMIT 1;
    IF FOUND THEN
      v_is_correct := COALESCE(v_locked, false);
    END IF;

    SELECT count(*) + 1 INTO v_attempt_number
      FROM public.unified_question_attempts
     WHERE user_id = v_user_id AND question_id = v_question_id;

    INSERT INTO public.unified_question_attempts (
      user_id, question_id, session_id, selected_answer, selected_options,
      is_correct, context_type, context_entity_id, time_spent_seconds,
      attempt_number, hint_used
    ) VALUES (
      v_user_id, v_question_id, v_session_id,
      v_answer ->> 'selected_answer', v_selected_options,
      v_is_correct, p_context_type, p_context_entity_id,
      NULLIF(v_answer ->> 'time_spent_seconds', '')::integer,
      v_attempt_number,
      COALESCE((v_answer ->> 'hint_used')::boolean, false)
    );

    v_total_count := v_total_count + 1;
    IF v_is_correct THEN
      v_correct_count := v_correct_count + 1;
    END IF;

    v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', v_question_id, 'is_correct', v_is_correct));
  END LOOP;

  IF v_total_count = 0 THEN
    RAISE EXCEPTION 'No valid answers submitted for this quiz';
  END IF;

  -- Unanswered questions count as wrong: score against the whole quiz.
  v_total_count := GREATEST(v_total_count, (
    SELECT count(*) FROM public.unified_quiz_questions uqq
      JOIN public.unified_questions q ON q.id = uqq.question_id AND q.status = 'published'
     WHERE uqq.quiz_id = p_quiz_id));

  v_score := round((v_correct_count::numeric / v_total_count::numeric) * 100);
  v_passed := v_score >= COALESCE(v_quiz.passing_score_percentage, 70);

  UPDATE public.unified_quiz_sessions
     SET completed_at = now(),
         total_questions = v_total_count,
         correct_answers = v_correct_count,
         total_points = v_total_count,
         earned_points = v_correct_count,
         score_percentage = v_score,
         passed = v_passed
   WHERE id = v_session_id;

  SELECT * INTO v_existing FROM public.training_progress
   WHERE user_id = v_user_id AND training_id = p_quiz_id AND lp_content_type = 'quiz';

  -- A later failed retake must never erase a successful attempt.
  IF FOUND AND v_existing.passed IS TRUE AND v_passed IS NOT TRUE THEN
    v_final_score := v_existing.score_percentage;
    v_final_passed := v_existing.passed;
  ELSIF FOUND AND v_existing.score_percentage IS NOT NULL AND v_existing.score_percentage > v_score THEN
    v_final_score := v_existing.score_percentage;
    v_final_passed := v_existing.passed;
  ELSE
    v_final_score := v_score;
    v_final_passed := v_passed;
  END IF;

  v_metadata := COALESCE(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
    'quiz_attempt_count', v_attempt_count + 1,
    'latest_quiz_result', jsonb_build_object(
      'quiz_id', p_quiz_id,
      'quiz_title', v_quiz.title,
      'score', v_score,
      'passed', v_passed,
      'correct_count', v_correct_count,
      'total_questions', v_total_count,
      'completed_at', now(),
      'session_id', v_session_id
    )
  );

  PERFORM set_config('app.trusted_progress_write', 'on', true);

  INSERT INTO public.training_progress (
    user_id, training_id, lp_content_type, assignment_id, status,
    progress_percentage, score_percentage, passed, completed_at,
    last_accessed_at, last_activity_at, metadata, updated_at
  ) VALUES (
    v_user_id, p_quiz_id, 'quiz', p_assignment_id, 'completed',
    100, v_final_score, v_final_passed, now(),
    now(), now(), v_metadata, now()
  )
  ON CONFLICT (user_id, training_id) DO UPDATE SET
    lp_content_type = 'quiz',
    assignment_id = COALESCE(public.training_progress.assignment_id, EXCLUDED.assignment_id),
    status = 'completed',
    progress_percentage = 100,
    score_percentage = EXCLUDED.score_percentage,
    passed = EXCLUDED.passed,
    completed_at = EXCLUDED.completed_at,
    last_accessed_at = EXCLUDED.last_accessed_at,
    last_activity_at = EXCLUDED.last_activity_at,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;

  PERFORM set_config('app.trusted_progress_write', 'off', true);

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'score_percentage', v_score,
    'passed', v_passed,
    'correct_count', v_correct_count,
    'total_questions', v_total_count,
    'attempt_number', v_attempt_count + 1,
    'final_score_percentage', v_final_score,
    'final_passed', v_final_passed,
    'results', v_results
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_daily_challenge_question_ids(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_questions_for_attempt(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grade_question_attempt(uuid, text, uuid[], uuid, text, uuid, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_quiz_for_player(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, text, uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_challenge_question_ids(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_questions_for_attempt(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_question_attempt(uuid, text, uuid[], uuid, text, uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_for_player(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, text, uuid, uuid, integer) TO authenticated;
