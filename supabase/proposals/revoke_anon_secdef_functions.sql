-- =============================================================================
-- PROPOSAL: Revoke EXECUTE on SECURITY DEFINER functions from the `anon` role
-- =============================================================================
--
-- Background
-- ----------
-- The Supabase advisor flagged 390 auth_security_definer_function_executable
-- warnings (195 for `anon`, 195 for `authenticated`).  Only the `anon` grants
-- represent a real security risk: an unauthenticated caller on the public
-- PostgREST endpoint (REST, RPC) can invoke these functions and they execute
-- with the full privileges of the DB owner / definer.
--
-- Triage methodology
-- ------------------
-- Each function was classified by combining:
--   1. Function name / description from pg_proc
--   2. Source-code grep of src/ for direct supabase.rpc('<name>') calls
--   3. Route guard inspection (ProtectedRoute wrappers, allowedRoles)
--
-- Functions KEPT for anon (not revoked):
-- ---------------------------------------
--   verify_certificate(verification_code_param varchar)
--     Called from the public /verify/:code route — no ProtectedRoute wrapper.
--
--   check_password_reuse(plain_password text)          [zero-user-id overload]
--   complete_password_reset()
--     Both called from /reset-password and /complete-invite routes which have
--     NO ProtectedRoute wrapper.  The magic-link session that lands on those
--     pages is a temporary Supabase session that Supabase exposes to the
--     `anon` role until the password is set.
--
--   record_failed_login_attempt(p_email text)
--   lock_account(p_email text, p_duration_minutes integer)
--   clear_failed_login_attempts(p_email text)
--     All three are called by authSecurityService in the pre-authentication
--     login flow (LoginForm / LoginView), before any session exists.
--
--   log_security_audit_event_v2(...)
--     Explicitly documented in pg_proc as "allows unauthenticated access for
--     specific security events" and called from the client-side audit logger
--     which may fire before session is fully established (e.g. login attempt
--     logging).
--
-- UNCLEAR / needs further investigation (NOT included in this file):
--   check_rate_limit(p_key, p_max_requests, p_window_seconds)
--     Generic server-side rate limiter.  Currently only called from
--     authenticated paths (secureSearch, security-middleware) but the broad
--     signature could be legitimately needed pre-auth.  Recommend reviewing
--     before revoking.
--
--   check_password_reuse(p_user_id uuid, p_password text)
--     The two-argument overload takes an explicit user_id.  ChangePassword.tsx
--     calls the single-arg (plain_password) variant under the authenticated
--     user's session, so this overload appears safe to revoke from anon — but
--     keep if any edge-function calls it without a session.
--
-- All remaining 184 functions below are purely internal / authenticated-only
-- operations (HR, governance, notifications, PMS, maintenance, etc.) and
-- should NOT be callable by unauthenticated clients.
--
-- HUMAN REVIEW REQUIRED before applying.
-- Test in a staging branch first.  After applying, smoke-test:
--   - Public certificate verification (/verify/:code)
--   - Login with wrong password (lockout counter)
--   - Password reset email flow end-to-end
-- =============================================================================

-- apply_promotion / apply_transfer  (cron triggers, no public path)
REVOKE EXECUTE ON FUNCTION public.apply_promotion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_transfer() FROM anon;

-- Document / SOP approval workflows
REVOKE EXECUTE ON FUNCTION public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) FROM anon;

