-- CASCADE from dropping `quizzes` removed learning_quiz_questions (it JOINed quizzes
-- with domain='learning'). Recreate as a clean passthrough over unified_quiz_questions
-- (quiz_id now FKs learning_quizzes, which is inherently learning-domain, so the old
-- JOIN+filter is no longer needed). security_invoker preserves caller RLS.
CREATE OR REPLACE VIEW public.learning_quiz_questions
  WITH (security_invoker = true)
AS
SELECT
  uqq.id,
  uqq.quiz_id,
  uqq.question_id,
  uqq.display_order,
  uqq.points_override,
  uqq.created_at
FROM public.unified_quiz_questions uqq;
