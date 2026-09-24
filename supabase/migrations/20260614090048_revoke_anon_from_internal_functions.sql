BEGIN;
-- Revoke anon EXECUTE from internal logging/cleanup/SECURITY DEFINER functions.
-- These are called by triggers/RPCs under an authenticated or service context and
-- must NOT be invocable by unauthenticated callers (anon could spam audit logs).
-- Legitimately-anon functions are intentionally left alone: lock_account,
-- record_failed_login_attempt, clear_failed_login_attempts, check_password_reuse,
-- complete_password_reset (login flow) and verify_certificate (public cert check).
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
COMMIT;
