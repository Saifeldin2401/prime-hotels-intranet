-- Admin analytics RPCs expected by useAnalyticsStats. Admin-guarded; aggregate
-- over analytics_events + user_sessions. Shapes match the frontend contract.

CREATE OR REPLACE FUNCTION public.get_analytics_summary()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_regional_admin_or_higher((SELECT auth.uid())) THEN
    RETURN json_build_object('active_now',0,'active_today',0,'sessions_today',0);
  END IF;
  RETURN json_build_object(
    'active_now', (SELECT count(DISTINCT user_id) FROM user_sessions
                   WHERE last_active_at > now() - interval '5 minutes'
                     AND revoked_at IS NULL AND expires_at > now()),
    'active_today', (SELECT count(DISTINCT user_id) FROM analytics_events
                     WHERE "timestamp" >= date_trunc('day', now())),
    'sessions_today', (SELECT count(*) FROM user_sessions
                       WHERE created_at >= date_trunc('day', now()))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_ago integer DEFAULT 30)
 RETURNS TABLE(date date, active_users bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_regional_admin_or_higher((SELECT auth.uid())) THEN RETURN; END IF;
  RETURN QUERY
  SELECT g::date AS date, count(DISTINCT ae.user_id) AS active_users
  FROM generate_series(current_date - GREATEST(days_ago - 1, 0), current_date, interval '1 day') g
  LEFT JOIN analytics_events ae ON ae."timestamp"::date = g::date
  GROUP BY g::date ORDER BY g::date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_events(limit_count integer DEFAULT 10)
 RETURNS TABLE(event_name text, count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_regional_admin_or_higher((SELECT auth.uid())) THEN RETURN; END IF;
  RETURN QUERY
  SELECT ae.event_name, count(*) AS count
  FROM analytics_events ae
  GROUP BY ae.event_name ORDER BY count(*) DESC
  LIMIT GREATEST(limit_count, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_search_metrics(days_ago integer DEFAULT 30)
 RETURNS TABLE(total_searches bigint, zero_results_count bigint, avg_results_count numeric, top_queries json)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_regional_admin_or_higher((SELECT auth.uid())) THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::numeric, '[]'::json; RETURN;
  END IF;
  RETURN QUERY
  WITH s AS (
    SELECT properties->>'query' AS q, NULLIF(properties->>'results_count','')::int AS rc
    FROM analytics_events
    WHERE (event_name ILIKE 'search%' OR category = 'search')
      AND "timestamp" > now() - (days_ago || ' days')::interval
  )
  SELECT count(*)::bigint,
         count(*) FILTER (WHERE rc = 0)::bigint,
         COALESCE(round(avg(rc), 2), 0)::numeric,
         COALESCE((SELECT json_agg(json_build_object('query', q, 'count', c))
                   FROM (SELECT q, count(*) c FROM s WHERE q IS NOT NULL GROUP BY q ORDER BY count(*) DESC LIMIT 10) t),
                  '[]'::json)
  FROM s;
END;
$$;
