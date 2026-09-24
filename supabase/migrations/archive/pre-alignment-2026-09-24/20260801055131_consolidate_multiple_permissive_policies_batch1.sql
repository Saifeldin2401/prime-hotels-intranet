-- ============================================================================
-- MIGRATION: consolidate_multiple_permissive_policies_batch1
-- Fixes the multiple_permissive_policies performance warning for the 24
-- tables sharing one clean, verified-safe pattern: a single admin-manage
-- FOR ALL policy sitting alongside a completely separate, differently-
-- scoped FOR SELECT policy. Splitting the ALL policy into INSERT/UPDATE/
-- DELETE-only removes the SELECT-command overlap while preserving 100% of
-- existing access (identical qual/with_check on every split policy; SELECT
-- continues to be governed solely by its existing dedicated policy).
--
-- Also drops one confirmed-redundant policy on learning_quizzes: its
-- "Draft quizzes viewable by creators and HR" ALL policy grants strictly
-- less than the union of the table's 4 existing explicit CRUD policies
-- (verified by comparing qual text -- the ALL policy's condition is exactly
-- reproduced inside each of the SELECT/INSERT/UPDATE/DELETE policies,
-- with SELECT additionally allowing published quizzes). Dropping it removes
-- zero access.
--
-- Deliberately NOT touched in this pass (semantically non-trivial overlaps
-- that need individual case-by-case review, not a mechanical fix):
-- departments, announcements, training_modules.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

-- announcement_acknowledgments
DROP POLICY users_own_acks ON public.announcement_acknowledgments;
CREATE POLICY users_own_acks_insert ON public.announcement_acknowledgments FOR INSERT TO public WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY users_own_acks_update ON public.announcement_acknowledgments FOR UPDATE TO public USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY users_own_acks_delete ON public.announcement_acknowledgments FOR DELETE TO public USING (user_id = (SELECT auth.uid()));

-- audit_export_retention_policies
DROP POLICY hr_admin_manage_retention_policies ON public.audit_export_retention_policies;
CREATE POLICY hr_admin_manage_retention_policies_insert ON public.audit_export_retention_policies FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_retention_policies_update ON public.audit_export_retention_policies FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_retention_policies_delete ON public.audit_export_retention_policies FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- audit_findings
DROP POLICY hr_admin_manage_audit_findings ON public.audit_findings;
CREATE POLICY hr_admin_manage_audit_findings_insert ON public.audit_findings FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_findings_update ON public.audit_findings FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_findings_delete ON public.audit_findings FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- audit_items
DROP POLICY hr_admin_manage_audit_items ON public.audit_items;
CREATE POLICY hr_admin_manage_audit_items_insert ON public.audit_items FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_items_update ON public.audit_items FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_items_delete ON public.audit_items FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- audit_runs
DROP POLICY hr_admin_manage_audit_runs ON public.audit_runs;
CREATE POLICY hr_admin_manage_audit_runs_insert ON public.audit_runs FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_runs_update ON public.audit_runs FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_runs_delete ON public.audit_runs FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- audit_templates
DROP POLICY hr_admin_manage_audit_templates ON public.audit_templates;
CREATE POLICY hr_admin_manage_audit_templates_insert ON public.audit_templates FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_templates_update ON public.audit_templates FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_audit_templates_delete ON public.audit_templates FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- document_categories
DROP POLICY hr_admin_manage_doc_cats ON public.document_categories;
CREATE POLICY hr_admin_manage_doc_cats_insert ON public.document_categories FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_doc_cats_update ON public.document_categories FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_doc_cats_delete ON public.document_categories FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- document_feedback
DROP POLICY users_own_feedback ON public.document_feedback;
CREATE POLICY users_own_feedback_insert ON public.document_feedback FOR INSERT TO public WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY users_own_feedback_update ON public.document_feedback FOR UPDATE TO public USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY users_own_feedback_delete ON public.document_feedback FOR DELETE TO public USING (user_id = (SELECT auth.uid()));

-- expense_claims
DROP POLICY users_own_expense_claims ON public.expense_claims;
CREATE POLICY users_own_expense_claims_insert ON public.expense_claims FOR INSERT TO public WITH CHECK (requester_id = (SELECT auth.uid()));
CREATE POLICY users_own_expense_claims_update ON public.expense_claims FOR UPDATE TO public USING (requester_id = (SELECT auth.uid())) WITH CHECK (requester_id = (SELECT auth.uid()));
CREATE POLICY users_own_expense_claims_delete ON public.expense_claims FOR DELETE TO public USING (requester_id = (SELECT auth.uid()));

-- knowledge_required_reading
DROP POLICY hr_admin_manage_required_reading ON public.knowledge_required_reading;
CREATE POLICY hr_admin_manage_required_reading_insert ON public.knowledge_required_reading FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_required_reading_update ON public.knowledge_required_reading FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_required_reading_delete ON public.knowledge_required_reading FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- related_articles
DROP POLICY hr_admin_manage_related_articles ON public.related_articles;
CREATE POLICY hr_admin_manage_related_articles_insert ON public.related_articles FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_related_articles_update ON public.related_articles FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_related_articles_delete ON public.related_articles FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- report_definitions
DROP POLICY hr_admin_manage_report_defs ON public.report_definitions;
CREATE POLICY hr_admin_manage_report_defs_insert ON public.report_definitions FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_report_defs_update ON public.report_definitions FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_report_defs_delete ON public.report_definitions FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- report_runs
DROP POLICY hr_admin_manage_report_runs ON public.report_runs;
CREATE POLICY hr_admin_manage_report_runs_insert ON public.report_runs FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_report_runs_update ON public.report_runs FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_report_runs_delete ON public.report_runs FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- task_templates
DROP POLICY hr_admin_manage_task_templates ON public.task_templates;
CREATE POLICY hr_admin_manage_task_templates_insert ON public.task_templates FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_task_templates_update ON public.task_templates FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_task_templates_delete ON public.task_templates FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- training_certificate_settings
DROP POLICY hr_admin_manage_cert_settings ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_insert ON public.training_certificate_settings FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_cert_settings_update ON public.training_certificate_settings FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_cert_settings_delete ON public.training_certificate_settings FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- training_module_prerequisites
DROP POLICY hr_admin_manage_prereqs ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_insert ON public.training_module_prerequisites FOR INSERT TO public WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_prereqs_update ON public.training_module_prerequisites FOR UPDATE TO public USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY hr_admin_manage_prereqs_delete ON public.training_module_prerequisites FOR DELETE TO public USING (is_hr_or_admin((SELECT auth.uid())));

