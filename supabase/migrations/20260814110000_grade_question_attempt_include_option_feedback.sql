-- grade_question_attempt's post-grading reveal payload was missing per-option
-- feedback text, which the question-bank widgets (MCQQuestion) show next to
-- the selected/correct option after answering. Everything else unchanged.

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
