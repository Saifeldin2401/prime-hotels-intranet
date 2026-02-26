-- Create task completion metrics function
CREATE OR REPLACE FUNCTION get_task_completion_metrics(
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    pending_tasks BIGINT,
    in_progress_tasks BIGINT,
    completion_rate DECIMAL,
    avg_completion_time_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*) * 100, 2)
            ELSE 0 
        END as completion_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0 THEN
                ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 2)
            ELSE NULL 
        END as avg_completion_time_hours
    FROM tasks 
    WHERE 
        (p_user_id IS NULL OR created_by = p_user_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION get_task_completion_metrics TO authenticated;;
