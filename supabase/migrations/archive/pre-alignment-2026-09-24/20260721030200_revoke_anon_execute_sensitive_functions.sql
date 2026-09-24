-- =============================================================================
-- Security hardening: revoke anon EXECUTE on SECURITY DEFINER functions that
-- require an authenticated session but had no role-scoped GRANT
-- =============================================================================
-- All 10 functions below internally gate on (SELECT auth.uid()) or a
-- role-membership check (has_any_role / is_regional_admin_or_higher /
-- is_hr_or_admin / has_role_optimized / ownership-vs-auth.uid() comparison).
-- For an anon (pre-auth) caller, auth.uid() is NULL, so every one of these
-- checks already fails closed today — anon execution is a no-op in practice.
--
-- None of them accept a token/secret parameter (the legitimate anon-callable
-- pattern, e.g. password-reset or certificate-verification flows keyed off a
-- one-time value). Since anon can never satisfy an auth.uid()-based check,
-- revoking anon EXECUTE removes unnecessary attack surface (error-message
-- probing, load, reliance on the internal check never regressing) with zero
-- functional impact on any legitimate flow.
--
-- NOTE: 9 of these 10 functions carried Postgres's default EXECUTE-to-PUBLIC
-- grant (proacl `=X/postgres`, no role name before `=`), which `anon`
-- inherits regardless of any anon-specific REVOKE — REVOKE ... FROM anon is
-- a no-op against a PUBLIC grant. The fix is REVOKE ... FROM PUBLIC. This
-- does not affect `authenticated` or `service_role`, which already hold
-- their own explicit grants on every one of these functions.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.delete_operations_import(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_scheduled_report(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_analytics_summary() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_search_metrics(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secure_document_version_url(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secure_expense_receipt_url(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secure_maintenance_attachment_url(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secure_report_run_url(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.replace_workflow_steps(uuid, jsonb) FROM PUBLIC;

-- Re-affirm access for legitimate roles in case REVOKE FROM PUBLIC ever
-- interacts with a role that has no other explicit grant (defensive; both
-- roles already carry explicit grants per proacl, so these are no-ops today).
GRANT EXECUTE ON FUNCTION public.delete_operations_import(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_scheduled_report(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_active_users(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_search_metrics(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_secure_document_version_url(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_secure_expense_receipt_url(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_secure_maintenance_attachment_url(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_secure_report_run_url(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.replace_workflow_steps(uuid, jsonb) TO authenticated, service_role;
