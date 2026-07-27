-- =============================================================================
-- Performance: add covering indexes for unindexed foreign keys
-- =============================================================================
-- 73 FK constraints across 47 tables lack a covering index (get_advisors,
-- type=performance, unindexed_foreign_keys). Excludes shifts, user_shifts,
-- admin_delegations, temporary_approvers, properties, companies, brands —
-- those are owned by concurrent workstreams and are intentionally skipped.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_announcement_acknowledgments_user_id ON public.announcement_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id ON public.announcement_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_property_id ON public.attendance(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_export_retention_policies_created_by ON public.audit_export_retention_policies(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_findings_assigned_to ON public.audit_findings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_findings_item_id ON public.audit_findings(item_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_created_by ON public.audit_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_templates_created_by ON public.audit_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_templates_department_id ON public.audit_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_templates_property_id ON public.audit_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_document_acknowledgments_user_id ON public.document_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_department_id ON public.document_categories(department_id);
CREATE INDEX IF NOT EXISTS idx_document_department_access_department_id ON public.document_department_access(department_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_document_id ON public.document_favorites(document_id);
CREATE INDEX IF NOT EXISTS idx_document_feedback_user_id ON public.document_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_archived_by ON public.documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_documents_subcategory_id ON public.documents(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_by ON public.documents(updated_by);
CREATE INDEX IF NOT EXISTS idx_employee_of_the_month_created_by ON public.employee_of_the_month(created_by);
CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_announced_eom_id ON public.eom_auto_selections(announced_eom_id);
CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_reviewed_by ON public.eom_auto_selections(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_scoring_history_id ON public.eom_auto_selections(scoring_history_id);
CREATE INDEX IF NOT EXISTS idx_eom_auto_selections_user_id ON public.eom_auto_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_eom_automation_config_updated_by ON public.eom_automation_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_department_id ON public.events(department_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_approved_by_id ON public.expense_claims(approved_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_department_id ON public.expense_claims(department_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_rejected_by_id ON public.expense_claims(rejected_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_workflow_request_id ON public.expense_claims(workflow_request_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_required_reading_assigned_by ON public.knowledge_required_reading(assigned_by);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_exemptions_created_by ON public.learning_assignment_exemptions(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_created_by ON public.learning_assignment_user_overrides(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_assignment_user_overrides_updated_by ON public.learning_assignment_user_overrides(updated_by);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_media_asset_id ON public.media_collection_items(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_module_skills_skill_id ON public.module_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_motivational_content_created_by ON public.motivational_content(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_queue_id ON public.notification_delivery_events(queue_id);
CREATE INDEX IF NOT EXISTS idx_pending_user_approvals_reviewed_by ON public.pending_user_approvals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by ON public.profiles(suspended_by);
CREATE INDEX IF NOT EXISTS idx_referral_history_changed_by ON public.referral_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_related_articles_related_document_id ON public.related_articles(related_document_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_created_by ON public.report_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_report_definitions_department_id ON public.report_definitions(department_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_property_id ON public.report_definitions(property_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_triggered_by ON public.report_runs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_compliance_reports_created_by ON public.scheduled_compliance_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_sop_comment_votes_user_id ON public.sop_comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_comments_parent_id ON public.sop_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_sop_comments_user_id ON public.sop_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_task_templates_assigned_to_id ON public.task_templates(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_department_id ON public.task_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_property_id ON public.task_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_assigned_by ON public.training_assignment_rules(assigned_by);
CREATE INDEX IF NOT EXISTS idx_training_block_progress_training_module_id ON public.training_block_progress(training_module_id);
CREATE INDEX IF NOT EXISTS idx_training_certificate_settings_created_by ON public.training_certificate_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_training_certificate_settings_template_id ON public.training_certificate_settings(template_id);
CREATE INDEX IF NOT EXISTS idx_training_module_prerequisites_prerequisite_module_id ON public.training_module_prerequisites(prerequisite_module_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_template_id ON public.training_modules(template_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_updated_by ON public.training_modules(updated_by);
CREATE INDEX IF NOT EXISTS idx_training_path_modules_module_id ON public.training_path_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_training_id ON public.training_progress(training_id);
CREATE INDEX IF NOT EXISTS idx_unified_question_versions_question_id ON public.unified_question_versions(question_id);
CREATE INDEX IF NOT EXISTS idx_unified_questions_created_by ON public.unified_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_unified_questions_reviewed_by ON public.unified_questions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_department_id ON public.user_invitations(department_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_property_id ON public.user_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_user_path_enrollments_path_id ON public.user_path_enrollments(path_id);
