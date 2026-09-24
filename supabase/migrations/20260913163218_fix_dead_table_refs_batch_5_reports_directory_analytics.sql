
CREATE OR REPLACE FUNCTION public.can_view_report_definition(_report_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rpt record;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT rd.id, rd.scope_type, rd.property_id, rd.department_id, rd.created_by
  INTO rpt
  FROM public.report_definitions rd
  WHERE rd.id = _report_id
  LIMIT 1;

  IF rpt IS NULL THEN
    RETURN false;
  END IF;

  IF rpt.created_by IS NOT NULL AND rpt.created_by = (select auth.uid()) THEN
    RETURN true;
  END IF;

  IF public.is_hr_or_admin((select auth.uid())) THEN
    RETURN true;
  END IF;

  IF rpt.scope_type = 'global' THEN
    RETURN true;
  ELSIF rpt.scope_type = 'property' THEN
    RETURN rpt.property_id IS NOT NULL
      AND public.has_property_access((select auth.uid()), rpt.property_id);
  ELSIF rpt.scope_type = 'department' THEN
    RETURN rpt.department_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_memberships om
        WHERE om.user_id = (select auth.uid())
          AND om.is_active = true
          AND om.department_id = rpt.department_id
      );
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_training_analytics_summary(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_my_team_only boolean DEFAULT false)
 RETURNS TABLE(total_assignees bigint, completed_count bigint, in_progress_count bigint, not_started_count bigint, overdue_count bigint, completion_rate numeric, average_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
              SELECT 1 FROM public.organization_memberships ud WHERE ud.user_id = p.id AND ud.is_active = true AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships up WHERE up.user_id = p.id AND up.is_active = true AND up.hotel_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud_mt
              JOIN public.departments d_mt ON d_mt.id = ud_mt.department_id
              WHERE ud_mt.user_id = p.id AND ud_mt.is_active = true AND d_mt.manager_id = auth.uid()))

        UNION

        SELECT ud.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.organization_memberships ud ON ud.department_id = ar.target_id::uuid AND ud.is_active = true
        WHERE ar.target_type = 'department'
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships up2 WHERE up2.user_id = ud.user_id AND up2.is_active = true AND up2.hotel_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.departments d_mt2 WHERE d_mt2.id = ud.department_id AND d_mt2.manager_id = auth.uid()))

        UNION

        SELECT up.user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        JOIN public.organization_memberships up ON up.hotel_id = ar.target_id::uuid AND up.is_active = true
        WHERE ar.target_type = 'property'
          AND (p_property_id IS NULL OR up.hotel_id = p_property_id)
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud2 WHERE ud2.user_id = up.user_id AND ud2.is_active = true AND ud2.department_id = p_department_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud_mt3
              JOIN public.departments d_mt3 ON d_mt3.id = ud_mt3.department_id
              WHERE ud_mt3.user_id = up.user_id AND ud_mt3.is_active = true AND d_mt3.manager_id = auth.uid()))

        UNION

        SELECT ar.target_id::uuid AS user_id, ar.content_id, ar.due_date
        FROM active_rules ar
        WHERE ar.target_type = 'user'
          AND (p_department_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud3 WHERE ud3.user_id = ar.target_id::uuid AND ud3.is_active = true AND ud3.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (
              SELECT 1 FROM public.organization_memberships up3 WHERE up3.user_id = ar.target_id::uuid AND up3.is_active = true AND up3.hotel_id = p_property_id))
          AND (p_my_team_only = false OR EXISTS (
              SELECT 1 FROM public.organization_memberships ud_mt4
              JOIN public.departments d_mt4 ON d_mt4.id = ud_mt4.department_id
              WHERE ud_mt4.user_id = ar.target_id::uuid AND ud_mt4.is_active = true AND d_mt4.manager_id = auth.uid()))
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
$function$;