-- motivational_content
DROP POLICY "Admins can manage motivational content" ON public.motivational_content;
CREATE POLICY motivational_content_manage_insert ON public.motivational_content FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND (user_roles.role)::text = ANY (ARRAY['admin'::text,'super_admin'::text])));
CREATE POLICY motivational_content_manage_update ON public.motivational_content FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND (user_roles.role)::text = ANY (ARRAY['admin'::text,'super_admin'::text]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND (user_roles.role)::text = ANY (ARRAY['admin'::text,'super_admin'::text])));
CREATE POLICY motivational_content_manage_delete ON public.motivational_content FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND (user_roles.role)::text = ANY (ARRAY['admin'::text,'super_admin'::text])));

-- notification_batches
DROP POLICY "Service role full access on notification_batches" ON public.notification_batches;
CREATE POLICY notification_batches_service_insert ON public.notification_batches FOR INSERT TO public WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_batches_service_update ON public.notification_batches FOR UPDATE TO public USING ((SELECT auth.role()) = 'service_role'::text) WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_batches_service_delete ON public.notification_batches FOR DELETE TO public USING ((SELECT auth.role()) = 'service_role'::text);

-- notification_queue
DROP POLICY "Service role full access on notification_queue" ON public.notification_queue;
CREATE POLICY notification_queue_service_insert ON public.notification_queue FOR INSERT TO public WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_queue_service_update ON public.notification_queue FOR UPDATE TO public USING ((SELECT auth.role()) = 'service_role'::text) WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_queue_service_delete ON public.notification_queue FOR DELETE TO public USING ((SELECT auth.role()) = 'service_role'::text);

-- onboarding_process
DROP POLICY "Managers can view/edit their staff's process" ON public.onboarding_process;
CREATE POLICY onboarding_process_managers_insert ON public.onboarding_process FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = onboarding_process.user_id AND (profiles.reporting_to = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])))));
CREATE POLICY onboarding_process_managers_update ON public.onboarding_process FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = onboarding_process.user_id AND (profiles.reporting_to = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role]))))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = onboarding_process.user_id AND (profiles.reporting_to = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])))));
CREATE POLICY onboarding_process_managers_delete ON public.onboarding_process FOR DELETE TO public USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = onboarding_process.user_id AND (profiles.reporting_to = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])))));

-- scheduled_reminders
DROP POLICY "Service role can manage reminders" ON public.scheduled_reminders;
CREATE POLICY scheduled_reminders_service_insert ON public.scheduled_reminders FOR INSERT TO public WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);
CREATE POLICY scheduled_reminders_service_update ON public.scheduled_reminders FOR UPDATE TO public USING (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text) WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);
CREATE POLICY scheduled_reminders_service_delete ON public.scheduled_reminders FOR DELETE TO public USING (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- maintenance_schedules
DROP POLICY "Maintenance schedules manageable by admins/managers" ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_manage_insert ON public.maintenance_schedules FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) IN (SELECT user_roles.user_id FROM user_roles WHERE user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role])));
CREATE POLICY maintenance_schedules_manage_update ON public.maintenance_schedules FOR UPDATE TO public USING ((SELECT auth.uid()) IN (SELECT user_roles.user_id FROM user_roles WHERE user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role]))) WITH CHECK ((SELECT auth.uid()) IN (SELECT user_roles.user_id FROM user_roles WHERE user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role])));
CREATE POLICY maintenance_schedules_manage_delete ON public.maintenance_schedules FOR DELETE TO public USING ((SELECT auth.uid()) IN (SELECT user_roles.user_id FROM user_roles WHERE user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role])));

-- user_departments
DROP POLICY user_departments_modify_admin_hr_pm ON public.user_departments;
CREATE POLICY user_departments_modify_insert ON public.user_departments FOR INSERT TO public WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND user_has_department_access((SELECT auth.uid()), department_id)));
CREATE POLICY user_departments_modify_update ON public.user_departments FOR UPDATE TO public USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND user_has_department_access((SELECT auth.uid()), department_id))) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND user_has_department_access((SELECT auth.uid()), department_id)));
CREATE POLICY user_departments_modify_delete ON public.user_departments FOR DELETE TO public USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND user_has_department_access((SELECT auth.uid()), department_id)));

-- user_skills
DROP POLICY "Admins can manage user skills" ON public.user_skills;
CREATE POLICY user_skills_manage_insert ON public.user_skills FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY user_skills_manage_update ON public.user_skills FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY user_skills_manage_delete ON public.user_skills FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));

-- learning_quizzes: drop the confirmed-redundant ALL policy entirely
DROP POLICY "Draft quizzes viewable by creators and HR" ON public.learning_quizzes;
