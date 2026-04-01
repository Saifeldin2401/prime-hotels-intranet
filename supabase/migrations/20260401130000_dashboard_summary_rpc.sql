-- Single-round-trip dashboard summary RPC to replace client-side Promise.allSettled
-- Collapses documents, training, announcements, approvals, notifications, and tasks into one request.

CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_user_id uuid,
  p_scope_property_ids uuid[],
  p_roles text[],
  p_department_ids uuid[],
  p_property_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_documents_count int;
  v_completed_training int;
  v_in_progress_training int;
  v_unread_announcements int;
  v_pending_approvals int;
  v_unread_notifications int;
  v_pending_tasks int;
BEGIN
  -- 1. Documents count (scoped to visible properties)
  SELECT COUNT(*)::int INTO v_documents_count
  FROM documents
  WHERE status = 'PUBLISHED'
    AND is_deleted = false
    AND (
      COALESCE(array_length(p_scope_property_ids, 1), 0) = 0
      OR property_id = ANY(p_scope_property_ids)
    );

  -- 2. Training progress for this user
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed')::int,
    COUNT(*) FILTER (WHERE status = 'in_progress')::int
  INTO v_completed_training, v_in_progress_training
  FROM learning_progress
  WHERE user_id = p_user_id
    AND content_type = 'module'
    AND (is_deleted IS NULL OR is_deleted = false);

  -- 3 & 4. Announcements visible to this user (recent 100), minus reads
  WITH visible_announcements AS (
    SELECT a.id, a.created_by
    FROM announcements a
    WHERE a.created_at > NOW() - INTERVAL '90 days'
      AND (
        a.created_by = p_user_id
        OR a.target_audience IS NULL
        OR (a.target_audience->>'type') = 'all'
        OR (
          (a.target_audience->>'type') = 'role'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v = ANY(p_roles)
          )
        )
        OR (
          (a.target_audience->>'type') = 'department'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = ANY(p_department_ids)
          )
        )
        OR (
          (a.target_audience->>'type') = 'property'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = ANY(p_property_ids)
          )
        )
        OR (
          (a.target_audience->>'type') = 'individual'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = p_user_id
          )
        )
      )
    ORDER BY a.created_at DESC
    LIMIT 100
  )
  SELECT COUNT(*)::int INTO v_unread_announcements
  FROM visible_announcements va
  WHERE NOT EXISTS (
    SELECT 1 FROM announcement_reads ar
    WHERE ar.announcement_id = va.id AND ar.user_id = p_user_id
  );

  -- 5, 6, 7. Pending approvals (workflow + documents + legacy)
  SELECT (
    (SELECT COUNT(*)::int FROM requests WHERE current_assignee_id = p_user_id AND status IN ('pending_supervisor_approval', 'pending_hr_review'))
    +
    (SELECT COUNT(*)::int FROM document_approvals WHERE approver_id = p_user_id AND status = 'pending' AND is_active = true)
    +
    (SELECT COUNT(*)::int FROM approval_requests WHERE current_approver_id = p_user_id AND status = 'pending')
  ) INTO v_pending_approvals;

  -- 8. Unread notifications
  SELECT COUNT(*)::int INTO v_unread_notifications
  FROM notifications
  WHERE user_id = p_user_id AND read_at IS NULL;

  -- 9. Pending tasks (scoped to visible properties)
  SELECT COUNT(*)::int INTO v_pending_tasks
  FROM tasks
  WHERE assigned_to_id = p_user_id
    AND status IN ('open', 'todo', 'in_progress', 'pending')
    AND (
      COALESCE(array_length(p_scope_property_ids, 1), 0) = 0
      OR property_id = ANY(p_scope_property_ids)
    );

  RETURN jsonb_build_object(
    'documentsCount', v_documents_count,
    'completedTraining', v_completed_training,
    'inProgressTraining', v_in_progress_training,
    'unreadAnnouncements', v_unread_announcements,
    'pendingApprovals', v_pending_approvals,
    'unreadNotifications', v_unread_notifications,
    'pendingTasks', v_pending_tasks
  );
END;
$$;
