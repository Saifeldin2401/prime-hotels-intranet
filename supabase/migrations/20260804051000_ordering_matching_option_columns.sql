-- Companion to 20260804050000 (enum values must land in a separate, already-committed
-- migration before they can be used in DDL/DML here).

ALTER TABLE public.unified_question_options
    ADD COLUMN IF NOT EXISTS match_value text,
    ADD COLUMN IF NOT EXISTS match_value_ar text;

COMMENT ON COLUMN public.unified_question_options.match_value IS
    'matching question_type only: the right-hand answer item this option (the left/prompt item) must be paired with.';

-- Propagate through the knowledge_question_options read-compat view (append-only column order).
CREATE OR REPLACE VIEW public.knowledge_question_options
  WITH (security_invoker = true)
AS
SELECT
  uqo.id,
  uqo.question_id,
  uqo.option_text,
  uqo.option_text_ar,
  uqo.is_correct,
  uqo.display_order,
  uqo.feedback,
  uqo.feedback_ar,
  uqo.created_at,
  uqo.match_value,
  uqo.match_value_ar
FROM public.unified_question_options uqo
JOIN public.unified_questions uq ON uq.id = uqo.question_id
WHERE uq.source_domain = 'knowledge';

-- The daily challenge widget (QuestionRenderer) doesn't have ordering/matching UI yet --
-- exclude those types so it keeps only serving question types it can actually render.
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
      AND q.question_type NOT IN ('ordering', 'matching')
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
