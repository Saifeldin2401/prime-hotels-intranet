-- The Training Analytics dashboard had four real correctness bugs, found while working on
-- LMS admin follow-up:
--
-- 1. completionRate divided completed *progress rows* by the count of *assignment rules*.
--    A single rule targeting a 200-person department counts as 1 in that denominator, so a
--    department where 50/200 people finished reports 50/1 = 5000%.
-- 2. overdueAssignments filtered training_progress.status = 'expired', but nothing anywhere
--    in the schema ever writes that value -- the metric is permanently 0.
-- 3. training_progress rows are created lazily (only once a learner opens a module -- see
--    TrainingPlayer's persistProgress/submitQuizProgress), not eagerly on assignment. So
--    people who are assigned but haven't started have no row at all and are invisible to any
--    query that starts from training_progress.
-- 4. There was no department/property scoping at all.
--
-- This RPC resolves the *actual* target audience of every active module assignment rule
-- (target_type: everyone/department/property/user) against user_departments/user_properties/
-- profiles, LEFT JOINs training_progress so not-yet-started assignees are counted as
-- incomplete rather than omitted, and derives "overdue" from due_date instead of a status
-- value nothing sets.

CREATE OR REPLACE FUNCTION public.get_training_analytics_summary(
    p_start_date timestamptz DEFAULT NULL,
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL
)
RETURNS TABLE(
    total_assignees bigint,
    completed_count bigint,
    in_progress_count bigint,
    not_started_count bigint,
    overdue_count bigint,
    completion_rate numeric,
    average_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH active_rules AS (
        SELECT r.id, r.target_type, r.target_id, r.content_id, r.due_date
        FROM public.training_assignment_rules r
        WHERE r.is_active = true
          AND r.is_deleted = false
          AND r.content_type = 'module'
          AND (p_start_date IS NULL OR r.created_at >= p_start_date)
          -- Org-wide aggregate: gate to admin/manager roles (SECURITY DEFINER bypasses RLS)
          AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
          )
    ),
    targeted_users AS (
        SELECT p.id AS user_id, ar.content_id AS training_id, ar.due_date
        FROM active_rules ar
        JOIN public.profiles p ON true
        WHERE ar.target_type = 'everyone'
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud WHERE ud.user_id = p.id AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up WHERE up.user_id = p.id AND up.property_id = p_property_id))

        UNION

        SELECT ud.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.user_departments ud ON ud.department_id = ar.target_id::uuid
        WHERE ar.target_type = 'department'
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up2 WHERE up2.user_id = ud.user_id AND up2.property_id = p_property_id))

        UNION

        SELECT up.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.user_properties up ON up.property_id = ar.target_id::uuid
        WHERE ar.target_type = 'property'
          AND (p_property_id IS NULL OR up.property_id = p_property_id)
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud2 WHERE ud2.user_id = up.user_id AND ud2.department_id = p_department_id))

        UNION

        SELECT ar.target_id::uuid AS user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        WHERE ar.target_type = 'user'
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud3 WHERE ud3.user_id = ar.target_id::uuid AND ud3.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up3 WHERE up3.user_id = ar.target_id::uuid AND up3.property_id = p_property_id))
    ),
    distinct_targets AS (
        SELECT user_id, training_id, min(due_date) AS due_date
        FROM targeted_users
        GROUP BY user_id, training_id
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, dt.due_date, tp.status, tp.score_percentage
        FROM distinct_targets dt
        LEFT JOIN public.training_progress tp
          ON tp.user_id = dt.user_id
         AND tp.training_id = dt.training_id
         AND tp.lp_content_type = 'module'
         AND tp.is_deleted = false
    )
    SELECT
        count(*) AS total_assignees,
        count(*) FILTER (WHERE status = 'completed') AS completed_count,
        count(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        count(*) FILTER (WHERE status IS NULL OR status = 'not_started') AS not_started_count,
        count(*) FILTER (WHERE status IS DISTINCT FROM 'completed' AND due_date IS NOT NULL AND due_date < now()) AS overdue_count,
        CASE WHEN count(*) > 0
            THEN round(100.0 * count(*) FILTER (WHERE status = 'completed') / count(*), 1)
            ELSE 0
        END AS completion_rate,
        (SELECT round(avg(j2.score_percentage), 1) FROM joined j2 WHERE j2.status = 'completed' AND j2.score_percentage IS NOT NULL) AS average_score
    FROM joined;
$$;

COMMENT ON FUNCTION public.get_training_analytics_summary IS
    'Correct training completion metrics: resolves each assignment rule''s real target audience (not rule count) and derives overdue from due_date (training_progress.status never becomes ''expired'').';

REVOKE EXECUTE ON FUNCTION public.get_training_analytics_summary(timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_analytics_summary(timestamptz, uuid, uuid) TO authenticated;

-- Same target-resolution logic, per module, replacing the client-side N+1 loop (21 sequential
-- round trips for 10 modules) and adding a real ORDER BY before the LIMIT.
CREATE OR REPLACE FUNCTION public.get_training_module_performance(
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 10
)
RETURNS TABLE(
    module_id uuid,
    title text,
    assignee_count bigint,
    completed_count bigint,
    completion_rate numeric,
    average_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH active_rules AS (
        SELECT r.target_type, r.target_id, r.content_id
        FROM public.training_assignment_rules r
        WHERE r.is_active = true AND r.is_deleted = false AND r.content_type = 'module'
          AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
          )
    ),
    targeted_users AS (
        SELECT p.id AS user_id, ar.content_id AS training_id
        FROM active_rules ar
        JOIN public.profiles p ON true
        WHERE ar.target_type = 'everyone'
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.user_departments ud WHERE ud.user_id = p.id AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.user_properties up WHERE up.user_id = p.id AND up.property_id = p_property_id))
        UNION
        SELECT ud.user_id, ar.content_id
        FROM active_rules ar
        JOIN public.user_departments ud ON ud.department_id = ar.target_id::uuid
        WHERE ar.target_type = 'department'
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.user_properties up2 WHERE up2.user_id = ud.user_id AND up2.property_id = p_property_id))
        UNION
        SELECT up.user_id, ar.content_id
        FROM active_rules ar
        JOIN public.user_properties up ON up.property_id = ar.target_id::uuid
        WHERE ar.target_type = 'property'
          AND (p_property_id IS NULL OR up.property_id = p_property_id)
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.user_departments ud2 WHERE ud2.user_id = up.user_id AND ud2.department_id = p_department_id))
        UNION
        SELECT ar.target_id::uuid AS user_id, ar.content_id
        FROM active_rules ar
        WHERE ar.target_type = 'user'
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.user_departments ud3 WHERE ud3.user_id = ar.target_id::uuid AND ud3.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.user_properties up3 WHERE up3.user_id = ar.target_id::uuid AND up3.property_id = p_property_id))
    ),
    distinct_targets AS (
        SELECT DISTINCT user_id, training_id FROM targeted_users
    ),
    joined AS (
        SELECT dt.user_id, dt.training_id, tp.status, tp.score_percentage
        FROM distinct_targets dt
        LEFT JOIN public.training_progress tp
          ON tp.user_id = dt.user_id AND tp.training_id = dt.training_id
         AND tp.lp_content_type = 'module' AND tp.is_deleted = false
    )
    SELECT
        m.id AS module_id,
        m.title,
        count(j.user_id) AS assignee_count,
        count(j.user_id) FILTER (WHERE j.status = 'completed') AS completed_count,
        CASE WHEN count(j.user_id) > 0
            THEN round(100.0 * count(j.user_id) FILTER (WHERE j.status = 'completed') / count(j.user_id), 1)
            ELSE 0
        END AS completion_rate,
        round(avg(j.score_percentage) FILTER (WHERE j.status = 'completed'), 1) AS average_score
    FROM public.training_modules m
    LEFT JOIN joined j ON j.training_id = m.id
    WHERE m.is_deleted = false
    GROUP BY m.id, m.title
    ORDER BY assignee_count DESC NULLS LAST
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_training_module_performance IS
    'Per-module completion stats using resolved target audience; replaces a client-side N+1 query loop with no ORDER BY.';

REVOKE EXECUTE ON FUNCTION public.get_training_module_performance(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_module_performance(uuid, uuid, integer) TO authenticated;
