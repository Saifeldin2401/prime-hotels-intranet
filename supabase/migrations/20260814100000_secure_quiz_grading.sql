-- Server-side quiz grading + training_progress integrity hardening.
--
-- Problem: quiz grading happened entirely client-side. unified_question_options
-- and unified_questions were readable (including is_correct/correct_answer) by
-- any authenticated user once a question was published, and training_progress
-- was writable by its own user with no server-side check tying passed/score to
-- a real graded attempt. A learner could read the answer key over the network,
-- or simply write { passed: true, score_percentage: 100 } to their own
-- training_progress row and self-issue a training certificate.
--
-- Also fixes a live bug: training_progress.training_id had a single FK to
-- training_modules(id), but quiz-type rows (lp_content_type='quiz') store a
-- learning_quizzes.id there. Every standalone quiz completion has been
-- failing that FK (confirmed: 0 live rows with lp_content_type='quiz' despite
-- the client unconditionally writing one after every quiz).

-- ============================================================================
-- 1. Fix the polymorphic training_id reference
-- ============================================================================

ALTER TABLE public.training_progress
  DROP CONSTRAINT IF EXISTS training_progress_training_id_fkey;

CREATE OR REPLACE FUNCTION public.validate_training_progress_training_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lp_content_type = 'module' THEN
    IF NOT EXISTS (SELECT 1 FROM public.training_modules WHERE id = NEW.training_id) THEN
      RAISE EXCEPTION 'training_progress.training_id % does not reference an existing training module', NEW.training_id;
    END IF;
  ELSIF NEW.lp_content_type = 'quiz' THEN
    IF NOT EXISTS (SELECT 1 FROM public.learning_quizzes WHERE id = NEW.training_id) THEN
      RAISE EXCEPTION 'training_progress.training_id % does not reference an existing quiz', NEW.training_id;
    END IF;
  END IF;
  -- Other content types (microlearning, onboarding_task, ...) predate this
  -- polymorphic check and are left unvalidated.
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_training_progress_training_id ON public.training_progress;
CREATE TRIGGER trg_validate_training_progress_training_id
  BEFORE INSERT OR UPDATE OF training_id, lp_content_type ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_progress_training_id();

-- ============================================================================
-- 2. Block client-forged grading fields
-- ============================================================================
-- Any INSERT/UPDATE on a quiz- or module-type training_progress row resets
-- passed/score_percentage/completed-status back to the prior (safe) value
-- unless the write comes from one of the trusted RPCs below, which set a
-- transaction-local flag first.

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
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.completed_at IS NOT NULL THEN
      NEW.completed_at := OLD.completed_at;
    END IF;
  ELSE
    NEW.passed := NULL;
    NEW.score_percentage := NULL;
    NEW.completed_at := NULL;
    IF NEW.status = 'completed' THEN
      NEW.status := 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_training_progress_integrity ON public.training_progress;
CREATE TRIGGER trg_enforce_training_progress_integrity
  BEFORE INSERT OR UPDATE ON public.training_progress
  FOR EACH ROW
  WHEN (NEW.lp_content_type IN ('quiz', 'module'))
  EXECUTE FUNCTION public.enforce_training_progress_integrity();

-- ============================================================================
-- 3. Lock the answer key down: learners no longer get blanket read access
-- ============================================================================
-- Authoring/review UIs still work (created_by / admin-role branch untouched).
-- Taking a quiz must now go through the SECURITY DEFINER RPCs below, which
-- read the real table internally and never leak is_correct/correct_answer
-- pre-submission.

