-- ============================================================================
-- MIGRATION: revoke_anon_lock_account_execute
-- lock_account(p_email text, p_duration_minutes integer) was anon+authenticated
-- executable via PostgREST RPC with NO caller-identity or attempt-count check:
-- any unauthenticated caller could lock ANY account for up to 60 minutes with
-- a single call (repeatable indefinitely) -- a real account-lockout DoS vector.
--
-- Confirmed via grep that the only frontend caller is
-- authSecurityService.ts's updateServerSideLockout(), itself a redundant
-- client-side duplicate of the escalating lockout ALREADY enforced
-- server-side inside record_failed_login_attempt() (locks after 5 real
-- failed attempts tied to that email's actual history, remains anon-callable
-- as intended for pre-auth login flows). No admin/manual-lock UI caller
-- exists despite doc comments claiming that purpose.
--
-- The frontend call is wrapped in a silent try/catch (ignores errors), so
-- revoking here causes no functional regression -- real lockout enforcement
-- continues via record_failed_login_attempt.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.lock_account(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_account(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lock_account(text, integer) FROM authenticated;
