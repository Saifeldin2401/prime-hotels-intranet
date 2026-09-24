-- ============================================================================
-- MIGRATION: fix_duplicate_triggers_and_indexes
-- Follow-up to the audit report -- the report's specific trigger claims were
-- mostly wrong (multiple triggers on training_progress/maintenance_tickets/
-- certificates are legitimately distinct, not duplicates). A rigorous
-- system-wide query (group by table+function+event-type) found the real
-- duplicates instead, including one genuine bug the report never caught:
-- leave_requests had TWO identical AFTER INSERT triggers both calling
-- create_request_for_leave_request(), which has no idempotency check --
-- every leave request would have created two parallel approval-workflow
-- chains (one orphaned). Table has 0 rows today, so no data repair needed.
-- Also drops 9 confirmed duplicate indexes (verified via exact column-set
-- match, each pairing a real unique-constraint index with a fully redundant
-- plain index on the identical columns) -- distinct from the report's vague
-- "70+ unused indexes" claim, most of which were false-positive noise from
-- a prior session's newly-created empty tables.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

-- Duplicate triggers (verified via pg_trigger grouped by tgrelid+tgfoid+tgtype,
-- confirming byte-identical event/timing/function, not just similar names).
DROP TRIGGER IF EXISTS leave_request_workflow_trigger ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;

-- Duplicate indexes (each verified: the dropped one is a plain btree fully
-- covered by a UNIQUE/PK index on the identical column set; the constraint-
-- backing index is kept in every case, so no uniqueness guarantee is lost).
DROP INDEX IF EXISTS public.attendance_employee_date_idx;
DROP INDEX IF EXISTS public.idx_document_tag_assignments_lookup;
DROP INDEX IF EXISTS public.idx_hospitality_news_guid;
DROP INDEX IF EXISTS public.idx_mfa_secrets_user_id;
DROP INDEX IF EXISTS public.idx__a8669dcff4a5;
DROP INDEX IF EXISTS public.idx_shifts_user_time;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_user_id;
DROP INDEX IF EXISTS public.idx__46a3df848614;
DROP INDEX IF EXISTS public.idx__90ea59989f01;
