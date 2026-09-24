-- =============================================================================
-- MIGRATION: revoke_anon_and_drop_dead_delegations
-- Applied: 2026-06-14
-- Purpose:
--   1. Revoke anon EXECUTE from 11 internal logging/cleanup SECURITY DEFINER
--      functions. They run via triggers/RPCs under an authenticated/service
--      context; anon must not be able to invoke them (e.g. spam audit logs).
--      Deliberately KEPT anon-executable (legitimate pre-auth / public flows):
--        lock_account, record_failed_login_attempt, clear_failed_login_attempts,
--        check_password_reuse, complete_password_reset, verify_certificate.
--   2. Drop approval_delegations: 0 rows, zero frontend references, no inbound FKs.
--      Approval routing is handled by temporary_approvers; permission delegation
--      by admin_delegations. This table was dead.
-- Rollback: re-GRANT EXECUTE ... TO anon for the functions; restore
--           approval_delegations from snapshot (was 0-row, no data lost).
-- =============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event_trigger() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text, p_resource_type text, p_resource_id uuid, p_access_type text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_audit_event_v2(p_action text, p_entity_type text, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address text, p_user_agent text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) FROM anon;

DROP TABLE IF EXISTS public.approval_delegations CASCADE;

COMMIT;
