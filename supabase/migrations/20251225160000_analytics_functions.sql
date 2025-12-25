-- Migration: Analytics Aggregation Functions
-- Description: RPCs to support the Admin Analytics Dashboard

-- 1. Get Daily Active Users (DAU) Trend
CREATE OR REPLACE FUNCTION get_daily_active_users(days_ago INT DEFAULT 30)
RETURNS TABLE (
    date DATE,
    active_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(timestamp) as date, 
        COUNT(DISTINCT user_id) as active_users
    FROM analytics_events
    WHERE timestamp > NOW() - (days_ago || ' days')::INTERVAL
    GROUP BY DATE(timestamp)
    ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Top Events
CREATE OR REPLACE FUNCTION get_top_events(limit_count INT DEFAULT 10)
RETURNS TABLE (
    event_name TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.event_name, 
        COUNT(*) as count
    FROM analytics_events ae
    GROUP BY ae.event_name
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Search Metrics
CREATE OR REPLACE FUNCTION get_search_metrics(days_ago INT DEFAULT 30)
RETURNS TABLE (
    total_searches BIGINT,
    zero_results_count BIGINT,
    avg_results_count NUMERIC,
    top_queries JSONB
) AS $$
DECLARE
    total BIGINT;
    zero_res BIGINT;
    avg_res NUMERIC;
    queries JSONB;
BEGIN
    SELECT COUNT(*) INTO total FROM search_analytics WHERE timestamp > NOW() - (days_ago || ' days')::INTERVAL;
    SELECT COUNT(*) INTO zero_res FROM search_analytics WHERE results_count = 0 AND timestamp > NOW() - (days_ago || ' days')::INTERVAL;
    SELECT AVG(results_count) INTO avg_res FROM search_analytics WHERE timestamp > NOW() - (days_ago || ' days')::INTERVAL;
    
    SELECT jsonb_agg(t) INTO queries FROM (
        SELECT query, count(*) as count 
        FROM search_analytics 
        WHERE timestamp > NOW() - (days_ago || ' days')::INTERVAL
        GROUP BY query 
        ORDER BY count DESC 
        LIMIT 10
    ) t;

    RETURN QUERY SELECT total, zero_res, COALESCE(avg_res, 0), COALESCE(queries, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Analytics Summary (Executive Pulse)
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS JSONB AS $$
DECLARE
    active_now INT;
    active_today INT;
    total_sessions_today INT;
BEGIN
    -- Active in last 15 mins
    SELECT COUNT(DISTINCT user_id) INTO active_now 
    FROM user_sessions 
    WHERE last_active_at > NOW() - INTERVAL '15 minutes';

    -- Active Today
    SELECT COUNT(DISTINCT user_id) INTO active_today 
    FROM user_sessions 
    WHERE last_active_at > CURRENT_DATE;

    -- Sessions Today
    SELECT COUNT(*) INTO total_sessions_today 
    FROM user_sessions 
    WHERE started_at > CURRENT_DATE;

    RETURN jsonb_build_object(
        'active_now', active_now,
        'active_today', active_today,
        'sessions_today', total_sessions_today
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to property_manager and above
GRANT EXECUTE ON FUNCTION get_daily_active_users(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_events(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_metrics(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO authenticated;
