-- Secure get_task_stats with scope validation
DROP FUNCTION IF EXISTS get_task_stats(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION get_task_stats(
  user_id_param UUID DEFAULT NULL,
  property_id_param UUID DEFAULT NULL,
  department_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  overdue_tasks BIGINT,
  high_priority_tasks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate property scope access
  IF property_id_param IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() AND property_id = property_id_param
    ) AND NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    ) THEN
      RAISE EXCEPTION 'Access denied to property statistics scope';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'completed')::BIGINT as pending_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::BIGINT as overdue_tasks,
    COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::BIGINT as high_priority_tasks
  FROM tasks
  WHERE
    (user_id_param IS NULL OR assigned_to_id = user_id_param)
    AND
    (property_id_param IS NULL OR property_id = property_id_param)
    AND
    (department_id_param IS NULL OR department_id = department_id_param)
    AND
    is_deleted = false;
END;
$$;

-- Secure get_dashboard_stats with scope validation
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_uuid UUID)
RETURNS TABLE (
    pending_tasks BIGINT,
    completed_training BIGINT,
    in_progress_training BIGINT,
    unread_announcements BIGINT,
    pending_approvals BIGINT,
    unread_notifications BIGINT,
    next_shift_date DATE,
    next_shift_start TIME,
    vacation_remaining DECIMAL
) AS $$
BEGIN
  -- Validate user scope access
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
      -- Tasks
      COALESCE((
          SELECT COUNT(*) FROM tasks 
          WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')
      ), 0),
      -- Training
      COALESCE((
          SELECT COUNT(*) FROM training_progress 
          WHERE user_id = user_uuid AND status = 'completed'
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM training_progress 
          WHERE user_id = user_uuid AND status = 'in_progress'
      ), 0),
      -- Announcements
      COALESCE((
          SELECT COUNT(*) FROM announcements a
          WHERE a.created_at > now() - interval '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM announcement_reads ar 
              WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid
          )
      ), 0),
      -- Approvals
      COALESCE((
          SELECT COUNT(*) FROM approval_requests 
          WHERE current_approver_id = user_uuid AND status = 'pending'
      ), 0),
      -- Notifications
      COALESCE((
          SELECT COUNT(*) FROM notifications 
          WHERE user_id = user_uuid AND read_at IS NULL
      ), 0),
      -- Next shift
      (SELECT shift_date FROM user_shifts 
       WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
       ORDER BY shift_date, start_time LIMIT 1),
      (SELECT start_time FROM user_shifts 
       WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
       ORDER BY shift_date, start_time LIMIT 1),
      -- Vacation
      COALESCE((
          SELECT (total_days + carried_over - used_days - pending_days)
          FROM user_vacation_balance 
          WHERE user_id = user_uuid AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_task_stats(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
