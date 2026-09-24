-- No employee-level manager/reports_to relationship exists anywhere in this schema, but
-- departments.manager_id does (with a working admin UI in DepartmentControlCenter.tsx to set
-- it) -- it was just never used for scoping anything. This adds "my team" filtering built on
-- that existing relationship: a department_head managing one or more departments can filter
-- training analytics/skills down to just the people in departments they manage, instead of
-- either admin-global or a manual per-department picker.
--
-- Adds p_my_team_only as a new trailing parameter (default false) to the existing analytics
-- RPCs -- additive, so existing callers are unaffected.

CREATE OR REPLACE FUNCTION public.get_my_managed_department_ids()
RETURNS TABLE(department_id uuid, department_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT d.id, d.name
    FROM public.departments d
    WHERE d.manager_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_managed_department_ids IS
    'Departments the calling user is the designated manager of (departments.manager_id), for My Team scoping.';

REVOKE EXECUTE ON FUNCTION public.get_my_managed_department_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_managed_department_ids() TO authenticated;

-- Adding a parameter changes the signature, so CREATE OR REPLACE would create a second
-- overload rather than replace the original -- drop it explicitly first to keep one
-- canonical version (the new trailing default param keeps existing 3-arg callers working).
DROP FUNCTION IF EXISTS public.get_training_analytics_summary(timestamptz, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_training_analytics_summary(
    p_start_date timestamptz DEFAULT NULL,
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_my_team_only boolean DEFAULT false
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
          AND (
              p_my_team_only = true
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid()
                    AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
              )
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
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.user_departments ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = p.id AND d_mt.manager_id = auth.uid()))

        UNION

        SELECT ud.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.user_departments ud ON ud.department_id = ar.target_id::uuid
        WHERE ar.target_type = 'department'
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up2 WHERE up2.user_id = ud.user_id AND up2.property_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.departments d_mt2 WHERE d_mt2.id = ud.department_id AND d_mt2.manager_id = auth.uid()))

        UNION

        SELECT up.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.user_properties up ON up.property_id = ar.target_id::uuid
        WHERE ar.target_type = 'property'
          AND (p_property_id IS NULL OR up.property_id = p_property_id)
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud2 WHERE ud2.user_id = up.user_id AND ud2.department_id = p_department_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.user_departments ud_mt3
              JOIN public.departments d_mt3 ON d_mt3.id = ud_mt3.department_id
              WHERE ud_mt3.user_id = up.user_id AND d_mt3.manager_id = auth.uid()))

        UNION

        SELECT ar.target_id::uuid AS user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        WHERE ar.target_type = 'user'
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_departments ud3 WHERE ud3.user_id = ar.target_id::uuid AND ud3.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up3 WHERE up3.user_id = ar.target_id::uuid AND up3.property_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.user_departments ud_mt4
              JOIN public.departments d_mt4 ON d_mt4.id = ud_mt4.department_id
              WHERE ud_mt4.user_id = ar.target_id::uuid AND d_mt4.manager_id = auth.uid()))
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

REVOKE EXECUTE ON FUNCTION public.get_training_analytics_summary(timestamptz, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_analytics_summary(timestamptz, uuid, uuid, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.get_skills_matrix(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_skills_matrix(
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_my_team_only boolean DEFAULT false
)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    department_name text,
    skill_id uuid,
    skill_name text,
    skill_category text,
    proficiency_level integer,
    verified boolean,
    has_skill boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH scoped_users AS (
        SELECT DISTINCT ON (p.id)
            p.id,
            p.full_name,
            d.name AS department_name
        FROM public.profiles p
        LEFT JOIN public.user_departments ud ON ud.user_id = p.id
        LEFT JOIN public.departments d ON d.id = ud.department_id
        WHERE p.is_active = true
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.user_properties up WHERE up.user_id = p.id AND up.property_id = p_property_id))
          AND (
              p_my_team_only = true
              OR EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid()
                    AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
              )
          )
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.user_departments ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = p.id AND d_mt.manager_id = auth.uid()))
        ORDER BY p.id, ud.department_id NULLS LAST
    )
    SELECT
        su.id,
        su.full_name,
        su.department_name,
        s.id,
        s.name,
        s.category,
        us.proficiency_level,
        us.verified,
        (us.id IS NOT NULL) AS has_skill
    FROM scoped_users su
    CROSS JOIN public.skills s
    LEFT JOIN public.user_skills us ON us.user_id = su.id AND us.skill_id = s.id
    ORDER BY su.full_name, s.category, s.name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_skills_matrix(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skills_matrix(uuid, uuid, boolean) TO authenticated;
