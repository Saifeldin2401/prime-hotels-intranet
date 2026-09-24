-- =============================================================================
-- MIGRATION: consolidate_quiz_system
-- Applied: 2026-06-14
-- Purpose: Collapse the legacy quizzes / quiz_attempts / quiz_answers system
--          onto the canonical learning_quizzes + unified_* system. The app had
--          three assessment systems; this removes the oldest.
--
-- Coordinated frontend changes (same commit):
--   - useTraining.ts: quiz attempts now write unified_quiz_sessions (per attempt)
--     + unified_question_attempts (per question); reads from unified_quiz_sessions.
--   - TrainingBuilderContext.tsx / TriggerEditor.tsx: quiz pickers read
--     learning_quizzes instead of quizzes.
--   - LearningAnalytics.tsx: analytics aggregate unified_quiz_sessions in JS
--     (the old nested quiz_attempts joins relied on FKs that never existed).
--
-- Rollback: restore the three tables + the original learning_quiz_questions view
--           from a pre-migration snapshot (all were 0-row, so no data is lost).
-- =============================================================================

BEGIN;

-- 1. BUG FIX: unified_quiz_questions.quiz_id FK pointed at the legacy `quizzes`
--    table, but learningService populates it with learning_quizzes ids. Repoint.
ALTER TABLE public.unified_quiz_questions
  DROP CONSTRAINT IF EXISTS unified_quiz_questions_quiz_id_fkey;
ALTER TABLE public.unified_quiz_questions
  ADD CONSTRAINT unified_quiz_questions_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.learning_quizzes(id) ON DELETE CASCADE;

-- 2. Drop the legacy tables (all 0-row; code no longer references them).
--    CASCADE also drops dead compat views training_quiz_attempts and
--    sop_quiz_attempts (built over quiz_attempts, zero code references) and
--    learning_quiz_questions (recreated below).
DROP TABLE IF EXISTS public.quiz_answers  CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quizzes       CASCADE;

-- 3. Recreate learning_quiz_questions as a clean passthrough over
--    unified_quiz_questions (quiz_id now FKs learning_quizzes, inherently
--    learning-domain, so the old JOIN quizzes + domain filter is unnecessary).
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

COMMIT;
