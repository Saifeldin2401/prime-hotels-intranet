-- Create get_task_stats function for dashboard analytics
CREATE OR REPLACE FUNCTION get_task_stats(
  _property_id UUID DEFAULT NULL,
  _department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
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
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::BIGINT as overdue_tasks,
    COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::BIGINT as high_priority_tasks
  FROM tasks
  WHERE
    (_property_id IS NULL OR property_id = _property_id)
    AND
    (_department_id IS NULL OR department_id = _department_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_stats(UUID, UUID) TO service_role;
