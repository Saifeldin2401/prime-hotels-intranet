-- ============================================================================
-- Migration: 20260901130000_purge_legacy_database_tables.sql
-- Description: Comprehensive database purge of ~75 legacy tables, obsolete views,
--              functions, and triggers from discontinued domains (Finance, Maintenance,
--              Procurement, Capex, Legacy HR, Legacy Workflow Engine, Legacy Audits).
-- Platform Focus: Training + Knowledge Base + Learning + Quizzes + Assessments + AI Engine
-- ============================================================================

-- 1. DROP OBSOLETE VIEWS
DROP VIEW IF EXISTS public.media_access_logs_v CASCADE;

-- 2. DROP OBSOLETE FINANCE TABLES
DROP TABLE IF EXISTS public.fiscal_period_closes CASCADE;
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.tax_returns CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.expense_claims CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.eosb_calculations CASCADE;
DROP TABLE IF EXISTS public.payslips CASCADE;
DROP TABLE IF EXISTS public.salary_components CASCADE;

-- 3. DROP OBSOLETE PROCUREMENT & SUPPLY CHAIN TABLES
DROP TABLE IF EXISTS public.po_receipts CASCADE;
DROP TABLE IF EXISTS public.goods_received_notes CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.purchase_requests CASCADE;
DROP TABLE IF EXISTS public.supplier_scorecards CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- 4. DROP OBSOLETE MAINTENANCE & PROPERTY OPS TABLES
DROP TABLE IF EXISTS public.capex_expenditures CASCADE;
DROP TABLE IF EXISTS public.capex_milestones CASCADE;
DROP TABLE IF EXISTS public.capex_project_templates CASCADE;
DROP TABLE IF EXISTS public.capex_projects CASCADE;
DROP TABLE IF EXISTS public.housekeeping_dispatch CASCADE;
DROP TABLE IF EXISTS public.housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS public.maintenance_attachments CASCADE;
DROP TABLE IF EXISTS public.maintenance_comments CASCADE;
DROP TABLE IF EXISTS public.maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.maintenance_sla_policies CASCADE;
DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
DROP TABLE IF EXISTS public.preventive_maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.pre_opening_checklist_items CASCADE;
DROP TABLE IF EXISTS public.room_inspections CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.logbook_entries CASCADE;
DROP TABLE IF EXISTS public.lost_found_items CASCADE;
DROP TABLE IF EXISTS public.vip_guest_preferences CASCADE;
DROP TABLE IF EXISTS public.vip_guests CASCADE;

-- 5. DROP OBSOLETE LEGACY HR & SOCIAL TABLES
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.employee_promotions CASCADE;
DROP TABLE IF EXISTS public.employee_referrals CASCADE;
DROP TABLE IF EXISTS public.employee_transfers CASCADE;
DROP TABLE IF EXISTS public.eom_auto_selections CASCADE;
DROP TABLE IF EXISTS public.eom_automation_config CASCADE;
DROP TABLE IF EXISTS public.eom_scoring_history CASCADE;
DROP TABLE IF EXISTS public.feed_comments CASCADE;
DROP TABLE IF EXISTS public.feed_reactions CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.job_postings CASCADE;
DROP TABLE IF EXISTS public.job_title_role_mappings CASCADE;
DROP TABLE IF EXISTS public.job_titles CASCADE;
DROP TABLE IF EXISTS public.kudos_likes CASCADE;
DROP TABLE IF EXISTS public.kudos CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;
DROP TABLE IF EXISTS public.onboarding_tasks CASCADE;
DROP TABLE IF EXISTS public.onboarding_templates CASCADE;
DROP TABLE IF EXISTS public.onboarding_process CASCADE;
DROP TABLE IF EXISTS public.partner_briefing_requests CASCADE;
DROP TABLE IF EXISTS public.performance_reviews CASCADE;
DROP TABLE IF EXISTS public.referral_history CASCADE;
DROP TABLE IF EXISTS public.saudization_nitaqat_snapshots CASCADE;
DROP TABLE IF EXISTS public.user_vacation_balance CASCADE;
DROP TABLE IF EXISTS public.hospitality_news CASCADE;
DROP TABLE IF EXISTS public.user_companies CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 6. DROP OBSOLETE LEGACY WORKFLOW ENGINE & APPROVALS TABLES
DROP TABLE IF EXISTS public.escalation_rules CASCADE;
DROP TABLE IF EXISTS public.workflow_steps CASCADE;
DROP TABLE IF EXISTS public.workflow_schedules CASCADE;
DROP TABLE IF EXISTS public.workflow_executions CASCADE;
DROP TABLE IF EXISTS public.workflow_definitions CASCADE;
DROP TABLE IF EXISTS public.approval_history CASCADE;
DROP TABLE IF EXISTS public.approval_requests CASCADE;
DROP TABLE IF EXISTS public.delegations CASCADE;
DROP TABLE IF EXISTS public.request_attachments CASCADE;
DROP TABLE IF EXISTS public.request_comments CASCADE;
DROP TABLE IF EXISTS public.request_events CASCADE;
DROP TABLE IF EXISTS public.request_sla_policies CASCADE;
DROP TABLE IF EXISTS public.request_steps CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.guest_requests CASCADE;

