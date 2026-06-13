CREATE OR REPLACE FUNCTION public.dispatch_guest_review_analysis(
  p_review_id uuid,
  p_force boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/guest-review-analyzer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object(
      'review_id', p_review_id,
      'force', p_force
    ),
    timeout_milliseconds := 60000
  )
  INTO v_request_id;

  RETURN v_request_id;
END
$$;

CREATE OR REPLACE FUNCTION public.trigger_guest_review_analysis_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ai_analysis_status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.ai_analysis_status IS NOT DISTINCT FROM OLD.ai_analysis_status
     AND NEW.review_text IS NOT DISTINCT FROM OLD.review_text THEN
    RETURN NEW;
  END IF;

  PERFORM public.dispatch_guest_review_analysis(NEW.id, false);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trigger_guest_review_analysis_dispatch ON public.guest_reviews;
CREATE TRIGGER trigger_guest_review_analysis_dispatch
AFTER INSERT OR UPDATE OF ai_analysis_status, review_text ON public.guest_reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_guest_review_analysis_dispatch();

CREATE OR REPLACE FUNCTION public.dispatch_pending_guest_review_analysis(
  p_limit integer DEFAULT 25,
  p_min_age interval DEFAULT interval '2 minutes'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review record;
  v_count integer := 0;
BEGIN
  FOR v_review IN
    SELECT id
    FROM public.guest_reviews
    WHERE ai_analysis_status = 'pending'
      AND created_at <= now() - p_min_age
    ORDER BY created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 25), 100))
  LOOP
    PERFORM public.dispatch_guest_review_analysis(v_review.id, false);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END
$$;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'guest-review-analyzer-backfill';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'guest-review-analyzer-backfill',
    '*/10 * * * *',
    'select public.dispatch_pending_guest_review_analysis(25, interval ''2 minutes'');'
  );
END
$$;
