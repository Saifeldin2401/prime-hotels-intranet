
-- get_dashboard_summary crashed on EVERY call for EVERY authenticated user -- it
-- unconditionally selected from user_departments and user_properties (dropped tables),
-- and its pending-approvals count also summed from `requests` and `approval_requests`,
-- neither of which exist (requests was never built; approval_requests belongs to the
-- "Universal Action Registry" that never shipped, per this session's earlier findings).
-- Only document_approvals is real. Rewritten against organization_memberships
-- (department_id/hotel_id), which is the current source of truth for both.
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := (select auth.uid());
  v_roles text[];
  v_department_ids uuid[];
  v_property_ids uuid[];
  v_scope_property_ids uuid[];
  v_documents_count int; v_completed_training int; v_in_progress_training int;
  v_unread_announcements int; v_pending_approvals int; v_unread_notifications int; v_pending_tasks int;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('documentsCount',0,'completedTraining',0,'inProgressTraining',0,
      'unreadAnnouncements',0,'pendingApprovals',0,'unreadNotifications',0,'pendingTasks',0);
  END IF;

  IF p_user_id IS DISTINCT FROM v_caller AND NOT public.is_hr_or_admin(v_caller) THEN
    RAISE EXCEPTION 'Unauthorized: can only view your own dashboard summary';
  END IF;

  v_roles := ARRAY(SELECT role::text FROM public.user_roles WHERE user_id = p_user_id);
  v_department_ids := ARRAY(
    SELECT department_id FROM public.organization_memberships
    WHERE user_id = p_user_id AND is_active = true AND department_id IS NOT NULL
  );
  v_property_ids := ARRAY(
    SELECT hotel_id FROM public.organization_memberships
    WHERE user_id = p_user_id AND is_active = true AND hotel_id IS NOT NULL
  );
  -- Only trust caller-supplied scope entries the target user actually has access to.
  v_scope_property_ids := ARRAY(
    SELECT pid FROM unnest(coalesce(p_scope_property_ids, ARRAY[]::uuid[])) pid
    WHERE public.has_property_access(p_user_id, pid)
  );

  SELECT COUNT(*)::int INTO v_documents_count FROM documents
  WHERE status = 'PUBLISHED' AND is_deleted = false
    AND (COALESCE(array_length(v_scope_property_ids,1),0)=0 OR property_id = ANY(v_scope_property_ids));

  SELECT COUNT(*) FILTER (WHERE status = 'completed')::int, COUNT(*) FILTER (WHERE status = 'in_progress')::int
  INTO v_completed_training, v_in_progress_training
  FROM learning_progress_v
  WHERE user_id = p_user_id AND content_type = 'module' AND (is_deleted IS NULL OR is_deleted = false);

  WITH visible_announcements AS (
    SELECT a.id, a.created_by FROM announcements a
    WHERE a.created_at > NOW() - INTERVAL '90 days'
      AND (a.created_by = p_user_id OR a.target_audience IS NULL OR (a.target_audience->>'type')='all'
        OR ((a.target_audience->>'type')='role' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v = ANY(v_roles)))
        OR ((a.target_audience->>'type')='department' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = ANY(v_department_ids)))
        OR ((a.target_audience->>'type')='property' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = ANY(v_property_ids)))
        OR ((a.target_audience->>'type')='individual' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v WHERE v::uuid = p_user_id)))
    ORDER BY a.created_at DESC LIMIT 100)
  SELECT COUNT(*)::int INTO v_unread_announcements FROM visible_announcements va
  WHERE NOT EXISTS (SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = va.id AND ar.user_id = p_user_id);

  SELECT COUNT(*)::int INTO v_pending_approvals FROM document_approvals
  WHERE approver_id = p_user_id AND status='pending' AND is_active=true;

  SELECT COUNT(*)::int INTO v_unread_notifications FROM notifications WHERE user_id = p_user_id AND read_at IS NULL;

  SELECT COUNT(*)::int INTO v_pending_tasks FROM tasks
  WHERE assigned_to_id = p_user_id AND status IN ('open','todo','in_progress','pending')
    AND (COALESCE(array_length(v_scope_property_ids,1),0)=0 OR property_id = ANY(v_scope_property_ids));

  RETURN jsonb_build_object('documentsCount',v_documents_count,'completedTraining',v_completed_training,
    'inProgressTraining',v_in_progress_training,'unreadAnnouncements',v_unread_announcements,
    'pendingApprovals',v_pending_approvals,'unreadNotifications',v_unread_notifications,'pendingTasks',v_pending_tasks);
END;
$function$;
