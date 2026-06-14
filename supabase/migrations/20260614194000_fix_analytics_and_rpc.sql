-- Fix analytics_events table and RLS
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name text NOT NULL,
    category text,
    user_id uuid,
    session_id text,
    properties jsonb DEFAULT '{}'::jsonb,
    timestamp timestamp with time zone DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert ON public.analytics_events;
DROP POLICY IF EXISTS "Anonymous users can insert events" ON public.analytics_events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.analytics_events;
CREATE POLICY analytics_events_insert ON public.analytics_events FOR INSERT TO public WITH CHECK (true);

-- Fix get_sidebar_counts to use training_assignment_rules instead of the dropped learning_assignments table
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
    -- Determine access level
    v_is_regional := p_role IN ('regional_admin', 'regional_hr');
    v_is_property := p_role IN ('property_manager', 'property_hr');
    v_is_dept_head := p_role = 'department_head';

    -- 1. Unread Notifications
    SELECT count(*)::integer INTO v_unread_notifications
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL;

    -- 2. Pending Approvals
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

    -- 3. Overdue Tasks
    SELECT count(*)::integer INTO v_overdue_tasks
    FROM tasks
    WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
      AND due_date < now() AND assigned_to_id = p_user_id;

    -- 4. Unread Messages
    SELECT count(*)::integer INTO v_unread_messages
    FROM messages
    WHERE recipient_id = p_user_id AND read_at IS NULL;

    -- 5. Pending Training
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

    -- 6. Active Goals
    SELECT count(*)::integer INTO v_active_goals
    FROM goals
    WHERE assigned_to_id = p_user_id AND is_deleted = false AND status IN ('not_started', 'in_progress');

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
