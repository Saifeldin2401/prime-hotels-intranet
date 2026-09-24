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
      AND q.source_domain = 'knowledge'
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
    'Adaptive daily-challenge question selection: prioritizes never-attempted and previously-missed questions over recently-mastered ones, with a per-user-per-day stable shuffle.';

REVOKE EXECUTE ON FUNCTION public.get_daily_challenge_question_ids(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_challenge_question_ids(integer) TO authenticated;
