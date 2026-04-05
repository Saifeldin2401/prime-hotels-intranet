-- ============================================================
-- PENDING GUEST REVIEW MIGRATIONS - April 5, 2026
-- Run this in the Supabase SQL Editor for project: htsvjfrofcpkfzvjpwvx
-- ============================================================

-- ============================================================
-- MIGRATION 1: Analysis State Guard (20260405143000)
-- Prevents stale writers from resetting analyzed reviews back to 'pending'
-- ============================================================

-- Create the trigger function to preserve analysis state on refresh
CREATE OR REPLACE FUNCTION public.preserve_guest_review_analysis_state_on_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_fingerprint jsonb;
  new_fingerprint jsonb;
BEGIN
  old_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(OLD.review_url), ''),
    'reviewer_name', coalesce(trim(OLD.reviewer_name), ''),
    'review_title', coalesce(trim(OLD.review_title), ''),
    'review_text', coalesce(trim(OLD.review_text), ''),
    'review_text_normalized', coalesce(trim(OLD.review_text_normalized), ''),
    'review_language', coalesce(trim(OLD.review_language), ''),
    'rating_normalized_10', OLD.rating_normalized_10,
    'published_at', OLD.published_at
  );

  new_fingerprint := jsonb_build_object(
    'review_url', coalesce(trim(NEW.review_url), ''),
    'reviewer_name', coalesce(trim(NEW.reviewer_name), ''),
    'review_title', coalesce(trim(NEW.review_title), ''),
    'review_text', coalesce(trim(NEW.review_text), ''),
    'review_text_normalized', coalesce(trim(NEW.review_text_normalized), ''),
    'review_language', coalesce(trim(NEW.review_language), ''),
    'rating_normalized_10', NEW.rating_normalized_10,
    'published_at', NEW.published_at
  );

  IF NEW.ai_analysis_status = 'pending'
    AND old_fingerprint = new_fingerprint
    AND coalesce(OLD.ai_analysis_status, '') <> ''
  THEN
    NEW.ai_analysis_status := OLD.ai_analysis_status;
    NEW.status := coalesce(OLD.status, NEW.status, 'collected');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_preserve_guest_review_analysis_state_on_refresh ON public.guest_reviews;

-- Create the trigger
CREATE TRIGGER trigger_preserve_guest_review_analysis_state_on_refresh
BEFORE UPDATE ON public.guest_reviews
FOR EACH ROW
EXECUTE FUNCTION public.preserve_guest_review_analysis_state_on_refresh();

-- ============================================================
-- MIGRATION 2: Notifier Cron Hardening (20260405144000)
-- Force-schedules notifier cron with explicit service-role header
-- ============================================================

-- Unschedule existing job if present
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'guest-review-notifier-retry';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END
$$;

-- Schedule the notifier cron job with proper authorization
SELECT cron.schedule(
  'guest-review-notifier-retry',
  '*/10 * * * *',
  $cmd$
  select net.http_post(
    url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/guest-review-notifier',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
    ),
    body:='{"batch_size":50}'::jsonb,
    timeout_milliseconds:=45000
  ) as request_id;
  $cmd$
);

-- ============================================================
-- VERIFICATION QUERIES (run these after to confirm)
-- ============================================================

-- Check trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_preserve_guest_review_analysis_state_on_refresh';

-- Check cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'guest-review-notifier-retry';

-- ============================================================
-- STATUS: Both migrations applied
-- - Analysis state guard: ACTIVE (prevents stale review resets)
-- - Notifier cron: ACTIVE (runs every 10 minutes with service-role auth)
-- ============================================================
