-- ============================================================================
-- MIGRATION: consolidate_multiple_permissive_policies_batch2
-- Second batch of multiple_permissive_policies fixes (see batch1 for the
-- pattern and rationale). 32 tables total:
--   - 23 where the SELECT policy's qual is literally `true` (trivially a
--     superset of anything the ALL policy could restrict);
--   - 7 where the ALL policy's qual is a verified logical subset of the
--     SELECT policy's qual (the admin-role check is literally one of the
--     SELECT policy's OR-branches) -- confirmed by reading both qual texts;
--   - 2 (notification_delivery_events, notification_email_templates) whose
--     ALL policy only ever matches auth.role() = 'service_role', and
--     service_role has rolbypassrls = true (confirmed via pg_roles) --
--     meaning that policy is already inert for service_role and splitting
--     it changes nothing.
--
-- Deliberately NOT touched (real semantic gaps -- the ALL policy's qual is
-- NOT a subset of the SELECT policy's qual, so a naive split would reduce
-- real access): capex_project_templates, training_assignment_rules,
-- unified_question_usages, user_sessions (all admin-vs-narrower-select
-- mismatches). Already deferred from batch1: departments, announcements,
-- training_modules.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

-- brands
DROP POLICY brands_modify_admin ON public.brands;
CREATE POLICY brands_modify_admin_insert ON public.brands FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY brands_modify_admin_update ON public.brands FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY brands_modify_admin_delete ON public.brands FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

-- categories
DROP POLICY categories_manage_admin ON public.categories;
CREATE POLICY categories_manage_admin_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY categories_manage_admin_update ON public.categories FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY categories_manage_admin_delete ON public.categories FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));

-- certificate_templates
DROP POLICY certificate_templates_admin_write ON public.certificate_templates;
CREATE POLICY certificate_templates_admin_write_insert ON public.certificate_templates FOR INSERT TO authenticated WITH CHECK (is_admin((SELECT auth.uid())));
CREATE POLICY certificate_templates_admin_write_update ON public.certificate_templates FOR UPDATE TO authenticated USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
CREATE POLICY certificate_templates_admin_write_delete ON public.certificate_templates FOR DELETE TO authenticated USING (is_admin((SELECT auth.uid())));

-- companies
DROP POLICY companies_modify_admin ON public.companies;
CREATE POLICY companies_modify_admin_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY companies_modify_admin_update ON public.companies FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY companies_modify_admin_delete ON public.companies FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

-- employee_of_the_month
DROP POLICY "EOM manage policy" ON public.employee_of_the_month;
CREATE POLICY eom_manage_insert ON public.employee_of_the_month FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_manage_update ON public.employee_of_the_month FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_manage_delete ON public.employee_of_the_month FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));

-- eom_automation_config
DROP POLICY eom_automation_config_manage ON public.eom_automation_config;
CREATE POLICY eom_automation_config_manage_insert ON public.eom_automation_config FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN profiles p ON p.id = (SELECT auth.uid()) WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_automation_config_manage_update ON public.eom_automation_config FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN profiles p ON p.id = (SELECT auth.uid()) WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_automation_config_manage_delete ON public.eom_automation_config FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur JOIN profiles p ON p.id = (SELECT auth.uid()) WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));

-- escalation_rules
DROP POLICY escalation_rules_admin_only ON public.escalation_rules;
CREATE POLICY escalation_rules_admin_only_insert ON public.escalation_rules FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY escalation_rules_admin_only_update ON public.escalation_rules FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY escalation_rules_admin_only_delete ON public.escalation_rules FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- job_postings
DROP POLICY job_postings_manage ON public.job_postings;
CREATE POLICY job_postings_manage_insert ON public.job_postings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));
CREATE POLICY job_postings_manage_update ON public.job_postings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));
CREATE POLICY job_postings_manage_delete ON public.job_postings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));

-- job_title_role_mappings
DROP POLICY "HR can manage job title mappings" ON public.job_title_role_mappings;
CREATE POLICY hr_manage_job_title_mappings_insert ON public.job_title_role_mappings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));
CREATE POLICY hr_manage_job_title_mappings_update ON public.job_title_role_mappings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));
CREATE POLICY hr_manage_job_title_mappings_delete ON public.job_title_role_mappings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_hr'::app_role])));

-- job_titles
DROP POLICY "Allow manage access for admins" ON public.job_titles;
CREATE POLICY job_titles_manage_insert ON public.job_titles FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role])));
CREATE POLICY job_titles_manage_update ON public.job_titles FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role])));
CREATE POLICY job_titles_manage_delete ON public.job_titles FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role])));

