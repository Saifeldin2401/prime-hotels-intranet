-- ============================================================================
-- MIGRATION: revoke_remaining_unnecessary_anon_execute_grants
-- create_request_for_invoice() and find_finance_approver() (added by the
-- Finance module build, 20260727012727_add_finance_module.sql) were left
-- executable by PUBLIC/anon by Postgres's implicit default -- same class of
-- oversight caught repeatedly this session. Neither has any legitimate
-- pre-auth caller: create_request_for_invoice is only ever invoked by the
-- invoice-insert trigger (SECURITY DEFINER, runs as the trigger owner
-- regardless of caller grants), and find_finance_approver is only called by
-- that same trigger's internal logic. Revoked anon/public execute; left
-- `authenticated` on find_finance_approver since it doesn't touch anything
-- caller-specific and the frontend approval-workflow UI reads its result
-- indirectly through the request/request_steps tables it populates.
--
-- Reconstructed from live grant state for local drift-tracking -- the
-- original apply_migration call was made in a portion of this session that
-- was summarized before this file could be written; verified to match
-- current live grants exactly (see routine_privileges check below).
--
-- Applied live via Supabase MCP apply_migration; this file mirrors it.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.create_request_for_invoice() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_request_for_invoice() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_request_for_invoice() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.find_finance_approver(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_finance_approver(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_finance_approver(uuid) TO authenticated;
