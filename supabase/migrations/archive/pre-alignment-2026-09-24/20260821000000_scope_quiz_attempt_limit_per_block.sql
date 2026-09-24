-- Functional-correctness fix (from a full training-system audit): the same
-- quiz can legitimately be embedded in more than one content block of a
-- module (trainingCompletion.ts documents and relies on this being safe -
-- completion state is tracked per content-block id client-side). But
-- submit_quiz_attempt's max-attempts check counted prior attempts globally
-- by (user, quiz_id) only, ignoring context_entity_id (the block). With
-- max_attempts=1, submitting the quiz from block 1 permanently exhausted
-- the shared limit, so submitting from block 2 raised "Maximum attempts
-- reached for this quiz" before that block's result could ever be recorded
-- - permanently blocking module completion with no way to clear it.
--
-- Fix: when a context_entity_id is supplied (the quiz is embedded in a
-- specific block), scope the attempt count to that same block too, so each
-- placement gets its own attempt pool - matching what the client already
-- assumes. When no context_entity_id is supplied (a standalone quiz, not
-- embedded in any block), behavior is unchanged: count all of the user's
-- attempts at that quiz globally.
--
-- training_progress intentionally stays keyed by (user_id, training_id)
-- only - it represents "has this user ever passed this quiz" as a single
-- fact, which is correct regardless of how many blocks embed it.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb, p_context_type text DEFAULT 'quiz'::text, p_context_entity_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_time_spent_seconds integer DEFAULT 0)
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
     AND completed_at IS NOT NULL
     AND (p_context_entity_id IS NULL OR context_entity_id IS NOT DISTINCT FROM p_context_entity_id);

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
