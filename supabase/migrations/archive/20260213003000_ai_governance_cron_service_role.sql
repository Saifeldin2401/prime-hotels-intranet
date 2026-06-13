-- Update AI Governance Cron Schedules to use service role JWT auth

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-metrics-collector-job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-metrics-collector-job';
  END IF;

  PERFORM cron.schedule(
    'ai-metrics-collector-job',
    '0 * * * *',
    $cron$
    select
      net.http_post(
        url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-metrics-collector',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        )
      ) as request_id;
    $cron$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-optimizer-job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-optimizer-job';
  END IF;

  PERFORM cron.schedule(
    'ai-optimizer-job',
    '0 2 * * *',
    $cron$
    select
      net.http_post(
        url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-optimizer',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        )
      ) as request_id;
    $cron$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-safety-validator-job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-safety-validator-job';
  END IF;

  PERFORM cron.schedule(
    'ai-safety-validator-job',
    '5 2 * * *',
    $cron$
    select
      net.http_post(
        url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-safety-validator',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        )
      ) as request_id;
    $cron$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-policy-applier-job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-policy-applier-job';
  END IF;

  PERFORM cron.schedule(
    'ai-policy-applier-job',
    '10 2 * * *',
    $cron$
    select
      net.http_post(
        url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-policy-applier',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        ),
        body:='{"apply_all": true}'::jsonb
      ) as request_id;
    $cron$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-rollback-engine-job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-rollback-engine-job';
  END IF;

  PERFORM cron.schedule(
    'ai-rollback-engine-job',
    '20 * * * *',
    $cron$
    select
      net.http_post(
        url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-rollback-engine',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        )
      ) as request_id;
    $cron$
  );
END;
$$;
