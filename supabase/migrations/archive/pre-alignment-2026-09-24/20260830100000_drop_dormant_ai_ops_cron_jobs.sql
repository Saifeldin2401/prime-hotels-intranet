-- ============================================================================
-- Remove the dormant AI-ops automation
-- ----------------------------------------------------------------------------
-- The autonomous AI-governance edge functions (ai-optimizer, ai-policy-applier,
-- ai-safety-validator, ai-metrics-collector, ai-rollback-engine, ai-admin) have
-- been deleted. They were never wired up: the tables they needed
-- (ai_policy_sets, ai_proposals, ai_decisions, ai_metrics_snapshots, …) only
-- ever existed in migrations/archive/ and were never applied to any live
-- project, and nothing in the frontend called them.
--
-- AI routing is now governed by ai_platform_config + the ai_providers /
-- ai_models registry and the get_ai_routing_plan() / set_ai_provider_health()
-- RPCs (see 20260829200707 / 20260829200921).
--
-- Their cron jobs were already inactive; this unschedules them so nothing
-- references the deleted functions.
-- ============================================================================

DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'ai-optimizer-job',
    'ai-safety-validator-job',
    'ai-policy-applier-job',
    'ai-rollback-engine-job',
    'ai-metrics-collector-job'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;
