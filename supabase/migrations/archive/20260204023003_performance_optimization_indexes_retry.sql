-- Drop Duplicate Indexes to cleanup
DROP INDEX IF EXISTS idx_progress_user;
DROP INDEX IF EXISTS idx_sop_documents_department;
DROP INDEX IF EXISTS idx_sop_documents_department_id;
DROP INDEX IF EXISTS idx_sop_documents_property;

-- Create Missing Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id ON profiles(job_title_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_rejected_by ON document_approvals(rejected_by);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approved_by ON document_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_training_modules_updated_by ON training_modules(updated_by);
CREATE INDEX IF NOT EXISTS idx_training_progress_training_id ON training_progress(training_id);
CREATE INDEX IF NOT EXISTS idx_training_certificates_attempt_id ON training_certificates(attempt_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_user_id ON pii_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_accessed_by ON pii_access_logs(accessed_by);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_approved_by ON pii_access_logs(approved_by);
CREATE INDEX IF NOT EXISTS idx_temporary_approvers_delegator_id ON temporary_approvers(delegator_id);
CREATE INDEX IF NOT EXISTS idx_temporary_approvers_delegate_id ON temporary_approvers(delegate_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_original_approver_id ON approval_history(original_approver_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_module_id ON training_quiz_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_digests_property_id ON ai_manager_digests(property_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_digests_department_id ON ai_manager_digests(department_id);
CREATE INDEX IF NOT EXISTS idx_related_articles_related_document_id ON related_articles(related_document_id);
CREATE INDEX IF NOT EXISTS idx_related_article_clicks_user_id ON related_article_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_related_article_clicks_clicked_document_id ON related_article_clicks(clicked_document_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_session_id ON search_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_assigned_to_id ON task_templates(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_property_id ON task_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_department_id ON task_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by_id ON task_templates(created_by_id);
CREATE INDEX IF NOT EXISTS idx_system_automations_config_updated_by ON system_automations_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_pms_systems_created_by ON pms_systems(created_by);
CREATE INDEX IF NOT EXISTS idx_data_import_logs_pms_system_id ON data_import_logs(pms_system_id);
CREATE INDEX IF NOT EXISTS idx_data_import_logs_imported_by ON data_import_logs(imported_by);

-- Critical Performance Indexes (Dashboard High Traffic)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_target_id ON learning_assignments(target_id);
;
