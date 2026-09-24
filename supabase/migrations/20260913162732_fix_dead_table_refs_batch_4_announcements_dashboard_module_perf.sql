
-- get_announcement_compliance_breakdown joined a dropped `properties` table directly (not
-- just via user_properties) -- "property" scope is now `hotels` + organization_memberships.hotel_id.
CREATE OR REPLACE FUNCTION public.get_announcement_compliance_breakdown(p_announcement_id uuid)
 RETURNS TABLE(scope_type text, scope_id uuid, scope_name text, total_users bigint, read_users bigint, acknowledged_users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_any_role((SELECT auth.uid()),
       ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_manager','property_hr','department_head']::app_role[]) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'property'::text, h.id, h.name,
    (SELECT count(*) FROM organization_memberships om WHERE om.is_active = true AND om.hotel_id = h.id),
    (SELECT count(DISTINCT ar.user_id) FROM announcement_reads ar
       JOIN organization_memberships om ON om.user_id = ar.user_id AND om.is_active = true
       WHERE ar.announcement_id = p_announcement_id AND om.hotel_id = h.id),
    (SELECT count(DISTINCT aa.user_id) FROM announcement_acknowledgments aa
       JOIN organization_memberships om ON om.user_id = aa.user_id AND om.is_active = true
       WHERE aa.announcement_id = p_announcement_id AND om.hotel_id = h.id)
  FROM announcement_targets t
  JOIN hotels h ON h.id = ANY(t.target_properties)
  WHERE t.announcement_id = p_announcement_id

  UNION ALL
  SELECT 'department'::text, d.id, d.name,
    (SELECT count(*) FROM organization_memberships om WHERE om.is_active = true AND om.department_id = d.id),
    (SELECT count(DISTINCT ar.user_id) FROM announcement_reads ar
       JOIN organization_memberships om ON om.user_id = ar.user_id AND om.is_active = true
       WHERE ar.announcement_id = p_announcement_id AND om.department_id = d.id),
    (SELECT count(DISTINCT aa.user_id) FROM announcement_acknowledgments aa
       JOIN organization_memberships om ON om.user_id = aa.user_id AND om.is_active = true
       WHERE aa.announcement_id = p_announcement_id AND om.department_id = d.id)
  FROM announcement_targets t
  JOIN departments d ON d.id = ANY(t.target_departments)
  WHERE t.announcement_id = p_announcement_id;
END;
$function$;

-- get_dashboard_stats is unused by the frontend (only get_dashboard_summary is called),
-- confirmed via grep across src/. It referenced THREE more missing subsystems beyond
-- user_departments/user_properties: `shifts`, `user_vacation_balance`, and
-- `approval_requests` -- none of which exist; shift scheduling and vacation-balance
-- tracking were apparently never built. Fixed to stop crashing (organization_memberships
-- for property/department semantics) and nulled out the fields for subsystems that don't
-- exist, rather than inventing behavior for features that were never implemented.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid uuid)
 RETURNS TABLE(pending_tasks bigint, completed_training bigint, in_progress_training bigint, unread_announcements bigint, pending_approvals bigint, unread_notifications bigint, next_shift_date date, next_shift_start time without time zone, vacation_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF user_uuid != auth.uid() AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN (
        'regional_admin', 'regional_hr', 'corporate_admin',
        'property_manager', 'property_hr', 'department_head'
      )
  ) THEN
      RAISE EXCEPTION 'Access denied to user dashboard statistics';
  END IF;

  RETURN QUERY
  SELECT
      COALESCE((
          SELECT COUNT(*) FROM tasks
          WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM training_progress
          WHERE user_id = user_uuid AND status = 'completed'
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM training_progress
          WHERE user_id = user_uuid AND status = 'in_progress'
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM announcements a
          WHERE a.created_at > now() - interval '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM announcement_reads ar
              WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid
          )
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM document_approvals
          WHERE approver_id = user_uuid AND status = 'pending' AND is_active = true
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM notifications
          WHERE user_id = user_uuid AND read_at IS NULL
      ), 0),
      NULL::date,
      NULL::time without time zone,
      NULL::numeric;
END;
$function$;

-- get_training_module_performance: same organization_memberships substitution.
CREATE OR REPLACE FUNCTION public.get_training_module_performance(p_department_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(module_id uuid, title text, assignee_count bigint, completed_count bigint, completion_rate numeric, average_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships ud WHERE ud.user_id = p.id AND ud.is_active = true AND ud.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships up WHERE up.user_id = p.id AND up.is_active = true AND up.hotel_id = p_property_id))
        UNION
        SELECT ud.user_id, ar.content_id
        FROM active_rules ar
        JOIN public.organization_memberships ud ON ud.department_id = ar.target_id::uuid AND ud.is_active = true
        WHERE ar.target_type = 'department'
          AND (p_department_id IS NULL OR ud.department_id = p_department_id)
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships up2 WHERE up2.user_id = ud.user_id AND up2.is_active = true AND up2.hotel_id = p_property_id))
        UNION
        SELECT up.user_id, ar.content_id
        FROM active_rules ar
        JOIN public.organization_memberships up ON up.hotel_id = ar.target_id::uuid AND up.is_active = true
        WHERE ar.target_type = 'property'
          AND (p_property_id IS NULL OR up.hotel_id = p_property_id)
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships ud2 WHERE ud2.user_id = up.user_id AND ud2.is_active = true AND ud2.department_id = p_department_id))
        UNION
        SELECT ar.target_id::uuid AS user_id, ar.content_id
        FROM active_rules ar
        WHERE ar.target_type = 'user'
          AND (p_department_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships ud3 WHERE ud3.user_id = ar.target_id::uuid AND ud3.is_active = true AND ud3.department_id = p_department_id))
          AND (p_property_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships up3 WHERE up3.user_id = ar.target_id::uuid AND up3.is_active = true AND up3.hotel_id = p_property_id))
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
        m.id AS module_id, m.title,
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
$function$;