-- knowledge_related_articles
DROP POLICY "Admins can manage related articles" ON public.knowledge_related_articles;
CREATE POLICY knowledge_related_articles_manage_insert ON public.knowledge_related_articles FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])));
CREATE POLICY knowledge_related_articles_manage_update ON public.knowledge_related_articles FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])));
CREATE POLICY knowledge_related_articles_manage_delete ON public.knowledge_related_articles FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])));

-- maintenance_sla_policies
DROP POLICY maintenance_sla_policies_manage ON public.maintenance_sla_policies;
CREATE POLICY maintenance_sla_policies_manage_insert ON public.maintenance_sla_policies FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY maintenance_sla_policies_manage_update ON public.maintenance_sla_policies FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY maintenance_sla_policies_manage_delete ON public.maintenance_sla_policies FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));

-- microlearning_content
DROP POLICY "Microlearning manageable by admins and managers" ON public.microlearning_content;
CREATE POLICY microlearning_manage_insert ON public.microlearning_content FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));
CREATE POLICY microlearning_manage_update ON public.microlearning_content FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));
CREATE POLICY microlearning_manage_delete ON public.microlearning_content FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));

-- module_skills
DROP POLICY "Admins can manage module skills" ON public.module_skills;
CREATE POLICY module_skills_manage_insert ON public.module_skills FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY module_skills_manage_update ON public.module_skills FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY module_skills_manage_delete ON public.module_skills FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));

-- onboarding_templates
DROP POLICY "Templates editable by admins" ON public.onboarding_templates;
CREATE POLICY onboarding_templates_manage_insert ON public.onboarding_templates FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));
CREATE POLICY onboarding_templates_manage_update ON public.onboarding_templates FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));
CREATE POLICY onboarding_templates_manage_delete ON public.onboarding_templates FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])));

-- properties
DROP POLICY properties_modify_admin ON public.properties;
CREATE POLICY properties_modify_admin_insert ON public.properties FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY properties_modify_admin_update ON public.properties FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY properties_modify_admin_delete ON public.properties FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- request_sla_policies
DROP POLICY request_sla_policies_manage ON public.request_sla_policies;
CREATE POLICY request_sla_policies_manage_insert ON public.request_sla_policies FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY request_sla_policies_manage_update ON public.request_sla_policies FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY request_sla_policies_manage_delete ON public.request_sla_policies FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));

-- role_permissions
DROP POLICY "Admins can manage role_permissions" ON public.role_permissions;
CREATE POLICY role_permissions_manage_insert ON public.role_permissions FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY role_permissions_manage_update ON public.role_permissions FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY role_permissions_manage_delete ON public.role_permissions FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role,'regional_admin'::app_role])));

-- skills
DROP POLICY "Admins and HR can manage skills" ON public.skills;
CREATE POLICY skills_manage_insert ON public.skills FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY skills_manage_update ON public.skills FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));
CREATE POLICY skills_manage_delete ON public.skills FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role,'department_head'::app_role])));

-- suppliers
DROP POLICY suppliers_modify ON public.suppliers;
CREATE POLICY suppliers_modify_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY suppliers_modify_update ON public.suppliers FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'property_manager'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY suppliers_modify_delete ON public.suppliers FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'property_manager'::app_role));

-- system_wiki
DROP POLICY "Enable all access for admins" ON public.system_wiki;
CREATE POLICY system_wiki_manage_insert ON public.system_wiki FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY system_wiki_manage_update ON public.system_wiki FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY system_wiki_manage_delete ON public.system_wiki FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

-- training_path_modules
DROP POLICY path_modules_manage ON public.training_path_modules;
CREATE POLICY path_modules_manage_insert ON public.training_path_modules FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY path_modules_manage_update ON public.training_path_modules FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY path_modules_manage_delete ON public.training_path_modules FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role) OR has_role((SELECT auth.uid()), 'property_manager'::app_role));

-- workflow_definitions
DROP POLICY "Admins can manage workflow definitions" ON public.workflow_definitions;
CREATE POLICY workflow_definitions_manage_insert ON public.workflow_definitions FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY workflow_definitions_manage_update ON public.workflow_definitions FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role])));
CREATE POLICY workflow_definitions_manage_delete ON public.workflow_definitions FOR DELETE TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role])));

