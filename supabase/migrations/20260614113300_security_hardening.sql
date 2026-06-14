-- =============================================================================
-- MIGRATION: security_hardening
-- Applied: 2026-06-14
-- Purpose: Revoke PUBLIC execute on SECURITY DEFINER functions, set
--          employee-documents bucket to private, harden notifications insert.
-- Signatures verified against live DB before applying.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. REVOKE PUBLIC EXECUTE ON SECURITY DEFINER FUNCTIONS
-- =============================================================================

-- log_audit_event (no-args trigger overload)
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO authenticated;

-- log_audit_event (5-arg RPC overload)
REVOKE EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) TO authenticated;

-- log_security_audit_event_v2 (7-arg overload — verified signature)
REVOKE EXECUTE ON FUNCTION public.log_security_audit_event_v2(p_action text, p_entity_type text, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address text, p_user_agent text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_audit_event_v2(p_action text, p_entity_type text, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address text, p_user_agent text) TO authenticated;

-- log_security_event (no-args trigger overload)
REVOKE EXECUTE ON FUNCTION public.log_security_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event() TO authenticated;

-- log_security_event (8-arg RPC overload)
REVOKE EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_sop_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_sop_access() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) TO authenticated;

-- log_pii_access (3-arg overload)
REVOKE EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text) TO authenticated;

-- log_pii_access (6-arg overload)
REVOKE EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text, p_resource_type text, p_resource_id uuid, p_access_type text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text, p_resource_type text, p_resource_id uuid, p_access_type text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_maintenance() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_approvals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_approvals() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_requests() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.disable_mfa(p_user_id uuid, p_password text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_mfa(p_user_id uuid, p_password text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text) TO authenticated;

-- lock_account retains anon access (called during unauthenticated login lockout flow)
REVOKE EXECUTE ON FUNCTION public.lock_account(p_email text, p_duration_minutes integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_account(p_email text, p_duration_minutes integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_account(p_email text, p_duration_minutes integer) TO anon;

REVOKE EXECUTE ON FUNCTION public.revoke_session(p_session_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_session(p_session_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_all_other_sessions(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer, p_batch_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer, p_batch_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_compliance_dashboard_metrics(p_date_from date, p_date_to date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_compliance_dashboard_metrics(p_date_from date, p_date_to date) TO authenticated;


-- =============================================================================
-- 2. SET employee-documents STORAGE BUCKET TO PRIVATE
-- =============================================================================

UPDATE storage.buckets SET public = false WHERE id = 'employee-documents';


-- =============================================================================
-- 3. HARDEN NOTIFICATIONS INSERT POLICY
-- =============================================================================

DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;

DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT TO service_role
  WITH CHECK (true);


COMMIT;
