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

SELECT cron.schedule(
  'guest-review-notifier-retry',
  '*/10 * * * *',
  $cmd$
  select net.http_post(
    url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/guest-review-notifier',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
    ),
    body:='{"batch_size":50}'::jsonb,
    timeout_milliseconds:=45000
  ) as request_id;
  $cmd$
);
