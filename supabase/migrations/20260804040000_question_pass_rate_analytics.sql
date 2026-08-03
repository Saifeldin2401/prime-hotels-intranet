-- Question-level pass-rate analytics for authors/reviewers: unified_question_attempts has
-- all the data needed to flag an ambiguous question (low pass rate), but nothing surfaces it
-- today. unified_question_attempts_select restricts reads to `user_id = auth.uid()` (a
-- deliberately narrow, correct policy -- individual staff shouldn't browse each other's quiz
-- answers), so a plain client-side aggregation query only ever sees the caller's own attempts.
--
-- This RPC returns AGGREGATE counts only (never which user answered what), gated to the
-- question's own author or the same admin/reviewer roles already used for question
-- management elsewhere. The EXISTS gate is inside the WHERE clause, so an unauthorized
-- caller gets zero rows back rather than an error.

CREATE OR REPLACE FUNCTION public.get_questions_pass_rates(p_question_ids uuid[])
RETURNS TABLE(question_id uuid, total_attempts integer, correct_attempts integer, accuracy_rate numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
    SELECT
        a.question_id,
        count(*)::integer AS total_attempts,
        count(*) FILTER (WHERE a.is_correct)::integer AS correct_attempts,
        ROUND(100.0 * count(*) FILTER (WHERE a.is_correct) / NULLIF(count(*), 0), 1) AS accuracy_rate
    FROM public.unified_question_attempts a
    WHERE a.question_id = ANY (p_question_ids)
      AND (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
              AND (user_roles.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
        )
        OR EXISTS (
            SELECT 1 FROM public.unified_questions q
            WHERE q.id = a.question_id AND q.created_by = auth.uid()
        )
      )
    GROUP BY a.question_id;
$$;

COMMENT ON FUNCTION public.get_questions_pass_rates IS
    'Aggregate (never per-user) pass-rate stats for questions, visible to the question author or admin/reviewer roles only.';

REVOKE EXECUTE ON FUNCTION public.get_questions_pass_rates(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_questions_pass_rates(uuid[]) TO authenticated;
