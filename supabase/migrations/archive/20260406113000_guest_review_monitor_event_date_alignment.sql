CREATE OR REPLACE VIEW public.review_collection_health AS
SELECT
  s.id,
  s.source_name,
  s.platform,
  s.is_active,
  s.polling_enabled,
  s.health_status,
  s.consecutive_failures,
  s.last_success_at,
  s.last_polled_at,
  s.next_poll_at,
  s.last_error,
  COALESCE(rev_counts.total_reviews, 0) AS total_reviews,
  COALESCE(rev_counts.reviews_last_7_days, 0) AS reviews_last_7_days,
  CASE
    WHEN s.health_status = 'degraded' OR s.consecutive_failures >= 3 THEN 'degraded'
    WHEN s.is_active = false OR s.polling_enabled = false THEN 'disabled'
    WHEN s.last_success_at IS NULL THEN 'new'
    WHEN s.last_success_at < now() - interval '48 hours' THEN 'stale'
    ELSE 'healthy'
  END AS operational_status
FROM public.guest_review_sources s
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_reviews,
    COUNT(*) FILTER (
      WHERE COALESCE(gr.published_at, gr.collected_at, gr.created_at) >= now() - interval '7 days'
    ) AS reviews_last_7_days
  FROM public.guest_reviews gr
  WHERE gr.source_id = s.id
) rev_counts ON true
WHERE s.is_active = true
ORDER BY
  CASE s.health_status WHEN 'degraded' THEN 0 WHEN 'healthy' THEN 1 ELSE 2 END,
  s.source_name;

CREATE OR REPLACE FUNCTION public.get_review_monitoring_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sources', (SELECT COUNT(*) FROM guest_review_sources WHERE is_active = true),
    'healthy_sources', (SELECT COUNT(*) FROM guest_review_sources WHERE is_active = true AND health_status = 'healthy' AND consecutive_failures < 3),
    'degraded_sources', (SELECT COUNT(*) FROM guest_review_sources WHERE is_active = true AND (health_status = 'degraded' OR consecutive_failures >= 3)),
    'total_reviews', (SELECT COUNT(*) FROM guest_reviews),
    'reviews_last_24h', (
      SELECT COUNT(*)
      FROM guest_reviews
      WHERE COALESCE(published_at, collected_at, created_at) >= now() - interval '24 hours'
    ),
    'reviews_last_7d', (
      SELECT COUNT(*)
      FROM guest_reviews
      WHERE COALESCE(published_at, collected_at, created_at) >= now() - interval '7 days'
    ),
    'pending_analysis', (SELECT COUNT(*) FROM guest_reviews WHERE ai_analysis_status = 'pending'),
    'critical_reviews', (SELECT COUNT(*) FROM guest_reviews WHERE severity = 'critical' AND status NOT IN ('responded', 'closed')),
    'last_collection', (SELECT MAX(last_success_at)::text FROM guest_review_sources),
    'next_scheduled', (SELECT MIN(next_poll_at)::text FROM guest_review_sources WHERE is_active = true AND polling_enabled = true AND next_poll_at > now()),
    'stale_sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', source_name,
        'hours', EXTRACT(EPOCH FROM (now() - last_success_at)) / 3600.0
      )), '[]'::jsonb)
      FROM guest_review_sources
      WHERE is_active = true AND last_success_at IS NOT NULL AND last_success_at < now() - interval '48 hours'
    )
  ) INTO result;

  RETURN result;
END;
$$;
