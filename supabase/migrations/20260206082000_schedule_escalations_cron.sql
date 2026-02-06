-- Schedule escalation checks via pg_cron

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Remove existing job with same name if present
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-escalations') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'check-escalations';
  END IF;

  -- Run hourly
  PERFORM cron.schedule(
    'check-escalations',
    '0 * * * *',
    $cron$SELECT public.check_and_escalate_approvals();$cron$
  );
END;
$$;
