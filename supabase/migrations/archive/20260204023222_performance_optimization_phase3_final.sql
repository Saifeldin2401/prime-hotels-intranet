-- Cleanup Remaining Duplicates
DROP INDEX IF EXISTS idx_audit_logs_changed_by;
DROP INDEX IF EXISTS idx_certificates_training;

-- Create Missing Indexes (Batch 3)
CREATE INDEX IF NOT EXISTS idx_certificates_training_progress_id ON certificates(training_progress_id);
CREATE INDEX IF NOT EXISTS idx_designations_department_id ON designations(department_id);

CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(job_title);
CREATE INDEX IF NOT EXISTS idx_training_paths_target_property_id ON training_paths(target_property_id);
CREATE INDEX IF NOT EXISTS idx_training_paths_created_by ON training_paths(created_by);
CREATE INDEX IF NOT EXISTS idx_training_paths_target_department_id ON training_paths(target_department_id);
CREATE INDEX IF NOT EXISTS idx_training_path_modules_module_id ON training_path_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_user_path_enrollments_path_id ON user_path_enrollments(path_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_property_id ON employee_referrals(property_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_referred_by ON employee_referrals(referred_by);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_job_posting_id ON employee_referrals(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by_id ON leave_requests(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by_id ON leave_requests(rejected_by_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_author_id ON maintenance_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_uploaded_by_id ON maintenance_attachments(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_training_module_id ON training_assignment_rules(training_module_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_job_title ON onboarding_templates(job_title);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_department_id ON onboarding_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_process_user_id ON onboarding_process(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_process_template_id ON onboarding_process(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_process_id ON onboarding_tasks(process_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_assigned_to_id ON onboarding_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_department_id ON job_titles(department_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_document_id ON document_favorites(document_id);
CREATE INDEX IF NOT EXISTS idx_notification_batches_created_by ON notification_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_document_feedback_user_id ON document_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_required_reading_assigned_by ON knowledge_required_reading(assigned_by);
CREATE INDEX IF NOT EXISTS idx_trigger_rules_created_by ON trigger_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
;
