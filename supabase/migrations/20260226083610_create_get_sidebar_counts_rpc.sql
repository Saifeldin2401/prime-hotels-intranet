
-- Consolidated RPC to fetch all sidebar badge counts in a single database call.
-- Replaces 6 separate REST queries + 6 OPTIONS preflights = 12 HTTP requests with 1 RPC call.
-- This runs as a single Postgres function, vastly reducing REST API overhead.

CREATE OR REPLACE FUNCTION public.get_sidebar_counts(
    p_user_id uuid,
    p_role text DEFAULT NULL,
    p_property_ids uuid[] DEFAULT NULL,
    p_department_ids uuid[] DEFAULT NULL,
    p_current_property_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
    -- Determine access level
    v_is_regional := p_role IN ('regional_admin', 'regional_hr');
    v_is_property := p_role IN ('property_manager', 'property_hr');
    v_is_dept_head := p_role = 'department_head';

    -- 1. Unread Notifications (always user-specific)
    SELECT count(*)::integer INTO v_unread_notifications
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL;

    -- 2. Pending Approvals (role-based)
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

    -- 3. Overdue Tasks (role-based)
    IF v_is_regional THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND property_id = p_current_property_id;
        ELSE
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now();
        END IF;
    ELSIF v_is_property THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND property_id = p_current_property_id;
        ELSIF p_property_ids IS NOT NULL AND array_length(p_property_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND property_id = ANY(p_property_ids);
        ELSE
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND assigned_to_id = p_user_id;
        END IF;
    ELSIF v_is_dept_head THEN
        IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND department_id = ANY(p_department_ids);
        ELSE
            SELECT count(*)::integer INTO v_overdue_tasks
            FROM tasks
            WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
              AND due_date < now() AND assigned_to_id = p_user_id;
        END IF;
    ELSE
        SELECT count(*)::integer INTO v_overdue_tasks
        FROM tasks
        WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
          AND due_date < now() AND assigned_to_id = p_user_id;
    END IF;

    -- 4. Unread Messages (always user-specific)
    SELECT count(*)::integer INTO v_unread_messages
    FROM messages
    WHERE recipient_id = p_user_id AND read_at IS NULL;

    -- 5. Pending Training (always user-specific)
    SELECT count(*)::integer INTO v_pending_training
    FROM learning_progress
    WHERE user_id = p_user_id AND status IN ('assigned', 'in_progress', 'overdue');

    -- 6. Active Goals (always user-specific)
    SELECT count(*)::integer INTO v_active_goals
    FROM goals
    WHERE employee_id = p_user_id AND status != 'completed';

    RETURN json_build_object(
        'unreadNotifications', v_unread_notifications,
        'pendingApprovals', v_pending_approvals,
        'overdueTasks', v_overdue_tasks,
        'unreadMessages', v_unread_messages,
        'pendingTraining', v_pending_training,
        'activeGoals', v_active_goals,
        'requiredReading', 0
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_sidebar_counts TO authenticated;
;
