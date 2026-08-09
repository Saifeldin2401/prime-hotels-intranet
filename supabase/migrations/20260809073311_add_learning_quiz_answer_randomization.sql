-- Answer order is a quiz-level presentation rule. Keeping it on learning_quizzes
-- makes the builder and every player use the same persisted source of truth.
ALTER TABLE public.learning_quizzes
  ADD COLUMN IF NOT EXISTS randomize_answers boolean NOT NULL DEFAULT false;
