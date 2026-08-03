-- The daily quiz challenge previously pulled from getQuestions({status:'published'}, page 1, 20)
-- and shuffled the first 20 rows -- so anything past question #20 in the bank never surfaced,
-- and the set was never adapted to what the user actually knows.
--
-- This RPC ranks published questions per user: never-attempted first, then attempted-but-never-
-- correct, then correctly-answered-but-stale (14+ days), then recently-mastered last -- with a
-- deterministic per-user-per-day shuffle inside each bucket so the set is stable across a single
-- day's refreshes but changes day to day. SECURITY INVOKER (default) so RLS on both tables is
-- enforced exactly as it is for any other query the user makes.
--
-- Fixes a pre-existing gap found while building this: unified_questions has RLS enabled but
-- NO select policy at all (only delete/insert/update), and unlike learning_quizzes /
-- unified_quiz_sessions which do have select policies. Any direct or security_invoker-view
-- read of unified_questions by a non-superuser role returns zero rows -- meaning the question
-- bank has been unreadable by regular staff (quiz sessions render, but the embedded question
-- content comes back empty). Add the missing select policy: published questions are visible to
-- everyone, authors can see their own drafts, and the same reviewer/admin roles already granted
-- update/delete access can see everything.
DROP POLICY IF EXISTS unified_questions_select ON public.unified_questions;
CREATE POLICY unified_questions_select ON public.unified_questions
FOR SELECT TO authenticated
USING (
    status = 'published'
    OR created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
    )
);

CREATE OR REPLACE FUNCTION public.get_daily_challenge_question_ids(
    p_count integer DEFAULT 3
)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
    WHERE q.status = 'published'
    ORDER BY
        CASE
            WHEN a.question_id IS NULL THEN 0
            WHEN a.ever_correct IS NOT TRUE THEN 1
            WHEN a.last_attempt_at < now() - interval '14 days' THEN 2
            ELSE 3
        END,
        md5(q.id::text || COALESCE(auth.uid()::text, '') || to_char(now(), 'YYYY-MM-DD')),
        q.id
    LIMIT p_count;
$$;

COMMENT ON FUNCTION public.get_daily_challenge_question_ids IS
    'Adaptive daily-challenge question selection: prioritizes never-attempted and previously-missed '
    'questions over recently-mastered ones, with a per-user-per-day stable shuffle.';

REVOKE EXECUTE ON FUNCTION public.get_daily_challenge_question_ids(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_challenge_question_ids(integer) TO authenticated;
