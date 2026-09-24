-- Gov module dropped per user authorization. Frontend pages deleted.
-- Views first (depend on tables)
DROP VIEW IF EXISTS public.gov_v_active_delegations CASCADE;
DROP VIEW IF EXISTS public.gov_v_department_accountability_gaps CASCADE;
DROP VIEW IF EXISTS public.gov_v_financial_override_events CASCADE;
DROP VIEW IF EXISTS public.gov_v_kpi_raci_gaps CASCADE;
DROP VIEW IF EXISTS public.gov_v_portfolio_executive_rollup CASCADE;
DROP VIEW IF EXISTS public.gov_v_property_executive_rollup CASCADE;
DROP VIEW IF EXISTS public.gov_v_separation_of_duties_conflicts CASCADE;

-- Functions
DROP FUNCTION IF EXISTS public.gov_expire_delegations(timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.gov_revoke_delegation(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.gov_set_feature_flag(text, boolean, text) CASCADE;

-- Tables (CASCADE handles FK dependencies automatically)
DROP TABLE IF EXISTS public.gov_role_catalog CASCADE;
DROP TABLE IF EXISTS public.gov_legacy_role_map CASCADE;
DROP TABLE IF EXISTS public.gov_feature_flags CASCADE;
DROP TABLE IF EXISTS public.gov_exec_metric_catalog CASCADE;
DROP TABLE IF EXISTS public.gov_kpi_catalog CASCADE;
DROP TABLE IF EXISTS public.gov_incident_reports CASCADE;
DROP TABLE IF EXISTS public.gov_incident_escalation_chain CASCADE;
DROP TABLE IF EXISTS public.gov_budget_cycles CASCADE;
DROP TABLE IF EXISTS public.gov_department_budgets CASCADE;
DROP TABLE IF EXISTS public.gov_department_kpi_targets CASCADE;
DROP TABLE IF EXISTS public.gov_exec_metric_facts CASCADE;
DROP TABLE IF EXISTS public.gov_financial_actions_log CASCADE;
DROP TABLE IF EXISTS public.gov_financial_approval_policies CASCADE;
DROP TABLE IF EXISTS public.gov_authority_delegations CASCADE;
DROP TABLE IF EXISTS public.gov_delegation_audit_log CASCADE;
DROP TABLE IF EXISTS public.gov_risk_heatmap_snapshots CASCADE;
DROP TABLE IF EXISTS public.gov_ownership_entities CASCADE;
DROP TABLE IF EXISTS public.gov_owner_visibility_grants CASCADE;
DROP TABLE IF EXISTS public.gov_property_clusters CASCADE;
DROP TABLE IF EXISTS public.gov_property_executive_assignments CASCADE;
DROP TABLE IF EXISTS public.gov_portfolio_role_assignments CASCADE;
DROP TABLE IF EXISTS public.gov_kpi_raci_assignments CASCADE;
DROP TABLE IF EXISTS public.gov_portfolios CASCADE;
DROP TABLE IF EXISTS public.gov_property_portfolios CASCADE;
DROP TABLE IF EXISTS public.gov_cluster_properties CASCADE;
DROP TABLE IF EXISTS public.gov_user_role_assignments CASCADE;
DROP TABLE IF EXISTS public.gov_department_governance CASCADE;
DROP TABLE IF EXISTS public.gov_control_audit_log CASCADE;
