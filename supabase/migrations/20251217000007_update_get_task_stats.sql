-- Drop the previous function if it exists with different signature
DROP FUNCTION IF EXISTS get_task_stats(UUID, UUID);

-- Create get_task_stats function matching frontend expectations
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_stats(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_stats(UUID, UUID, UUID) TO service_role;
