-- Fix visibility of questions in published quizzes
-- Problem: Staff couldn't see questions in published quizzes if the questions themselves were still 'draft'

-- 1. Allow viewing questions if they are part of a published quiz
DROP POLICY IF EXISTS "Questions in published quizzes are visible" ON knowledge_questions;
CREATE POLICY "Questions in published quizzes are visible" ON knowledge_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM learning_quiz_questions lqq
            JOIN learning_quizzes lq ON lq.id = lqq.quiz_id
            WHERE lqq.question_id = knowledge_questions.id
            AND lq.status = 'published'
        )
    );

-- 2. Allow viewing options if the question is part of a published quiz
-- Note: The existing policy "Options follow question visibility" limits to (question.status = 'published'). 
-- We need to extend this or add a new policy. Adding new policy is cleaner.

DROP POLICY IF EXISTS "Options in published quizzes are visible" ON knowledge_question_options;
CREATE POLICY "Options in published quizzes are visible" ON knowledge_question_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM learning_quiz_questions lqq
            JOIN learning_quizzes lq ON lq.id = lqq.quiz_id
            WHERE lqq.question_id = knowledge_question_options.question_id
            AND lq.status = 'published'
        )
    );
