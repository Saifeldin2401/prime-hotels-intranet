-- 50/50 quiz power-up: server-side wrong-option lookup.
--
-- Problem: get_quiz_for_player() (see 20260814100000_secure_quiz_grading.sql)
-- deliberately masks is_correct on every option sent to the client so the
-- answer key can never be read over the network before submission. The
-- QuizComponentEnhanced 50/50 power-up used to compute "wrong" options
-- client-side via `options.filter(o => !o.is_correct)` — since every option
-- arrives with is_correct hard-coded to false, that filter matched EVERY
-- option (including the real correct one), so the power-up could eliminate
-- the actual correct answer and make the question unanswerable.
--
-- Fix: a narrow SECURITY DEFINER RPC that reads the real answer key
-- server-side and returns up to 2 option ids that are confirmed wrong for
-- the given question, without ever revealing which option IS correct.

CREATE OR REPLACE FUNCTION public.get_fifty_fifty_eliminations(p_question_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_result uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.unified_questions
     WHERE id = p_question_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Question not found or not published';
  END IF;

  SELECT array_agg(id) INTO v_result
  FROM (
    SELECT id
      FROM public.unified_question_options
     WHERE question_id = p_question_id
       AND is_correct = false
     ORDER BY random()
     LIMIT 2
  ) sub;

  RETURN COALESCE(v_result, ARRAY[]::uuid[]);
END;
$function$;

-- Postgres grants EXECUTE to PUBLIC by default on new functions; every
-- sibling quiz RPC in this schema (get_quiz_for_player, grade_question_attempt,
-- submit_quiz_attempt) is authenticated-only with no PUBLIC/anon grant, so
-- match that posture here too.
REVOKE EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) TO authenticated;
