-- The AI-ops edge functions (ai-optimizer / ai-policy-applier / ai-safety-validator /
-- ai-metrics-collector / ai-rollback-engine / ai-admin) are being deleted — they were
-- dormant (depended on tables that only ever existed in migrations/archive/, no caller).
-- Their cron jobs are already inactive; unschedule them so nothing references the
-- deleted functions.
DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'ai-optimizer-job','ai-safety-validator-job','ai-policy-applier-job',
    'ai-rollback-engine-job','ai-metrics-collector-job'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;
