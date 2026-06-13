
-- Phase 3: Add indexes for unindexed foreign keys
-- These improve JOIN performance and DELETE cascade operations

-- training_modules
CREATE INDEX IF NOT EXISTS idx_training_modules_fk_template_id ON public.training_modules(template_id);

-- report_definitions
CREATE INDEX IF NOT EXISTS idx_report_definitions_fk_created_by ON public.report_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_report_definitions_fk_department_id ON public.report_definitions(department_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_fk_property_id ON public.report_definitions(property_id);

-- report_runs
CREATE INDEX IF NOT EXISTS idx_report_runs_fk_report_id ON public.report_runs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_fk_triggered_by ON public.report_runs(triggered_by);

-- audit_templates
CREATE INDEX IF NOT EXISTS idx_audit_templates_fk_created_by ON public.audit_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_templates_fk_department_id ON public.audit_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_templates_fk_property_id ON public.audit_templates(property_id);

-- audit_items
CREATE INDEX IF NOT EXISTS idx_audit_items_fk_template_id ON public.audit_items(template_id);

-- audit_runs
CREATE INDEX IF NOT EXISTS idx_audit_runs_fk_created_by ON public.audit_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_runs_fk_template_id ON public.audit_runs(template_id);

-- audit_findings
CREATE INDEX IF NOT EXISTS idx_audit_findings_fk_assigned_to ON public.audit_findings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_findings_fk_item_id ON public.audit_findings(item_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_fk_run_id ON public.audit_findings(run_id);

-- operations_sla_rules
CREATE INDEX IF NOT EXISTS idx_operations_sla_rules_fk_department_id ON public.operations_sla_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_operations_sla_rules_fk_property_id ON public.operations_sla_rules(property_id);

-- operations_sla_breaches
CREATE INDEX IF NOT EXISTS idx_operations_sla_breaches_fk_rule_id ON public.operations_sla_breaches(rule_id);

-- training_block_progress
CREATE INDEX IF NOT EXISTS idx_training_block_progress_fk_training_module_id ON public.training_block_progress(training_module_id);

-- motivational_content
CREATE INDEX IF NOT EXISTS idx_motivational_content_fk_created_by ON public.motivational_content(created_by);

-- referral_history
CREATE INDEX IF NOT EXISTS idx_referral_history_fk_changed_by ON public.referral_history(changed_by);

-- employee_of_the_month
CREATE INDEX IF NOT EXISTS idx_employee_of_the_month_fk_created_by ON public.employee_of_the_month(created_by);
;