-- 7. DROP OBSOLETE LEGACY AUDITS TABLES
DROP TABLE IF EXISTS public.audit_findings CASCADE;
DROP TABLE IF EXISTS public.audit_items CASCADE;
DROP TABLE IF EXISTS public.audit_runs CASCADE;
DROP TABLE IF EXISTS public.audit_templates CASCADE;

-- 8. DROP OBSOLETE MEDIA / UNUSED TABLES
DROP TABLE IF EXISTS public.media_collection_items CASCADE;
DROP TABLE IF EXISTS public.media_collections CASCADE;
DROP TABLE IF EXISTS public.media_asset_usages CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;

-- 9. DROP OBSOLETE DATABASE FUNCTIONS
DROP FUNCTION IF EXISTS public.apply_maintenance_sla() CASCADE;
DROP FUNCTION IF EXISTS public.apply_promotion(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.apply_request_priority_default() CASCADE;
DROP FUNCTION IF EXISTS public.apply_request_step_sla() CASCADE;
DROP FUNCTION IF EXISTS public.apply_transfer(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.approve_eom_selection(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.approve_leave_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.assign_maintenance_ticket(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.attendance_check_in(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.attendance_check_out(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_delete_media_storage() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_eom_score(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_leave(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_purchase_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_feed_item(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_approvals() CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_maintenance() CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_requests() CASCADE;
DROP FUNCTION IF EXISTS public.complete_maintenance_ticket(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_request_for_invoice() CASCADE;
DROP FUNCTION IF EXISTS public.create_request_for_leave_request() CASCADE;
DROP FUNCTION IF EXISTS public.decide_purchase_request(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.decrement_media_usage_count() CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_expense_receipt_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_maintenance_attachment_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_media_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_payslip_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_vacation_balance(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_media_usage_count() CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_capex_project_spent_amount() CASCADE;
DROP FUNCTION IF EXISTS public.reject_leave_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.replace_workflow_steps(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.run_eom_calculation(text) CASCADE;
DROP FUNCTION IF EXISTS public.search_media_assets(text, uuid, text, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.set_media_download_headers() CASCADE;
DROP FUNCTION IF EXISTS public.submit_expense_claim(uuid, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_transfer_request(uuid, uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_leave_request_status() CASCADE;
DROP FUNCTION IF EXISTS public.sync_lms_to_onboarding() CASCADE;
DROP FUNCTION IF EXISTS public.sync_request_due_at() CASCADE;
DROP FUNCTION IF EXISTS public.toggle_kudos_like(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_maintenance_tickets_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_shifts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_workflow_updated_at() CASCADE;
