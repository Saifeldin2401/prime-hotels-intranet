UPDATE public.properties
SET city = 'Riyadh'
WHERE property_code = 'RUH-QURTUBA'
  AND address ILIKE '%Riyadh%';

CREATE OR REPLACE FUNCTION public.enforce_guest_review_source_reliability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.platform NOT IN ('booking', 'google', 'agoda') THEN
    NEW.is_active := false;
    NEW.polling_enabled := false;
    NEW.health_status := 'disabled';
    NEW.last_error := format('Disabled: unsupported on current reliable collector (%s)', NEW.platform);
    RETURN NEW;
  END IF;

  IF NEW.is_active AND NEW.polling_enabled AND coalesce(nullif(btrim(NEW.source_url), ''), '') = '' THEN
    RAISE EXCEPTION 'source_url is required for an active polling guest review source';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trigger_enforce_guest_review_source_reliability ON public.guest_review_sources;
CREATE TRIGGER trigger_enforce_guest_review_source_reliability
BEFORE INSERT OR UPDATE ON public.guest_review_sources
FOR EACH ROW
EXECUTE FUNCTION public.enforce_guest_review_source_reliability();

CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_review_sources_active_supported
  ON public.guest_review_sources(property_id, platform)
  WHERE is_active = true
    AND polling_enabled = true
    AND platform IN ('booking', 'google', 'agoda');

UPDATE public.guest_review_sources
SET is_active = false,
    polling_enabled = false,
    health_status = 'disabled',
    last_error = format('Disabled: unsupported on current reliable collector (%s)', platform)
WHERE platform NOT IN ('booking', 'google', 'agoda');

UPDATE public.guest_review_sources
SET is_active = true,
    polling_enabled = true,
    poll_frequency_hours = 1,
    next_poll_at = now(),
    health_status = 'healthy',
    last_error = null,
    firecrawl_extract_schema = jsonb_build_object(
      'cid', '13064073539498196141',
      'search_query', 'Prime Al Corniche Hotel Jeddah Saudi Arabia'
    )
WHERE id = '62cceb08-c1da-4902-bbea-6e699a505bc1';

UPDATE public.guest_review_sources
SET poll_frequency_hours = 1,
    next_poll_at = now(),
    health_status = 'healthy',
    last_error = null
WHERE is_active = true
  AND polling_enabled = true
  AND platform IN ('booking', 'google', 'agoda');

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'guest-review-collector';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'guest-review-collector',
    '*/15 * * * *',
    $cmd$
    select net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/guest-review-collector',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
      ),
      body:='{"run_mode":"scheduled"}'::jsonb,
      timeout_milliseconds:=60000
    ) as request_id;
    $cmd$
  );
END
$$;