DROP POLICY IF EXISTS unified_questions_select ON public.unified_questions;
CREATE POLICY unified_questions_select ON public.unified_questions
  FOR SELECT
  USING (
    (created_by = ( SELECT auth.uid() AS uid))
    OR (EXISTS ( SELECT 1
         FROM user_roles
        WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid))
          AND ((user_roles.role)::text = ANY (ARRAY['super_admin'::text, 'corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text, 'department_head'::text])))))
  );

DROP POLICY IF EXISTS unified_question_options_select ON public.unified_question_options;
CREATE POLICY unified_question_options_select ON public.unified_question_options
  FOR SELECT
  USING (
    EXISTS ( SELECT 1
      FROM unified_questions q
     WHERE ((q.id = unified_question_options.question_id)
       AND ((q.created_by = auth.uid())
         OR (EXISTS ( SELECT 1
              FROM user_roles
             WHERE ((user_roles.user_id = auth.uid())
               AND ((user_roles.role)::text = ANY (ARRAY['super_admin'::text, 'corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text, 'department_head'::text])))))))
    )
  );

-- ============================================================================
-- 4. Grading primitives
-- ============================================================================

CREATE OR REPLACE FUNCTION public._safe_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN p_value::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public._normalize_free_text(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT regexp_replace(regexp_replace(lower(trim(COALESCE(p_value, ''))), '[.,!?;:''"`]', '', 'g'), '\s+', ' ', 'g');
$function$;

-- Faithful port of the grading switch in QuizComponentEnhanced.tsx /
-- src/services/question/core.ts so both quiz-taking surfaces agree with the
-- authoring UI on what counts as correct.
CREATE OR REPLACE FUNCTION public._grade_question_answer(
  p_question_id uuid,
  p_selected_answer text,
  p_selected_options uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_question record;
  v_is_correct boolean := false;
  v_correct_ids uuid[];
  v_selected_ids uuid[];
  v_has_options boolean;
  v_matching jsonb;
  v_relevant_count integer;
  v_match_ok boolean;
  v_opt record;
  v_selected_uuid uuid;
BEGIN
  SELECT question_type, correct_answer, accepted_answers
    INTO v_question
    FROM public.unified_questions
   WHERE id = p_question_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_has_options := EXISTS (SELECT 1 FROM public.unified_question_options WHERE question_id = p_question_id);

  CASE v_question.question_type::text
    WHEN 'mcq' THEN
      IF v_has_options THEN
        v_selected_uuid := public._safe_uuid(p_selected_answer);
        SELECT is_correct INTO v_is_correct
          FROM public.unified_question_options
         WHERE question_id = p_question_id AND id = v_selected_uuid;
        v_is_correct := COALESCE(v_is_correct, false);
      ELSE
        v_is_correct := lower(trim(COALESCE(p_selected_answer, ''))) = lower(trim(COALESCE(v_question.correct_answer, '')));
      END IF;

    WHEN 'scenario' THEN
      IF v_has_options THEN
        v_selected_uuid := public._safe_uuid(p_selected_answer);
        SELECT is_correct INTO v_is_correct
          FROM public.unified_question_options
         WHERE question_id = p_question_id AND id = v_selected_uuid;
        v_is_correct := COALESCE(v_is_correct, false);
      ELSE
        v_is_correct := public._normalize_free_text(p_selected_answer) <> ''
          AND public._normalize_free_text(p_selected_answer) = ANY (
            ARRAY(SELECT public._normalize_free_text(x) FROM unnest(
              array_prepend(v_question.correct_answer, COALESCE(v_question.accepted_answers, ARRAY[]::text[]))
            ) AS x)
          );
      END IF;

    WHEN 'true_false' THEN
      v_is_correct := lower(trim(COALESCE(p_selected_answer, ''))) = lower(trim(COALESCE(v_question.correct_answer, '')));

    WHEN 'fill_blank' THEN
      v_is_correct := public._normalize_free_text(p_selected_answer) <> ''
        AND public._normalize_free_text(p_selected_answer) = ANY (
          ARRAY(SELECT public._normalize_free_text(x) FROM unnest(
            array_prepend(v_question.correct_answer, COALESCE(v_question.accepted_answers, ARRAY[]::text[]))
          ) AS x)
        );

    WHEN 'mcq_multi' THEN
      SELECT array_agg(id ORDER BY id) INTO v_correct_ids
        FROM public.unified_question_options
       WHERE question_id = p_question_id AND is_correct = true;
      SELECT array_agg(DISTINCT x ORDER BY x) INTO v_selected_ids
        FROM unnest(COALESCE(p_selected_options, ARRAY[]::uuid[])) AS x;
      v_is_correct := v_correct_ids IS NOT NULL AND v_selected_ids IS NOT NULL AND v_correct_ids = v_selected_ids;

    WHEN 'ordering' THEN
      SELECT array_agg(id ORDER BY display_order) INTO v_correct_ids
        FROM public.unified_question_options
       WHERE question_id = p_question_id;
      v_is_correct := v_correct_ids IS NOT NULL
        AND p_selected_options IS NOT NULL
        AND p_selected_options = v_correct_ids;

    WHEN 'matching' THEN
      BEGIN
        v_matching := NULLIF(p_selected_answer, '')::jsonb;
      EXCEPTION WHEN others THEN
        v_matching := NULL;
      END;
      v_matching := COALESCE(v_matching, '{}'::jsonb);

      SELECT count(*) INTO v_relevant_count
        FROM public.unified_question_options
       WHERE question_id = p_question_id AND match_value IS NOT NULL;

      v_match_ok := v_relevant_count > 0
        AND (SELECT count(*) FROM jsonb_object_keys(v_matching)) = v_relevant_count;

      IF v_match_ok THEN
        FOR v_opt IN
          SELECT id, match_value FROM public.unified_question_options
           WHERE question_id = p_question_id AND match_value IS NOT NULL
        LOOP
          IF trim(COALESCE(v_matching ->> v_opt.id::text, chr(1))) IS DISTINCT FROM trim(v_opt.match_value) THEN
            v_match_ok := false;
          END IF;
        END LOOP;
      END IF;

      v_is_correct := v_match_ok;

    ELSE
      v_is_correct := false;
  END CASE;

  RETURN COALESCE(v_is_correct, false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._grade_question_answer(uuid, text, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._safe_uuid(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._normalize_free_text(text) FROM PUBLIC;

-- ============================================================================
-- 5. Safe fetch for taking a quiz/question (no answer key)
-- ============================================================================

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
  WHERE q.id = ANY(p_question_ids) AND q.status = 'published';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_questions_for_attempt(uuid[]) TO authenticated;

-- Quiz metadata + questions for the player (no is_correct / correct_answer).
CREATE OR REPLACE FUNCTION public.get_quiz_for_player(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz public.learning_quizzes%ROWTYPE;
  v_questions jsonb;
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_quiz FROM public.learning_quizzes WHERE id = p_quiz_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_is_admin := EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
  );

  IF v_quiz.status <> 'published' AND v_quiz.created_by IS DISTINCT FROM auth.uid() AND NOT v_is_admin THEN
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

GRANT EXECUTE ON FUNCTION public.get_quiz_for_player(uuid) TO authenticated;

-- ============================================================================
-- 6. Grading + persistence RPCs
-- ============================================================================

-- Single-question grading, used by the daily-quiz / inline-question-widget
-- flow (src/services/question/quiz.ts recordAttempt).
CREATE OR REPLACE FUNCTION public.grade_question_attempt(
  p_question_id uuid,
  p_selected_answer text,
  p_selected_options uuid[] DEFAULT NULL,
  p_session_id uuid DEFAULT NULL,
  p_context_type text DEFAULT NULL,
  p_context_entity_id uuid DEFAULT NULL,
  p_time_spent_seconds integer DEFAULT NULL,
  p_hint_used boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
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

  IF NOT EXISTS (SELECT 1 FROM public.unified_questions WHERE id = p_question_id AND status = 'published') THEN
    RAISE EXCEPTION 'Question not found or not published';
  END IF;

  v_is_correct := public._grade_question_answer(p_question_id, p_selected_answer, p_selected_options);

  SELECT count(*) + 1 INTO v_attempt_number
    FROM public.unified_question_attempts
   WHERE user_id = v_user_id AND question_id = p_question_id;

  INSERT INTO public.unified_question_attempts (
    user_id, question_id, session_id, selected_answer, selected_options,
    is_correct, context_type, context_entity_id, time_spent_seconds,
    attempt_number, hint_used
  ) VALUES (
    v_user_id, p_question_id, p_session_id, p_selected_answer, p_selected_options,
    v_is_correct, p_context_type, p_context_entity_id, p_time_spent_seconds,
    v_attempt_number, COALESCE(p_hint_used, false)
  );

  SELECT explanation, explanation_ar, correct_answer
    INTO v_explanation, v_explanation_ar, v_correct_answer
    FROM public.unified_questions WHERE id = p_question_id;

  SELECT jsonb_agg(jsonb_build_object('id', id, 'option_text', option_text, 'is_correct', is_correct, 'display_order', display_order) ORDER BY display_order)
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

GRANT EXECUTE ON FUNCTION public.grade_question_attempt(uuid, text, uuid[], uuid, text, uuid, integer, boolean) TO authenticated;

ALTER TABLE public.unified_quiz_sessions
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS context_entity_id uuid;

-- Full quiz submission: grades every answer server-side, records a session +
-- per-question attempts, enforces max_attempts, and is the only path allowed
-- to mark a quiz-type training_progress row passed/completed.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb,
  p_context_type text DEFAULT 'quiz',
  p_context_entity_id uuid DEFAULT NULL,
  p_assignment_id uuid DEFAULT NULL,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_quiz public.learning_quizzes%ROWTYPE;
  v_is_admin boolean;
  v_attempt_count integer;
  v_session_id uuid;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_options uuid[];
  v_is_correct boolean;
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_is_admin := EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_user_id
       AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
  );

  IF v_quiz.status <> 'published' AND v_quiz.created_by IS DISTINCT FROM v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  SELECT count(*) INTO v_attempt_count
    FROM public.unified_quiz_sessions
   WHERE user_id = v_user_id AND quiz_type = 'learning_quiz' AND quiz_entity_id = p_quiz_id
     AND completed_at IS NOT NULL;

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

    v_results := v_results || jsonb_build_object('question_id', v_question_id, 'is_correct', v_is_correct);
  END LOOP;

  IF v_total_count = 0 THEN
    RAISE EXCEPTION 'No valid answers submitted for this quiz';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, text, uuid, uuid, integer) TO authenticated;

-- Module completion: re-validates every mandatory quiz block against real
-- session data (matched by quiz + the block placement) instead of trusting
-- the client's aggregated score/pass flags. Non-quiz "mark as read" content
-- blocks remain client-attested (no secret to forge there).
CREATE OR REPLACE FUNCTION public.complete_training_module(
  p_module_id uuid,
  p_assignment_id uuid DEFAULT NULL,
  p_completed_block_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_last_block_id uuid DEFAULT NULL,
  p_last_block_index integer DEFAULT NULL,
  p_time_spent_seconds integer DEFAULT 0
)
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
  v_require_pass boolean;
  v_session record;
  v_found boolean;
  v_score_sum numeric := 0;
  v_score_n integer := 0;
  v_final_score numeric;
  v_existing public.training_progress%ROWTYPE;
  v_metadata jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_module FROM public.training_modules WHERE id = p_module_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  FOR v_block IN
    SELECT id, type, content_data, is_mandatory
      FROM public.training_content_blocks_v
     WHERE training_module_id = p_module_id AND is_deleted = false
  LOOP
    IF v_block.type = 'quiz' THEN
      v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
      IF v_quiz_id IS NULL THEN
        CONTINUE;
      END IF;

      v_require_pass := COALESCE(v_block.content_data ->> 'completion_requirement', '') <> 'submitted'
        AND COALESCE((v_block.content_data ->> 'require_passing')::boolean, true);

      SELECT * INTO v_session
        FROM public.unified_quiz_sessions
       WHERE user_id = v_user_id
         AND quiz_type = 'learning_quiz'
         AND quiz_entity_id = v_quiz_id
         AND context_entity_id = v_block.id
         AND completed_at IS NOT NULL
       ORDER BY passed DESC NULLS LAST, score_percentage DESC NULLS LAST, completed_at DESC
       LIMIT 1;
      v_found := FOUND;

      IF v_block.is_mandatory IS NOT FALSE THEN
        IF NOT v_found THEN
          RAISE EXCEPTION 'Quiz "%" has not been submitted yet', COALESCE(v_block.content_data ->> 'title', 'required quiz');
        END IF;
        IF v_require_pass AND v_session.passed IS NOT TRUE THEN
          RAISE EXCEPTION 'Quiz "%" has not been passed yet', COALESCE(v_block.content_data ->> 'title', 'required quiz');
        END IF;
      END IF;

      IF v_found AND v_session.score_percentage IS NOT NULL THEN
        v_score_sum := v_score_sum + v_session.score_percentage;
        v_score_n := v_score_n + 1;
      END IF;
    ELSIF v_block.is_mandatory IS NOT FALSE THEN
      IF NOT (v_block.id = ANY (COALESCE(p_completed_block_ids, ARRAY[]::uuid[]))) THEN
        RAISE EXCEPTION 'Required content "%" has not been completed yet', COALESCE(v_block.content_data ->> 'title', 'required content');
      END IF;
    END IF;
  END LOOP;

  v_final_score := CASE WHEN v_score_n > 0 THEN round(v_score_sum / v_score_n) ELSE NULL END;

  SELECT * INTO v_existing FROM public.training_progress
   WHERE user_id = v_user_id AND training_id = p_module_id AND lp_content_type = 'module';

  v_metadata := COALESCE(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
    'completed_blocks', to_jsonb(COALESCE(p_completed_block_ids, ARRAY[]::uuid[])),
    'active_block_id', p_last_block_id
  );

  PERFORM set_config('app.trusted_progress_write', 'on', true);

  INSERT INTO public.training_progress (
    user_id, training_id, lp_content_type, assignment_id, status,
    progress_percentage, score_percentage, passed, completed_at,
    last_accessed_at, last_activity_at, last_block_id, last_block_index,
    time_spent_seconds, metadata, updated_at
  ) VALUES (
    v_user_id, p_module_id, 'module', p_assignment_id, 'completed',
    100, v_final_score, true, now(),
    now(), now(), p_last_block_id, p_last_block_index,
    p_time_spent_seconds, v_metadata, now()
  )
  ON CONFLICT (user_id, training_id) DO UPDATE SET
    lp_content_type = 'module',
    assignment_id = COALESCE(public.training_progress.assignment_id, EXCLUDED.assignment_id),
    status = 'completed',
    progress_percentage = 100,
    score_percentage = COALESCE(EXCLUDED.score_percentage, public.training_progress.score_percentage),
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

  RETURN jsonb_build_object(
    'training_progress_id', v_existing.id,
    'score_percentage', v_existing.score_percentage,
    'passed', v_existing.passed,
    'status', v_existing.status,
    'completed_at', v_existing.completed_at
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.complete_training_module(uuid, uuid, uuid[], uuid, integer, integer) TO authenticated;
