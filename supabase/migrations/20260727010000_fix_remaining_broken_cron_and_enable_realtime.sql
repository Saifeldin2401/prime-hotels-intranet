-- ============================================================================
-- MIGRATION: fix_remaining_broken_cron_and_enable_realtime
-- Found during a comprehensive infrastructure audit:
--
-- 1. Two MORE active cron jobs (5, 6) target nonexistent functions
-- (enqueue_due_audits, check_ops_sla_breaches) -- same bug class as jobs
-- 3/4/19 fixed earlier, missed in those passes. Confirmed via pg_proc lookup
-- (0 rows for both) and corroborated by hourly ERROR entries in postgres logs.
--
-- 2. The supabase_realtime publication had ZERO tables, despite 11 frontend
-- files actively using postgres_changes subscriptions. Enabled for the 12
-- tables actually subscribed to (one of which, learning_assignments, had
-- already been renamed to training_assignment_rules in an earlier
-- consolidation migration -- the frontend reference was stale; fixed in
-- src/hooks/useTraining.ts in the same commit as this migration).
-- Presence (online users) is unaffected -- it uses Realtime Presence, not
-- postgres_changes, so it never needed the publication.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

SELECT cron.unschedule(5);
SELECT cron.unschedule(6);

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.notifications,
  public.messages,
  public.requests,
  public.tasks,
  public.user_dashboard_preferences,
  public.learning_assignment_exemptions,
  public.learning_assignment_user_overrides,
  public.training_progress,
  public.profiles,
  public.documents,
  public.document_department_access,
  public.training_assignment_rules;