-- Leave request management
REVOKE EXECUTE ON FUNCTION public.approve_leave_request(request_id uuid, approver_id uuid, notification_payload jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_leave_request(request_id uuid, rejector_id uuid, rejection_reason text, notification_payload jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_request(p_request_id uuid, p_reason text) FROM anon;

-- Maintenance
REVOKE EXECUTE ON FUNCTION public.assign_maintenance_ticket(p_ticket_id uuid, p_assigner_id uuid, p_assigned_to_id uuid, p_notification_payload jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_maintenance_ticket(ticket_id uuid, completer_id uuid, labor_hours numeric, material_cost numeric, notes text, notification_payload jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_maintenance() FROM anon;

-- Attendance
REVOKE EXECUTE ON FUNCTION public.attendance_check_in(p_notes text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.attendance_check_out(p_attendance_id uuid, p_notes text) FROM anon;

-- Cron / background jobs
REVOKE EXECUTE ON FUNCTION public.archive_expired_documents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_delete_media_storage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_reactivate_suspended_accounts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_onboarding_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_approvals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_pending_actions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_requests() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_expiring_documents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_media_files() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_delegations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_module_learning_progress_from_metadata() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_assignment_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_training_certificate_from_training_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.normalize_learning_progress_last_block_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_due_promotions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_due_transfers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_notification_batch(p_batch_size integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_request_finalization() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rebuild_document_search_index() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_leave_request_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_lms_to_onboarding() FROM anon;
REVOKE EXECUTE ON FUNCTION public.training_content_blocks_resolve_duplicate_order() FROM anon;

-- Learning / LMS
REVOKE EXECUTE ON FUNCTION public.award_module_skills(p_user_id uuid, p_module_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_training_module_related_resources(p_module_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_required_reading(p_user_id uuid) FROM anon;

-- HR / employee operations
REVOKE EXECUTE ON FUNCTION public.bulk_update_reporting_lines(p_updates jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.export_birthdays_for_month(p_month integer, p_year integer, p_property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_hr_assignee(property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_employee_directory(p_search text, p_property_id uuid, p_department_id uuid, p_role app_role, p_management_level text, p_sort text, p_include_inactive boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_employee_private_profile(p_profile_id uuid, p_reason text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_employee_public_profile(p_profile_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_todays_birthdays(p_property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_notes text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text) FROM anon;

-- Authorization helpers (should only be called by authenticated RLS / functions)
REVOKE EXECUTE ON FUNCTION public.can_approve_leave(approver_id uuid, request_property_id uuid, request_department_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_assignments(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_user_act_on_document_approval(p_user_id uuid, p_approval_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_document(document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_feed_item(_feed_item_id text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_request(request_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_request(user_id uuid, request_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_property_access(required_property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(_user_id uuid, _roles app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_property_access(_user_id uuid, _property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role_optimized(check_role app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_guest_review_portfolio_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_hr(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_regional_admin_or_higher(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_rls_enabled(p_table_name text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_department_access(auth_user_id uuid, target_dept_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.users_share_property(user_a uuid, user_b uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_document_access(p_document_id uuid) FROM anon;

-- MFA (requires existing session)
REVOKE EXECUTE ON FUNCTION public.disable_mfa(p_user_id uuid, p_password text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_mfa_secret(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_mfa_enabled(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_sessions(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_all_other_sessions(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_session(p_session_id uuid) FROM anon;

-- Profile / dashboard / sidebar (all require authentication)
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(user_uuid uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[], p_roles text[], p_department_ids uuid[], p_property_ids uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_shift(user_uuid uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_security_summary(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text, p_property_ids uuid[], p_department_ids uuid[], p_current_property_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_departments(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_pins_with_details(p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_properties(user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_user_pins(p_user_id uuid, p_pin_orders jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_kudos_like(kudos_uuid uuid) FROM anon;

-- Notifications
REVOKE EXECUTE ON FUNCTION public.create_hr_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_created_by uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_workflow_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_business_domain text, p_template_key text, p_channels text[], p_created_by uuid, p_priority text, p_scheduled_for timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_learning_assignment_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_referral_history_and_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_batch_email_counters(p_batch_id uuid, p_sent integer, p_failed integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_batch_failed(p_batch_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_batch_processed(p_batch_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_as_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(notification_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_comment_added() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_document_created() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_document_updated() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_message_received() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_request_status_changed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_request_submitted() FROM anon;

-- Document / SOP (internal)
REVOKE EXECUTE ON FUNCTION public.create_sop_document(p_title text, p_department_id uuid, p_created_by uuid, p_title_ar text, p_description text, p_description_ar text, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_is_template boolean, p_template_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_new_sop_version() FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_comment_replies(p_parent_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_document_comments_thread(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_documents(p_days_ahead integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_document_url(document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_payslip_url(p_payslip_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sop_document_details(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sop_summary_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_document_download_count(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_sop_view_count(p_document_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_sop_access() FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_comment(p_comment_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_sop_documents(p_query text, p_department_id uuid, p_category_id uuid, p_status text, p_is_template boolean, p_page_size integer, p_page_number integer, p_sort_by text, p_sort_order text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.secure_count_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.secure_search_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_media_download_headers(p_media_asset_id uuid, p_disposition text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_sop_comment_upvotes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_comment_pin(p_comment_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_document_search_vector() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_document_search_vector_on_tag_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_sop_document(p_document_id uuid, p_updated_by uuid, p_title text, p_title_ar text, p_description text, p_description_ar text, p_department_id uuid, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_change_summary text) FROM anon;

-- Tasks
REVOKE EXECUTE ON FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_task_completion_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_task_stats(user_id_param uuid, property_id_param uuid, department_id_param uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.secure_search_tasks(p_search_query text, p_status text[], p_priority text[], p_assigned_to uuid, p_created_by uuid, p_property_id uuid, p_department_id uuid, p_limit integer, p_offset integer) FROM anon;

-- User search / management (internal admin)
REVOKE EXECUTE ON FUNCTION public.secure_search_users(p_search_query text, p_property_id uuid, p_department_id uuid, p_role text, p_is_active boolean, p_limit integer) FROM anon;

-- Requests / workflows
REVOKE EXECUTE ON FUNCTION public.replace_workflow_steps(p_workflow_id uuid, p_steps jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_after_update_status_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_apply_action(p_request_id uuid, p_action text, p_comment text, p_forward_to uuid, p_visibility text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_attachment_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_comment_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_insert_created_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_request_details(p_request_id uuid, p_updates jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_request_for_leave_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_leave_request_status() FROM anon;

-- Triggers / internal hooks
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_onboarding() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_training() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_password_history() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_approval_delegations_updated_at() FROM anon;

-- Audit / compliance (admin-only operations)
REVOKE EXECUTE ON FUNCTION public.detect_pii_access_anomalies(p_lookback_days integer, p_threshold_multiplier numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_audit_export_hash(p_export_id uuid, p_data jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_report_signature(p_export_id uuid, p_report_data jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_chain_of_custody(p_export_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer, p_batch_offset integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_compliance_dashboard_metrics(p_date_from date, p_date_to date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pii_access_summary(p_target_user_id uuid, p_date_from date, p_date_to date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_pii_accessors(p_date_from date, p_date_to date, p_limit integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_audit_export_integrity(p_export_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_report_signature(p_export_id uuid, p_report_data jsonb, p_signature text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_operations_import(import_log_id uuid) FROM anon;

-- Email / config
REVOKE EXECUTE ON FUNCTION public.get_email_runtime_config() FROM anon;

-- Governance module functions
REVOKE EXECUTE ON FUNCTION public.gov_expire_delegations(p_reference_time timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gov_revoke_delegation(p_delegation_id uuid, p_reason text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gov_set_feature_flag(p_flag_key text, p_is_enabled boolean, p_reason text) FROM anon;

-- Input sanitization helpers (no value callable from anon context)
REVOKE EXECUTE ON FUNCTION public.sanitize_search_input(p_input text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_uuid_array(p_input text[]) FROM anon;

-- Password / check_password_reuse two-arg overload (explicit user_id — only used authenticated)
REVOKE EXECUTE ON FUNCTION public.check_password_reuse(p_user_id uuid, p_password text) FROM anon;

-- check_user_rate_limit (only called from authenticated middleware)
REVOKE EXECUTE ON FUNCTION public.check_user_rate_limit(p_action text, p_max_requests integer, p_window_seconds integer) FROM anon;
