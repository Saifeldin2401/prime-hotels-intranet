-- 1. Fix task_watchers infinite recursion
CREATE OR REPLACE FUNCTION public.is_task_creator(p_task_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND created_by_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS task_watchers_select_policy ON public.task_watchers;
CREATE POLICY task_watchers_select_policy ON public.task_watchers FOR SELECT TO authenticated USING (
  (auth.uid() = user_id) OR public.is_task_creator(task_id, auth.uid())
);

-- 2. Fix get_sidebar_counts: goals uses employee_id not assigned_to_id
CREATE OR REPLACE FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text DEFAULT NULL::text, p_property_ids uuid[] DEFAULT NULL::uuid[], p_department_ids uuid[] DEFAULT NULL::uuid[], p_current_property_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
    v_is_regional := p_role IN ('regional_admin', 'regional_hr');
    v_is_property := p_role IN ('property_manager', 'property_hr');
    v_is_dept_head := p_role = 'department_head';

    SELECT count(*)::integer INTO v_unread_notifications
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL;

    IF v_is_regional THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = p_current_property_id;
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review');
        END IF;
    ELSIF v_is_property THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = p_current_property_id;
        ELSIF p_property_ids IS NOT NULL AND array_length(p_property_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = ANY(p_property_ids);
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND current_assignee_id = p_user_id;
        END IF;
    ELSIF v_is_dept_head THEN
        IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND department_id = ANY(p_department_ids);
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
            FROM unnest(coalesce(p_property_ids, ARRAY[]::uuid[])) AS pid
            WHERE pid::text = la.target_id
          )
        )
        OR (
          la.target_type = 'department'
          AND EXISTS (
            SELECT 1
            FROM unnest(coalesce(p_department_ids, ARRAY[]::uuid[])) AS did
            WHERE did::text = la.target_id
          )
        )
        OR (la.target_type = 'role' AND p_role IS NOT NULL AND la.target_id = p_role)
      );

    -- FIX: Use employee_id instead of assigned_to_id
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

-- 3. Fix get_events_for_range by removing the broken learning_assignments UNION
CREATE OR REPLACE FUNCTION public.get_events_for_range(start_date text, end_date text, property_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, title text, description text, start_time timestamp with time zone, end_time timestamp with time zone, type text, color text, created_by uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  -- Cast input text to timestamp
  v_start_date := start_date::timestamp with time zone;
  v_end_date := end_date::timestamp with time zone;

  RETURN QUERY
  -- Calendar Events
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_date as start_time,
    e.end_date as end_time,
    'event' as type,
    '#6366f1' as color,
    e.created_by
  FROM events e
  WHERE e.start_date >= v_start_date 
    AND e.start_date <= v_end_date
    AND (property_filter IS NULL OR e.property_id = property_filter)
  
  UNION ALL
  
  -- Announcements (as events)
  SELECT 
    a.id,
    a.title,
    a.content as description,
    a.created_at as start_time,
    a.created_at + interval '1 hour' as end_time,
    'announcement' as type,
    '#3b82f6' as color, -- blue-500
    a.created_by
  FROM announcements a
  WHERE a.created_at >= v_start_date 
    AND a.created_at <= v_end_date;
END;
$function$;
