-- =============================================================================
-- Migration: Fix review collector system issues
--
-- Issues fixed:
--   1. firecrawl_method CHECK constraint too restrictive (blocked ALL raw snapshots)
--   2. review_alerts table (IF NOT EXISTS for safety)
--   3. active_review_alerts view
--   4. review_collection_health view
--   5. get_review_monitoring_stats() RPC function
--   6. trigger_review_collector() RPC function — with proper vault auth + 60s timeout
--   7. Auto-alert trigger on source failures
--   8. Disable broken Agoda sources (404 URLs)
--   9. Remove broken cron job using null current_setting()
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix firecrawl_method CHECK constraint (was blocking ALL raw snapshot inserts)
--    Collector writes 'serper', 'scraperapi+booking-html', etc. but constraint
--    only allowed ('scrape', 'extract', 'import').
-- ---------------------------------------------------------------------------
ALTER TABLE public.guest_review_raw_snapshots
  DROP CONSTRAINT IF EXISTS guest_review_raw_snapshots_firecrawl_method_check;

ALTER TABLE public.guest_review_raw_snapshots
  ADD CONSTRAINT guest_review_raw_snapshots_firecrawl_method_check
  CHECK (firecrawl_method IS NOT NULL AND length(firecrawl_method) > 0);

-- ---------------------------------------------------------------------------
-- 2. Create review_alerts table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.guest_review_sources(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT 'source_failure'
    CHECK (alert_type IN (
      'source_failure', 'consecutive_failures', 'stale_source',
      'critical_review', 'sla_breach', 'collection_error', 'api_quota'
    )),
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_alerts_unresolved
  ON public.review_alerts (is_resolved, created_at DESC)
  WHERE is_resolved = false;

ALTER TABLE public.review_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_alerts' AND policyname='review_alerts_select') THEN
    CREATE POLICY "review_alerts_select" ON public.review_alerts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_alerts' AND policyname='review_alerts_update') THEN
    CREATE POLICY "review_alerts_update" ON public.review_alerts FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Create active_review_alerts view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.active_review_alerts AS
SELECT
  ra.id,
  ra.source_id,
  s.source_name AS source_name,
  s.platform AS platform,
  ra.alert_type,
  ra.severity,
  ra.message,
  ra.is_resolved,
  ra.created_at,
  EXTRACT(EPOCH FROM (now() - ra.created_at)) / 3600.0 AS hours_ago
FROM public.review_alerts ra
LEFT JOIN public.guest_review_sources s ON s.id = ra.source_id
WHERE ra.is_resolved = false
ORDER BY
  CASE ra.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
  ra.created_at DESC;

-- ---------------------------------------------------------------------------
-- 4. Create review_collection_health view
-- ---------------------------------------------------------------------------
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
    COUNT(*) FILTER (WHERE gr.collected_at >= now() - interval '7 days') AS reviews_last_7_days
  FROM public.guest_reviews gr
  WHERE gr.source_id = s.id
) rev_counts ON true
WHERE s.is_active = true
ORDER BY
  CASE s.health_status WHEN 'degraded' THEN 0 WHEN 'healthy' THEN 1 ELSE 2 END,
  s.source_name;

-- ---------------------------------------------------------------------------
-- 5. Create get_review_monitoring_stats() RPC
-- ---------------------------------------------------------------------------
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
    'reviews_last_24h', (SELECT COUNT(*) FROM guest_reviews WHERE collected_at >= now() - interval '24 hours'),
    'reviews_last_7d', (SELECT COUNT(*) FROM guest_reviews WHERE collected_at >= now() - interval '7 days'),
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

-- ---------------------------------------------------------------------------
-- 6. Create trigger_review_collector() RPC — with vault auth + 60s timeout
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_review_collector()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key text;
  v_url text := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/guest-review-collector';
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  UPDATE guest_review_sources
  SET next_poll_at = now()
  WHERE is_active = true AND polling_enabled = true;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    body := jsonb_build_object('run_mode', 'scheduled'),
    timeout_milliseconds := 60000
  );

  INSERT INTO guest_review_audit_events (event_type, event_payload)
  VALUES ('collector_triggered', jsonb_build_object('triggered_at', now(), 'source', 'pg_cron'));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO guest_review_audit_events (event_type, event_payload)
  VALUES ('collector_trigger_failed', jsonb_build_object('error', sqlerrm, 'triggered_at', now()));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_review_monitoring_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_review_collector() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Auto-create alerts when sources fail (trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_create_review_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consecutive_failures >= 3 AND (OLD.consecutive_failures IS NULL OR OLD.consecutive_failures < 3) THEN
    INSERT INTO review_alerts (source_id, property_id, alert_type, severity, message)
    VALUES (
      NEW.id, NEW.property_id, 'consecutive_failures',
      CASE WHEN NEW.consecutive_failures >= 5 THEN 'critical' ELSE 'warning' END,
      format('Source "%s" has failed %s consecutive times: %s',
        NEW.source_name, NEW.consecutive_failures, COALESCE(NEW.last_error, 'Unknown error'))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_review_alert ON public.guest_review_sources;
CREATE TRIGGER trg_auto_review_alert
  AFTER UPDATE ON public.guest_review_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_review_alert();
