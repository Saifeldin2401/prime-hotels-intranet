-- Fix: Revoke PUBLIC execute on SECURITY DEFINER functions (inheritance gap)
--
-- Context: A previous migration ran REVOKE EXECUTE ... FROM anon on 184 SECURITY
-- DEFINER functions. However, Postgres grants EXECUTE to PUBLIC by default on new
-- functions, and the anon role inherits from PUBLIC — so REVOKE FROM anon alone had
-- no effect while a PUBLIC grant existed.
--
-- This migration applies the correct fix:
--   1. REVOKE EXECUTE ... FROM PUBLIC  (removes the blanket inherited grant)
--   2. GRANT EXECUTE ... TO authenticated  (explicitly allows logged-in users)
--
-- Exempt functions (anon access intentionally preserved — NOT changed here):
--   - verify_certificate(verification_code_param varchar)
--   - check_password_reuse(plain_password text)
--   - complete_password_reset()
--   - record_failed_login_attempt(p_email text)
--   - lock_account(p_email text, p_duration_minutes integer)
--   - clear_failed_login_attempts(p_email text)
--   - log_security_audit_event_v2(...) -- any overload

REVOKE EXECUTE ON FUNCTION public.apply_promotion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_promotion() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_transfer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_transfer() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_leave_request(request_id uuid, approver_id uuid, notification_payload jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_leave_request(request_id uuid, approver_id uuid, notification_payload jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.archive_expired_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_expired_documents() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_maintenance_ticket(p_ticket_id uuid, p_assigner_id uuid, p_assigned_to_id uuid, p_notification_payload jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_maintenance_ticket(p_ticket_id uuid, p_assigner_id uuid, p_assigned_to_id uuid, p_notification_payload jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.attendance_check_in(p_notes text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_check_in(p_notes text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.attendance_check_out(p_attendance_id uuid, p_notes text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_check_out(p_attendance_id uuid, p_notes text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auto_delete_media_storage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_delete_media_storage() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auto_reactivate_suspended_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_reactivate_suspended_accounts() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bulk_update_reporting_lines(p_updates jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_update_reporting_lines(p_updates jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_onboarding_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_onboarding_progress() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_approve_leave(approver_id uuid, request_property_id uuid, request_department_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_approve_leave(approver_id uuid, request_property_id uuid, request_department_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_manage_assignments(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_assignments(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_user_act_on_document_approval(p_user_id uuid, p_approval_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_act_on_document_approval(p_user_id uuid, p_approval_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_document(document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_document(document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_feed_item(_feed_item_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_feed_item(_feed_item_id text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_request(user_id uuid, request_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_request(user_id uuid, request_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_request(request_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_request(request_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_approvals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_approvals() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_maintenance() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_pending_actions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_pending_actions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_escalate_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_requests() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_expiring_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_expiring_documents() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_property_access(required_property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_property_access(required_property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_user_rate_limit(p_action text, p_max_requests integer, p_window_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_rate_limit(p_action text, p_max_requests integer, p_window_seconds integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pii_access_logs() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_media_files() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_media_files() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_maintenance_ticket(ticket_id uuid, completer_id uuid, labor_hours numeric, material_cost numeric, notes text, notification_payload jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_ticket(ticket_id uuid, completer_id uuid, labor_hours numeric, material_cost numeric, notes text, notification_payload jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_hr_notification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hr_notification() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_new_sop_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_new_sop_version() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_created_by uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_created_by uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_request_for_leave_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_request_for_leave_request() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_sop_document(p_title text, p_department_id uuid, p_created_by uuid, p_title_ar text, p_description text, p_description_ar text, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_is_template boolean, p_template_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sop_document(p_title text, p_department_id uuid, p_created_by uuid, p_title_ar text, p_description text, p_description_ar text, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_is_template boolean, p_template_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_workflow_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_business_domain text, p_template_key text, p_channels text[], p_created_by uuid, p_priority text, p_scheduled_for timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workflow_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_business_domain text, p_template_key text, p_channels text[], p_created_by uuid, p_priority text, p_scheduled_for timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.detect_pii_access_anomalies(p_lookback_days integer, p_threshold_multiplier numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_pii_access_anomalies(p_lookback_days integer, p_threshold_multiplier numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.disable_mfa(p_user_id uuid, p_password text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_mfa(p_user_id uuid, p_password text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.expire_delegations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_delegations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.export_birthdays_for_month(p_month integer, p_year integer, p_property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_birthdays_for_month(p_month integer, p_year integer, p_property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_module_learning_progress_from_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_module_learning_progress_from_metadata() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.find_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.find_hr_assignee(property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_hr_assignee(property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_assignment_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_assignment_progress() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_audit_export_hash(p_export_id uuid, p_data jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_audit_export_hash(p_export_id uuid, p_data jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_mfa_secret(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_mfa_secret(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_report_signature(p_export_id uuid, p_report_data jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_report_signature(p_export_id uuid, p_report_data jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_verification_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_verification_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_audit_chain_of_custody(p_export_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_chain_of_custody(p_export_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer, p_batch_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer, p_batch_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_comment_replies(p_parent_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_comment_replies(p_parent_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_compliance_dashboard_metrics(p_date_from date, p_date_to date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_compliance_dashboard_metrics(p_date_from date, p_date_to date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(user_uuid uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(user_uuid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[], p_roles text[], p_department_ids uuid[], p_property_ids uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[], p_roles text[], p_department_ids uuid[], p_property_ids uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_document_comments_thread(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_comments_thread(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_viewers_by_department(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_employee_directory(p_search text, p_property_id uuid, p_department_id uuid, p_role app_role, p_management_level text, p_sort text, p_include_inactive boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_directory(p_search text, p_property_id uuid, p_department_id uuid, p_role app_role, p_management_level text, p_sort text, p_include_inactive boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_employee_private_profile(p_profile_id uuid, p_reason text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_private_profile(p_profile_id uuid, p_reason text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_employee_public_profile(p_profile_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_public_profile(p_profile_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_expiring_documents(p_days_ahead integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expiring_documents(p_days_ahead integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_next_shift(user_uuid uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_shift(user_uuid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_pii_access_summary(p_target_user_id uuid, p_date_from date, p_date_to date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pii_access_summary(p_target_user_id uuid, p_date_from date, p_date_to date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_required_reading(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_required_reading(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_secure_document_url(document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secure_document_url(document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_secure_payslip_url(p_payslip_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_secure_payslip_url(p_payslip_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_security_summary(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_summary(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text, p_property_ids uuid[], p_department_ids uuid[], p_current_property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text, p_property_ids uuid[], p_department_ids uuid[], p_current_property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_sop_document_details(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sop_document_details(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_sop_summary_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sop_summary_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_task_completion_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_task_completion_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_task_stats(user_id_param uuid, property_id_param uuid, department_id_param uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_task_stats(user_id_param uuid, property_id_param uuid, department_id_param uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_todays_birthdays(p_property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_todays_birthdays(p_property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_top_pii_accessors(p_date_from date, p_date_to date, p_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_pii_accessors(p_date_from date, p_date_to date, p_limit integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_training_module_related_resources(p_module_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_module_related_resources(p_module_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_departments(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_departments(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_pins_with_details(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_pins_with_details(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_properties(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_properties(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_sessions(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_sessions(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_learning_assignment_notification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_learning_assignment_notification() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user_onboarding() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_training() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user_training() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_referral_history_and_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_referral_history_and_notifications() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(_user_id uuid, _roles app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(_user_id uuid, _roles app_role[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_property_access(_user_id uuid, _property_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_property_access(_user_id uuid, _property_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role_optimized(check_role app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role_optimized(check_role app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_batch_email_counters(p_batch_id uuid, p_sent integer, p_failed integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_batch_email_counters(p_batch_id uuid, p_sent integer, p_failed integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_batch_failed(p_batch_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_batch_failed(p_batch_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_batch_processed(p_batch_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_batch_processed(p_batch_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_document_download_count(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_document_download_count(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_sop_view_count(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_sop_view_count(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_guest_review_portfolio_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guest_review_portfolio_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_hr(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hr(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_mfa_enabled(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mfa_enabled(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_regional_admin_or_higher(user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_regional_admin_or_higher(user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_rls_enabled(p_table_name text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rls_enabled(p_table_name text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.issue_training_certificate_from_training_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_training_certificate_from_training_progress() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(action text, target_type text, target_id uuid, target_name text, meta jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(p_event_type text, p_table_name text, p_record_id uuid, p_action text, p_old_data jsonb, p_new_data jsonb, p_severity text, p_metadata jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_security_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_sop_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_sop_access() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_status_change() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_as_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_notification_as_read(notification_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(notification_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.normalize_learning_progress_last_block_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_learning_progress_last_block_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_comment_added() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_comment_added() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_document_created() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_document_created() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_document_updated() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_document_updated() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_message_received() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_message_received() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_request_status_changed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_request_status_changed() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_request_submitted() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_request_submitted() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_due_promotions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_due_promotions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_due_transfers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_due_transfers() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_notification_batch(p_batch_size integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_notification_batch(p_batch_size integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_request_finalization() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_request_finalization() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rebuild_document_search_index() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_document_search_index() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_leave_request(request_id uuid, rejector_id uuid, rejection_reason text, notification_payload jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_leave_request(request_id uuid, rejector_id uuid, rejection_reason text, notification_payload jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reorder_user_pins(p_user_id uuid, p_pin_orders jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_user_pins(p_user_id uuid, p_pin_orders jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.replace_workflow_steps(p_workflow_id uuid, p_steps jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_workflow_steps(p_workflow_id uuid, p_steps jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_after_update_status_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_after_update_status_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_apply_action(p_request_id uuid, p_action text, p_comment text, p_forward_to uuid, p_visibility text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_apply_action(p_request_id uuid, p_action text, p_comment text, p_forward_to uuid, p_visibility text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_attachment_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_attachment_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_comment_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_comment_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_insert_created_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_insert_created_event() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_comment(p_comment_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_comment(p_comment_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_all_other_sessions(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions(p_user_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_session(p_session_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_session(p_session_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sanitize_search_input(p_input text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sanitize_search_input(p_input text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_password_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_password_history() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_documents(p_query text, p_property_id uuid, p_folder_id uuid, p_limit integer, p_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_sop_documents(p_query text, p_department_id uuid, p_category_id uuid, p_status text, p_is_template boolean, p_page_size integer, p_page_number integer, p_sort_by text, p_sort_order text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_sop_documents(p_query text, p_department_id uuid, p_category_id uuid, p_status text, p_is_template boolean, p_page_size integer, p_page_number integer, p_sort_by text, p_sort_order text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.secure_count_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_count_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.secure_search_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_search_documents(p_search_query text, p_property_id uuid, p_folder_id uuid, p_status text, p_visibility text, p_department_id uuid, p_file_type text[], p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_confidentiality_level text, p_include_deleted boolean, p_include_archived boolean, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.secure_search_tasks(p_search_query text, p_status text[], p_priority text[], p_assigned_to uuid, p_created_by uuid, p_property_id uuid, p_department_id uuid, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_search_tasks(p_search_query text, p_status text[], p_priority text[], p_assigned_to uuid, p_created_by uuid, p_property_id uuid, p_department_id uuid, p_limit integer, p_offset integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.secure_search_users(p_search_query text, p_property_id uuid, p_department_id uuid, p_role text, p_is_active boolean, p_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_search_users(p_search_query text, p_property_id uuid, p_department_id uuid, p_role text, p_is_active boolean, p_limit integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_media_download_headers(p_media_asset_id uuid, p_disposition text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_media_download_headers(p_media_asset_id uuid, p_disposition text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_notes text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_notes text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_leave_request_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_leave_request_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_lms_to_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_lms_to_onboarding() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_sop_comment_upvotes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_sop_comment_upvotes() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_comment_pin(p_comment_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_comment_pin(p_comment_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_kudos_like(kudos_uuid uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_kudos_like(kudos_uuid uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.training_content_blocks_resolve_duplicate_order() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.training_content_blocks_resolve_duplicate_order() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_approval_delegations_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_approval_delegations_updated_at() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_document_search_vector() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_document_search_vector() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_document_search_vector_on_tag_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_document_search_vector_on_tag_change() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_sop_document(p_document_id uuid, p_updated_by uuid, p_title text, p_title_ar text, p_description text, p_description_ar text, p_department_id uuid, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_change_summary text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sop_document(p_document_id uuid, p_updated_by uuid, p_title text, p_title_ar text, p_description text, p_description_ar text, p_department_id uuid, p_category_id uuid, p_subcategory_id uuid, p_content jsonb, p_status text, p_change_summary text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_department_access(auth_user_id uuid, target_dept_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_department_access(auth_user_id uuid, target_dept_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.users_share_property(user_a uuid, user_b uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_share_property(user_a uuid, user_b uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_document_access(p_document_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_document_access(p_document_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_uuid_array(p_input text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_uuid_array(p_input text[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_audit_export_integrity(p_export_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_export_integrity(p_export_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_report_signature(p_export_id uuid, p_report_data jsonb, p_signature text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_report_signature(p_export_id uuid, p_report_data jsonb, p_signature text) TO authenticated;
