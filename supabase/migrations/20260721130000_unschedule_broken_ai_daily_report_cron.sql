-- ============================================================================
-- MIGRATION: unschedule_broken_ai_daily_report_cron
-- jobid 19 targeted public.ai_daily_report(), which does not exist (same bug
-- class as jobids 3/4 fixed in the prior migration). It was already disabled
-- (active=false) so it wasn't actively erroring, but left scheduled it's a
-- landmine if ever re-enabled without noticing the missing function.
--
-- Applied live via Supabase MCP execute_sql on 2026-07-27 (not apply_migration,
-- so no live-stamped version exists for this one -- this file exists purely
-- to close the repo/live drift gap for the change).
-- ============================================================================

SELECT cron.unschedule(19);