-- eom_auto_selections (ALL qual is a strict subset of SELECT's own-OR-admin qual)
DROP POLICY eom_auto_selections_manage ON public.eom_auto_selections;
CREATE POLICY eom_auto_selections_manage_insert ON public.eom_auto_selections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_auto_selections_manage_update ON public.eom_auto_selections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));
CREATE POLICY eom_auto_selections_manage_delete ON public.eom_auto_selections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['super_admin'::app_role,'corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])));

-- learning_assignment_exemptions
DROP POLICY learning_assignment_exemptions_manage_policy ON public.learning_assignment_exemptions;
CREATE POLICY learning_assignment_exemptions_manage_insert ON public.learning_assignment_exemptions FOR INSERT TO authenticated WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_exemptions_manage_update ON public.learning_assignment_exemptions FOR UPDATE TO authenticated USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_exemptions_manage_delete ON public.learning_assignment_exemptions FOR DELETE TO authenticated USING (is_hr_or_admin((SELECT auth.uid())));

-- learning_assignment_user_overrides
DROP POLICY learning_assignment_user_overrides_manage_policy ON public.learning_assignment_user_overrides;
CREATE POLICY learning_assignment_user_overrides_manage_insert ON public.learning_assignment_user_overrides FOR INSERT TO authenticated WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_user_overrides_manage_update ON public.learning_assignment_user_overrides FOR UPDATE TO authenticated USING (is_hr_or_admin((SELECT auth.uid()))) WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY learning_assignment_user_overrides_manage_delete ON public.learning_assignment_user_overrides FOR DELETE TO authenticated USING (is_hr_or_admin((SELECT auth.uid())));

-- user_companies
DROP POLICY user_companies_modify_admin ON public.user_companies;
CREATE POLICY user_companies_modify_admin_insert ON public.user_companies FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY user_companies_modify_admin_update ON public.user_companies FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));
CREATE POLICY user_companies_modify_admin_delete ON public.user_companies FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

-- user_path_enrollments
DROP POLICY user_path_enrollments_own ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_own_insert ON public.user_path_enrollments FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY user_path_enrollments_own_update ON public.user_path_enrollments FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_path_enrollments_own_delete ON public.user_path_enrollments FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- user_properties (ALL qual is a strict subset of SELECT's admin-OR-own-OR-property-access qual)
DROP POLICY user_properties_modify_admin_hr ON public.user_properties;
CREATE POLICY user_properties_modify_admin_hr_insert ON public.user_properties FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY user_properties_modify_admin_hr_update ON public.user_properties FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY user_properties_modify_admin_hr_delete ON public.user_properties FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));

-- user_roles (ALL qual is a strict subset of SELECT's admin-OR-own-OR-shared-property qual;
-- this is the most security-critical table in the schema -- verified the admin-role branch is
-- identically reproduced inside consolidated_user_roles_select before touching it)
DROP POLICY user_roles_modify_admin_hr ON public.user_roles;
CREATE POLICY user_roles_modify_admin_hr_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY user_roles_modify_admin_hr_update ON public.user_roles FOR UPDATE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)) WITH CHECK (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));
CREATE POLICY user_roles_modify_admin_hr_delete ON public.user_roles FOR DELETE TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role) OR has_role((SELECT auth.uid()), 'regional_hr'::app_role));

-- notification_delivery_events (service_role has rolbypassrls=true; splitting is a no-op for it)
DROP POLICY service_role_full_access_notification_delivery_events ON public.notification_delivery_events;
CREATE POLICY notification_delivery_events_service_insert ON public.notification_delivery_events FOR INSERT TO public WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_delivery_events_service_update ON public.notification_delivery_events FOR UPDATE TO public USING ((SELECT auth.role()) = 'service_role'::text) WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_delivery_events_service_delete ON public.notification_delivery_events FOR DELETE TO public USING ((SELECT auth.role()) = 'service_role'::text);

-- notification_email_templates (service_role has rolbypassrls=true; splitting is a no-op for it)
DROP POLICY service_role_full_access_notification_email_templates ON public.notification_email_templates;
CREATE POLICY notification_email_templates_service_insert ON public.notification_email_templates FOR INSERT TO public WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_email_templates_service_update ON public.notification_email_templates FOR UPDATE TO public USING ((SELECT auth.role()) = 'service_role'::text) WITH CHECK ((SELECT auth.role()) = 'service_role'::text);
CREATE POLICY notification_email_templates_service_delete ON public.notification_email_templates FOR DELETE TO public USING ((SELECT auth.role()) = 'service_role'::text);
