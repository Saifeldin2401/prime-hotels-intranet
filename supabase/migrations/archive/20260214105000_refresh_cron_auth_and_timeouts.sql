-- Refresh scheduled Edge Function jobs to:
-- 1) Use Vault-backed service role token headers (no hardcoded tokens)
-- 2) Increase HTTP timeout to reduce false timeout responses in net._http_response

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" is required for cron Edge Function auth.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._reset_edge_http_cron_job(
  p_job_name text,
  p_schedule text,
  p_function_slug text,
  p_timeout_ms integer DEFAULT 30000,
  p_body jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
  v_url text;
  v_command text;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  v_url := format('https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/%s', p_function_slug);

  v_command := format(
$cmd$
select net.http_post(
  url:=%L,
  headers:=jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
  ),
  timeout_milliseconds:=%s%s
) as request_id;
$cmd$,
    v_url,
    p_timeout_ms,
    CASE
      WHEN p_body IS NULL THEN ''
      ELSE format(', body:=%L::jsonb', p_body::text)
    END
  );

  PERFORM cron.schedule(p_job_name, p_schedule, v_command);
END;
$$;

SELECT public._reset_edge_http_cron_job('daily-workflows-job', '0 9 * * *', 'daily-workflows', 30000);
SELECT public._reset_edge_http_cron_job('approval-escalation-job', '0 */6 * * *', 'approval-escalation', 30000);
SELECT public._reset_edge_http_cron_job('preventive-maintenance-job', '0 0 * * *', 'preventive-maintenance', 30000);
SELECT public._reset_edge_http_cron_job('training-notifications-job', '0 8 * * *', 'training-notifications', 30000);
SELECT public._reset_edge_http_cron_job('weekly-manager-report-job', '0 8 * * 1', 'weekly-manager-report', 30000);
SELECT public._reset_edge_http_cron_job('recurring-tasks-job', '0 0 * * *', 'generate-template-tasks', 30000);
SELECT public._reset_edge_http_cron_job('fetch-news-every-6-hours', '0 */6 * * *', 'fetch-news', 30000, '{}'::jsonb);

SELECT public._reset_edge_http_cron_job('ai-metrics-collector-job', '0 * * * *', 'ai-metrics-collector', 30000);
SELECT public._reset_edge_http_cron_job('ai-optimizer-job', '0 2 * * *', 'ai-optimizer', 30000);
SELECT public._reset_edge_http_cron_job('ai-safety-validator-job', '5 2 * * *', 'ai-safety-validator', 30000);
SELECT public._reset_edge_http_cron_job('ai-policy-applier-job', '10 2 * * *', 'ai-policy-applier', 30000, '{"apply_all": true}'::jsonb);
SELECT public._reset_edge_http_cron_job('ai-rollback-engine-job', '20 * * * *', 'ai-rollback-engine', 30000);
SELECT public._reset_edge_http_cron_job('ai-daily-report-job', '0 6 * * *', 'ai-daily-report', 30000);

DROP FUNCTION public._reset_edge_http_cron_job(text, text, text, integer, jsonb);
