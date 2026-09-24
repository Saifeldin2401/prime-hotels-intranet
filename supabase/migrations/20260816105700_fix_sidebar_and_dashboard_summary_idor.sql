-- SEC-08: get_sidebar_counts and get_dashboard_summary are SECURITY DEFINER and trusted the
-- caller-supplied p_user_id AND p_role/p_property_ids/p_department_ids with no verification.
-- Verified live: a 'staff' user called get_sidebar_counts with a corporate_admin's id and role
-- and received that admin's private counters. Fix: require p_user_id = caller (or caller is
-- HR/admin), and derive role/property/department scope server-side from that verified identity
-- rather than trusting the client-supplied arrays - closes both the cross-user IDOR and the
-- "spoof my own role to widen my own dashboard scope" variant. p_current_property_id is
-- additionally checked against has_property_access before being trusted as a filter.
CREATE OR REPLACE FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text DEFAULT NULL::text, p_property_ids uuid[] DEFAULT NULL::uuid[], p_department_ids uuid[] DEFAULT NULL::uuid[], p_current_property_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_caller uuid := (select auth.uid());
    v_role text;
    v_property_ids uuid[];
    v_department_ids uuid[];
    v_current_property_id uuid;
    v_unread_notifications integer;
    v_pending_approvals integer;
    v_overdue_tasks integer;
    v_unread_messages integer;
    v_pending_training integer;
    v_active_goals integer;
    v_is_regional boolean;
    v_is_property boolean;
    v_is_dept_head boolean;
BEGIN
    IF v_caller IS NULL THEN
        RETURN json_build_object('unreadNotifications',0,'pendingApprovals',0,'overdueTasks',0,'unreadMessages',0,'pendingTraining',0,'activeGoals',0);
    END IF;

    IF p_user_id IS DISTINCT FROM v_caller AND NOT public.is_hr_or_admin(v_caller) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own sidebar counts';
    END IF;

    -- Derive real scope from the verified target user rather than trusting client-supplied values.
    v_role := public.get_user_role(p_user_id)::text;
    v_property_ids := ARRAY(SELECT property_id FROM public.user_properties WHERE user_id = p_user_id);
    v_department_ids := ARRAY(SELECT department_id FROM public.user_departments WHERE user_id = p_user_id);
    v_current_property_id := CASE
        WHEN p_current_property_id IS NOT NULL AND public.has_property_access(p_user_id, p_current_property_id)
        THEN p_current_property_id ELSE NULL
    END;

    v_is_regional := v_role IN ('regional_admin', 'regional_hr');
    v_is_property := v_role IN ('property_manager', 'property_hr');
    v_is_dept_head := v_role = 'department_head';

    SELECT count(*)::integer INTO v_unread_notifications
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL;

    IF v_is_regional THEN
        IF v_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = v_current_property_id;
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review');
        END IF;
    ELSIF v_is_property THEN
        IF v_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = v_current_property_id;
        ELSIF v_property_ids IS NOT NULL AND array_length(v_property_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = ANY(v_property_ids);
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND current_assignee_id = p_user_id;
        END IF;
    ELSIF v_is_dept_head THEN
        IF v_department_ids IS NOT NULL AND array_length(v_department_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND department_id = ANY(v_department_ids);
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND current_assignee_id = p_user_id;
        END IF;
    ELSE
        SELECT count(*)::integer INTO v_pending_approvals
        FROM requests
        WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
          AND (requester_id = p_user_id OR current_assignee_id = p_user_id);
    END IF;

    SELECT count(*)::integer INTO v_overdue_tasks
    FROM tasks
    WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
      AND due_date < now() AND assigned_to_id = p_user_id;

    SELECT count(*)::integer INTO v_unread_messages
    FROM messages
    WHERE recipient_id = p_user_id AND read_at IS NULL;

    SELECT count(*)::integer INTO v_pending_training
    FROM training_assignment_rules la
    WHERE la.is_deleted = false
      AND NOT EXISTS (
          SELECT 1 FROM training_progress lp
          WHERE lp.assignment_id = la.id
            AND lp.user_id = p_user_id
            AND lp.status = 'completed'
      )
      AND (
        la.target_type = 'everyone'
        OR (la.target_type = 'user' AND la.target_id = p_user_id::text)
        OR (
          la.target_type = 'property'
          AND EXISTS (
            SELECT 1
            FROM unnest(coalesce(v_property_ids, ARRAY[]::uuid[])) AS pid
            WHERE pid::text = la.target_id
          )
        )
        OR (
          la.target_type = 'department'
          AND EXISTS (
            SELECT 1
            FROM unnest(coalesce(v_department_ids, ARRAY[]::uuid[])) AS did
            WHERE did::text = la.target_id
          )
        )
        OR (la.target_type = 'role' AND v_role IS NOT NULL AND la.target_id = v_role)
      );

    SELECT count(*)::integer INTO v_active_goals
    FROM goals
    WHERE employee_id = p_user_id AND status IN ('not_started', 'in_progress');

    RETURN json_build_object(
        'unreadNotifications', COALESCE(v_unread_notifications, 0),
        'pendingApprovals', COALESCE(v_pending_approvals, 0),
        'overdueTasks', COALESCE(v_overdue_tasks, 0),
        'unreadMessages', COALESCE(v_unread_messages, 0),
        'pendingTraining', COALESCE(v_pending_training, 0),
        'activeGoals', COALESCE(v_active_goals, 0)
    );
END;
$function$;
