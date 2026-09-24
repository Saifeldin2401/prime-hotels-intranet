BEGIN;
-- Quiz consolidation: collapse the legacy quizzes/quiz_attempts/quiz_answers
-- system onto the canonical learning_quizzes + unified_* system.
--
-- 1. BUG FIX: unified_quiz_questions.quiz_id FK pointed at the legacy `quizzes`
--    table, but learningService populates it with learning_quizzes ids. Repoint
--    the FK to learning_quizzes (where it should have pointed all along).
ALTER TABLE public.unified_quiz_questions
  DROP CONSTRAINT IF EXISTS unified_quiz_questions_quiz_id_fkey;
ALTER TABLE public.unified_quiz_questions
  ADD CONSTRAINT unified_quiz_questions_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.learning_quizzes(id) ON DELETE CASCADE;

-- 2. Drop the legacy tables (all 0-row; code no longer references them).
--    Order respects FKs: quiz_answers -> quiz_attempts -> quizzes.
DROP TABLE IF EXISTS public.quiz_answers  CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quizzes       CASCADE;
COMMIT;
