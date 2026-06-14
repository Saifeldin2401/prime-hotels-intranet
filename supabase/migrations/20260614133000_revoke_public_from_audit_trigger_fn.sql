-- =============================================================================
-- MIGRATION: revoke_public_from_audit_trigger_fn
-- Applied: 2026-06-14
-- Purpose: log_audit_event_trigger() was still resolving as anon-executable
--          because anon inherits the PUBLIC grant (the earlier REVOKE ... FROM
--          anon only removed the direct grant). It is a trigger function and
--          needs no role-level EXECUTE; revoke PUBLIC, grant authenticated.
-- Result: anon-executable SECURITY DEFINER functions are now exactly the 6
--          legitimate pre-auth/public ones: check_password_reuse,
--          clear_failed_login_attempts, complete_password_reset, lock_account,
--          record_failed_login_attempt, verify_certificate.
-- Rollback: GRANT EXECUTE ON FUNCTION public.log_audit_event_trigger() TO PUBLIC;
-- =============================================================================

BEGIN;
REVOKE EXECUTE ON FUNCTION public.log_audit_event_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event_trigger() TO authenticated;
COMMIT;
