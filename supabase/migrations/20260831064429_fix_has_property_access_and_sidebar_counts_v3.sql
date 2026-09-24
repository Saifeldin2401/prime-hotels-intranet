CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Direct property assignment
    EXISTS (
      SELECT 1 FROM user_properties WHERE user_id = _user_id AND property_id = _property_id
    )
    OR
    -- super_admin: always global access
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    -- corporate_admin/regional_admin/regional_hr: access properties within their tenant organization or all accessible properties
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('corporate_admin', 'regional_admin', 'regional_hr')
        AND (
          NOT EXISTS (SELECT 1 FROM organization_memberships om WHERE om.user_id = _user_id AND om.is_active = true)
          OR EXISTS (
            SELECT 1 FROM organization_memberships om
            JOIN properties p ON (p.organization_id = om.organization_id OR p.company_id = om.organization_id)
            WHERE om.user_id = _user_id AND om.is_active = true AND p.id = _property_id
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_sidebar_counts(
    p_user_id uuid,
    p_role text DEFAULT NULL::text,
    p_property_ids uuid[] DEFAULT NULL::uuid[],
    p_department_ids uuid[] DEFAULT NULL::uuid[],
    p_current_property_id uuid DEFAULT NULL::uuid
)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_caller uuid := (SELECT auth.uid());
    v_unread_notifications integer := 0;
    v_pending_training integer := 0;
BEGIN
    IF v_caller IS NULL THEN
        RETURN json_build_object(
            'unreadNotifications', 0,
            'pendingApprovals', 0,
            'overdueTasks', 0,
            'unreadMessages', 0,
            'pendingTraining', 0,
            'activeGoals', 0
        );
    END IF;

    IF p_user_id IS DISTINCT FROM v_caller AND NOT public.is_hr_or_admin(v_caller) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own sidebar counts';
    END IF;

    -- Unread notifications count
    BEGIN
        SELECT count(*)::integer INTO v_unread_notifications
        FROM notifications
        WHERE user_id = p_user_id AND read_at IS NULL;
    EXCEPTION WHEN OTHERS THEN
        v_unread_notifications := 0;
    END;

    -- Pending training count
    BEGIN
        SELECT count(*)::integer INTO v_pending_training
        FROM training_progress tp
        WHERE tp.user_id = p_user_id
          AND (tp.status IS NULL OR tp.status NOT IN ('completed', 'passed'));
    EXCEPTION WHEN OTHERS THEN
        v_pending_training := 0;
    END;

    RETURN json_build_object(
        'unreadNotifications', COALESCE(v_unread_notifications, 0),
        'pendingApprovals', 0,
        'overdueTasks', 0,
        'unreadMessages', 0,
        'pendingTraining', COALESCE(v_pending_training, 0),
        'activeGoals', 0
    );
END;
$function$;
