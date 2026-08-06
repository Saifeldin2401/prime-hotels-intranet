-- Everything on Training Analytics was a point-in-time snapshot -- no way to tell "are we
-- getting better." This buckets actual completed_at timestamps into weekly counts so the
-- dashboard can show a real trend line instead of the previously-hardcoded 'trend' string.

CREATE OR REPLACE FUNCTION public.get_training_completion_trend(
    p_weeks integer DEFAULT 12,
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_my_team_only boolean DEFAULT false
)
RETURNS TABLE(
    week_start date,
    completed_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH weeks AS (
        SELECT generate_series(
            date_trunc('week', now() - ((p_weeks - 1) || ' weeks')::interval),
            date_trunc('week', now()),
            interval '1 week'
        )::date AS week_start
    ),
    scoped_completions AS (
        SELECT tp.completed_at
        FROM public.training_progress tp
        WHERE tp.lp_content_type = 'module'
          AND tp.is_deleted = false
          AND tp.status = 'completed'
          AND tp.completed_at >= now() - (p_weeks || ' weeks')::interval
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud WHERE ud.user_id = tp.user_id AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up WHERE up.user_id = tp.user_id AND up.property_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.user_departments ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = tp.user_id AND d_mt.manager_id = auth.uid()))
          AND (
              p_my_team_only = true
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid()
                    AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
              )
          )
    )
    SELECT
        w.week_start,
        count(sc.completed_at) AS completed_count
    FROM weeks w
    LEFT JOIN scoped_completions sc ON date_trunc('week', sc.completed_at)::date = w.week_start
    GROUP BY w.week_start
    ORDER BY w.week_start;
$$;

COMMENT ON FUNCTION public.get_training_completion_trend IS
    'Weekly completed-module counts over the trailing N weeks, for a real completion trend chart.';

REVOKE EXECUTE ON FUNCTION public.get_training_completion_trend(integer, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_completion_trend(integer, uuid, uuid, boolean) TO authenticated;
