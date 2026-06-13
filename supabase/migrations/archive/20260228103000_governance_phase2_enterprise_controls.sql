-- DRAFT MIGRATION (SAFE MODE, ADDITIVE ONLY)
-- Date: 2026-02-27
-- Scope: Enterprise hospitality governance foundation
-- Safety:
--   1) No destructive DROP of existing application objects
--   2) No enum replacement / no role rewiring
--   3) No mutation of existing RLS policies
--   4) No activation of new authorization paths
-- Apply only after staging validation.

BEGIN;

-- Feature flags (all OFF by default)
CREATE TABLE IF NOT EXISTS public.gov_feature_flags (
  flag_key text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gov_feature_flags (flag_key, is_enabled, description)
VALUES
  ('governance_rbac_enabled', false, 'Enable governance role model for runtime authorization'),
  ('governance_financial_controls_enabled', false, 'Enable financial authority matrix enforcement'),
  ('governance_incident_engine_enabled', false, 'Enable incident escalation engine'),
  ('governance_exec_dashboards_enabled', false, 'Enable executive dashboard rollups')
ON CONFLICT (flag_key) DO NOTHING;

-- Governance role catalog and legacy mapping (parallel to existing app_role)
CREATE TABLE IF NOT EXISTS public.gov_role_catalog (
  role_code text PRIMARY KEY,
  role_name text NOT NULL,
  tier smallint NOT NULL CHECK (tier BETWEEN 1 AND 20),
  authority_scope text NOT NULL CHECK (authority_scope IN ('team', 'department', 'property', 'cluster', 'portfolio', 'corporate', 'owner')),
  parent_role_code text REFERENCES public.gov_role_catalog(role_code) ON DELETE SET NULL,
  is_executive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gov_role_catalog (role_code, role_name, tier, authority_scope, parent_role_code, is_executive)
VALUES
  ('team_member', 'Team Member', 10, 'team', NULL, false),
  ('supervisor', 'Supervisor', 9, 'team', 'team_member', false),
  ('assistant_manager', 'Assistant Manager', 8, 'department', 'supervisor', false),
  ('manager', 'Manager', 7, 'department', 'assistant_manager', false),
  ('department_head', 'Department Head', 6, 'department', 'manager', true),
  ('executive_committee_member', 'Executive Committee Member', 5, 'property', 'department_head', true),
  ('general_manager', 'General Manager', 4, 'property', 'executive_committee_member', true),
  ('cluster_gm', 'Cluster GM', 3, 'cluster', 'general_manager', true),
  ('area_gm', 'Area GM', 2, 'portfolio', 'cluster_gm', true),
  ('corporate', 'Corporate Office', 1, 'corporate', 'area_gm', true),
  ('owner_observer', 'Owner / Investor Observer', 1, 'owner', NULL, true)
ON CONFLICT (role_code) DO UPDATE
SET
  role_name = EXCLUDED.role_name,
  tier = EXCLUDED.tier,
  authority_scope = EXCLUDED.authority_scope,
  parent_role_code = EXCLUDED.parent_role_code,
  is_executive = EXCLUDED.is_executive;

CREATE TABLE IF NOT EXISTS public.gov_legacy_role_map (
  legacy_role public.app_role PRIMARY KEY,
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  mapping_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gov_legacy_role_map (legacy_role, governance_role_code, mapping_notes)
VALUES
  ('corporate_admin', 'corporate', 'Legacy corporate admin mapped to corporate governance layer'),
  ('regional_admin', 'area_gm', 'Legacy regional admin mapped to area/cluster governance tier'),
  ('regional_hr', 'executive_committee_member', 'Interim mapping until dedicated corporate-HR governance role is introduced'),
  ('property_manager', 'general_manager', 'Legacy property manager mapped to GM tier'),
  ('property_hr', 'department_head', 'Interim mapping for property-HR governance authority'),
  ('department_head', 'department_head', 'Direct mapping'),
  ('manager', 'manager', 'Direct mapping'),
  ('staff', 'team_member', 'Direct mapping')
ON CONFLICT (legacy_role) DO UPDATE
SET
  governance_role_code = EXCLUDED.governance_role_code,
  mapping_notes = EXCLUDED.mapping_notes;

CREATE TABLE IF NOT EXISTS public.gov_user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  scope_type text NOT NULL CHECK (scope_type IN ('department', 'property', 'cluster', 'portfolio', 'corporate')),
  scope_id uuid,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_primary boolean NOT NULL DEFAULT false,
  assignment_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_gov_user_role_assignments_user ON public.gov_user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_user_role_assignments_scope ON public.gov_user_role_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_gov_user_role_assignments_role ON public.gov_user_role_assignments(governance_role_code);

-- Portfolio / cluster / ownership structure
CREATE TABLE IF NOT EXISTS public.gov_ownership_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('owner', 'investor', 'management_company', 'joint_venture')),
  country_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gov_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_entity_id uuid NOT NULL REFERENCES public.gov_ownership_entities(id) ON DELETE RESTRICT,
  portfolio_code text NOT NULL UNIQUE,
  portfolio_name text NOT NULL,
  reporting_currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gov_property_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.gov_portfolios(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE (property_id, portfolio_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.gov_property_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.gov_portfolios(id) ON DELETE CASCADE,
  cluster_code text NOT NULL,
  cluster_name text NOT NULL,
  area_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, cluster_code)
);

CREATE TABLE IF NOT EXISTS public.gov_cluster_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.gov_property_clusters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE (cluster_id, property_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.gov_portfolio_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.gov_portfolios(id) ON DELETE CASCADE,
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  UNIQUE (user_id, portfolio_id, governance_role_code, starts_at)
);

CREATE TABLE IF NOT EXISTS public.gov_property_executive_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  authority_scope text NOT NULL CHECK (authority_scope IN ('team', 'department', 'property', 'cluster', 'portfolio', 'corporate')),
  acting_for_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  assignment_source text NOT NULL DEFAULT 'manual' CHECK (assignment_source IN ('manual', 'delegation', 'workflow')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.gov_owner_visibility_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ownership_entity_id uuid NOT NULL REFERENCES public.gov_ownership_entities(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES public.gov_portfolios(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  can_view_financial_summary boolean NOT NULL DEFAULT true,
  can_view_operational_summary boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  restriction_notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (portfolio_id IS NOT NULL OR property_id IS NOT NULL)
);

-- Department governance / KPI / RACI
CREATE TABLE IF NOT EXISTS public.gov_department_governance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL UNIQUE REFERENCES public.departments(id) ON DELETE CASCADE,
  head_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cost_center_code text UNIQUE,
  budget_owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payroll_visibility_scope text NOT NULL DEFAULT 'gm_and_hr'
    CHECK (payroll_visibility_scope IN ('none', 'department_head_only', 'hr_only', 'gm_and_hr', 'corporate_only')),
  revenue_generating boolean NOT NULL DEFAULT false,
  annual_revenue_target numeric(14,2),
  annual_opex_budget numeric(14,2),
  annual_capex_budget numeric(14,2),
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gov_kpi_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code text NOT NULL UNIQUE,
  kpi_name text NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('department', 'property', 'portfolio', 'corporate')),
  category text NOT NULL CHECK (category IN ('financial', 'operational', 'guest', 'people', 'risk')),
  target_direction text NOT NULL CHECK (target_direction IN ('higher_better', 'lower_better', 'range')),
  unit text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gov_kpi_catalog (kpi_code, kpi_name, scope_type, category, target_direction, unit)
VALUES
  ('guest_satisfaction_index', 'Guest Satisfaction Index', 'property', 'guest', 'higher_better', 'score'),
  ('staff_turnover_rate', 'Staff Turnover Rate', 'property', 'people', 'lower_better', 'percent'),
  ('budget_variance_pct', 'Budget Variance %', 'department', 'financial', 'lower_better', 'percent'),
  ('forecast_accuracy_pct', 'Forecast Accuracy %', 'property', 'financial', 'higher_better', 'percent'),
  ('revpar', 'Revenue Per Available Room (RevPAR)', 'property', 'financial', 'higher_better', 'currency'),
  ('goppar', 'Gross Operating Profit Per Available Room (GOPPAR)', 'property', 'financial', 'higher_better', 'currency'),
  ('ebitda_margin_pct', 'EBITDA Margin %', 'portfolio', 'financial', 'higher_better', 'percent'),
  ('operational_bottleneck_index', 'Operational Bottleneck Index', 'department', 'operational', 'lower_better', 'index')
ON CONFLICT (kpi_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gov_department_kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  kpi_id uuid NOT NULL REFERENCES public.gov_kpi_catalog(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  target_value numeric(14,4) NOT NULL,
  warning_threshold numeric(14,4),
  critical_threshold numeric(14,4),
  measurement_period text NOT NULL CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE (department_id, kpi_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.gov_kpi_raci_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.gov_kpi_catalog(id) ON DELETE CASCADE,
  scope_entity_type text NOT NULL CHECK (scope_entity_type IN ('department', 'property', 'portfolio', 'corporate')),
  scope_entity_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raci_role char(1) NOT NULL CHECK (raci_role IN ('R', 'A', 'C', 'I')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gov_kpi_raci_single_accountable_active
  ON public.gov_kpi_raci_assignments (kpi_id, scope_entity_type, scope_entity_id)
  WHERE raci_role = 'A' AND ends_at IS NULL;

-- Financial controls (role-based limits, capex/opex, audit trail)
CREATE TABLE IF NOT EXISTS public.gov_budget_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name text NOT NULL UNIQUE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on)
);

CREATE TABLE IF NOT EXISTS public.gov_department_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_cycle_id uuid NOT NULL REFERENCES public.gov_budget_cycles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  opex_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (opex_budget >= 0),
  capex_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (capex_budget >= 0),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_cycle_id, department_id)
);

CREATE TABLE IF NOT EXISTS public.gov_financial_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_type text NOT NULL CHECK (approval_type IN ('opex', 'capex', 'purchase', 'expense_claim', 'contract')),
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  min_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  max_amount numeric(14,2),
  require_next_level boolean NOT NULL DEFAULT false,
  next_level_role_code text REFERENCES public.gov_role_catalog(role_code) ON DELETE SET NULL,
  allow_emergency_override boolean NOT NULL DEFAULT false,
  dual_approval_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_amount IS NULL OR max_amount > min_amount)
);

CREATE TABLE IF NOT EXISTS public.gov_financial_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('budget_submit', 'budget_approve', 'budget_reject', 'purchase_approve', 'purchase_reject', 'expense_approve', 'expense_reject', 'override')),
  entity_type text NOT NULL,
  entity_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role_code text REFERENCES public.gov_role_catalog(role_code) ON DELETE SET NULL,
  amount numeric(14,2),
  currency text NOT NULL DEFAULT 'USD',
  approval_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  was_override boolean NOT NULL DEFAULT false,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Incident / crisis / escalation model
CREATE TABLE IF NOT EXISTS public.gov_incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  current_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category text NOT NULL CHECK (category IN ('safety', 'security', 'financial', 'operational', 'guest', 'regulatory', 'technology', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'contained', 'resolved', 'closed')),
  summary text NOT NULL,
  details text,
  occurred_at timestamptz NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  risk_score numeric(6,2) CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gov_incident_escalation_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.gov_incident_reports(id) ON DELETE CASCADE,
  escalation_level integer NOT NULL CHECK (escalation_level >= 1),
  target_role_code text REFERENCES public.gov_role_catalog(role_code) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at timestamptz,
  acknowledged_at timestamptz,
  actioned_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'actioned', 'skipped', 'expired')),
  escalation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, escalation_level)
);

CREATE TABLE IF NOT EXISTS public.gov_risk_heatmap_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  scope_type text NOT NULL CHECK (scope_type IN ('property', 'portfolio', 'corporate')),
  scope_id uuid,
  heatmap_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scope_type = 'corporate' OR scope_id IS NOT NULL)
);

-- Delegation / temporary authority
CREATE TABLE IF NOT EXISTS public.gov_authority_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  governance_role_code text NOT NULL REFERENCES public.gov_role_catalog(role_code) ON DELETE RESTRICT,
  scope_type text NOT NULL CHECK (scope_type IN ('department', 'property', 'cluster', 'portfolio', 'corporate')),
  scope_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  acting_assignment boolean NOT NULL DEFAULT false,
  emergency_delegation boolean NOT NULL DEFAULT false,
  max_financial_limit numeric(14,2),
  delegation_reason text,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (delegate_id <> delegator_id),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.gov_delegation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id uuid NOT NULL REFERENCES public.gov_authority_delegations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'accepted', 'rejected', 'revoked', 'expired', 'used')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Executive dashboard metric model
CREATE TABLE IF NOT EXISTS public.gov_exec_metric_catalog (
  metric_code text PRIMARY KEY,
  metric_name text NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('department', 'property', 'portfolio', 'corporate')),
  category text NOT NULL CHECK (category IN ('financial', 'operational', 'guest', 'people', 'risk')),
  default_unit text,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gov_exec_metric_catalog (metric_code, metric_name, scope_type, category, default_unit, is_required)
VALUES
  ('department_performance_score', 'Department Performance Score', 'department', 'operational', 'score', true),
  ('revenue_summary', 'Revenue Summary', 'property', 'financial', 'currency', true),
  ('cost_ratio', 'Cost Ratio', 'property', 'financial', 'percent', true),
  ('guest_satisfaction_index', 'Guest Satisfaction Index', 'property', 'guest', 'score', true),
  ('staff_turnover', 'Staff Turnover', 'property', 'people', 'percent', true),
  ('budget_vs_actual', 'Budget vs Actual', 'department', 'financial', 'currency', true),
  ('forecast_accuracy', 'Forecast Accuracy', 'property', 'financial', 'percent', true),
  ('operational_bottlenecks', 'Operational Bottlenecks', 'department', 'operational', 'index', true),
  ('ebitda', 'EBITDA', 'portfolio', 'financial', 'currency', true),
  ('revpar', 'RevPAR', 'property', 'financial', 'currency', true),
  ('goppar', 'GOPPAR', 'property', 'financial', 'currency', true),
  ('risk_alert_count', 'Risk Alert Count', 'property', 'risk', 'count', true)
ON CONFLICT (metric_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gov_exec_metric_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code text NOT NULL REFERENCES public.gov_exec_metric_catalog(metric_code) ON DELETE CASCADE,
  metric_date date NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES public.gov_portfolios(id) ON DELETE CASCADE,
  metric_value numeric(16,4) NOT NULL,
  dimension_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (property_id IS NOT NULL OR department_id IS NOT NULL OR portfolio_id IS NOT NULL)
);

-- Governance helper functions
CREATE OR REPLACE FUNCTION public.gov_is_governance_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('corporate_admin'::public.app_role, 'regional_admin'::public.app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.gov_is_flag_enabled(p_flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT gf.is_enabled
    FROM public.gov_feature_flags gf
    WHERE gf.flag_key = p_flag_key
  ), false);
$$;

-- Executive views (read model only, no write path)
CREATE OR REPLACE VIEW public.gov_v_department_accountability_gaps
WITH (security_invoker = true) AS
SELECT
  d.id AS department_id,
  d.property_id,
  d.name AS department_name,
  (gd.head_user_id IS NULL) AS missing_department_head,
  (gd.budget_owner_user_id IS NULL) AS missing_budget_owner,
  NOT EXISTS (
    SELECT 1
    FROM public.gov_department_kpi_targets kt
    WHERE kt.department_id = d.id
      AND (kt.effective_to IS NULL OR kt.effective_to >= CURRENT_DATE)
  ) AS missing_kpi_targets,
  NOT EXISTS (
    SELECT 1
    FROM public.gov_kpi_raci_assignments ra
    WHERE ra.scope_entity_type = 'department'
      AND ra.scope_entity_id = d.id
      AND ra.raci_role = 'A'
      AND ra.ends_at IS NULL
  ) AS missing_accountable_raci
FROM public.departments d
LEFT JOIN public.gov_department_governance gd
  ON gd.department_id = d.id
WHERE COALESCE(d.is_active, true);

CREATE OR REPLACE VIEW public.gov_v_property_executive_rollup
WITH (security_invoker = true) AS
SELECT
  p.id AS property_id,
  p.name AS property_name,
  COALESCE(SUM(CASE WHEN ef.metric_code = 'revenue_summary' THEN ef.metric_value ELSE 0 END), 0)::numeric(14,2) AS revenue_30d,
  COALESCE(AVG(CASE WHEN ef.metric_code = 'revpar' THEN ef.metric_value END), 0)::numeric(12,2) AS avg_revpar_30d,
  COALESCE(AVG(CASE WHEN ef.metric_code = 'guest_satisfaction_index' THEN ef.metric_value END), 0)::numeric(8,2) AS avg_guest_satisfaction_30d,
  COALESCE(SUM(CASE WHEN ef.metric_code = 'risk_alert_count' THEN ef.metric_value ELSE 0 END), 0)::int AS risk_alert_count_30d
FROM public.properties p
LEFT JOIN public.gov_exec_metric_facts ef
  ON ef.property_id = p.id
  AND ef.metric_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE COALESCE(p.is_active, true)
GROUP BY p.id, p.name;

CREATE OR REPLACE VIEW public.gov_v_portfolio_executive_rollup
WITH (security_invoker = true) AS
SELECT
  pf.id AS portfolio_id,
  pf.portfolio_code,
  pf.portfolio_name,
  COUNT(DISTINCT pp.property_id)::int AS property_count,
  COALESCE(SUM(pr.revenue_30d), 0)::numeric(16,2) AS portfolio_revenue_30d,
  COALESCE(AVG(pr.avg_revpar_30d), 0)::numeric(12,2) AS portfolio_avg_revpar_30d,
  COALESCE(AVG(pr.avg_guest_satisfaction_30d), 0)::numeric(8,2) AS portfolio_guest_satisfaction_30d,
  COALESCE(SUM(pr.risk_alert_count_30d), 0)::int AS risk_alert_count_30d
FROM public.gov_portfolios pf
LEFT JOIN public.gov_property_portfolios pp
  ON pp.portfolio_id = pf.id
  AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE)
LEFT JOIN public.gov_v_property_executive_rollup pr
  ON pr.property_id = pp.property_id
GROUP BY pf.id, pf.portfolio_code, pf.portfolio_name;

CREATE OR REPLACE VIEW public.gov_v_kpi_raci_gaps
WITH (security_invoker = true) AS
SELECT
  k.id AS kpi_id,
  k.kpi_code,
  k.kpi_name,
  k.scope_type
FROM public.gov_kpi_catalog k
WHERE k.is_active
  AND NOT EXISTS (
    SELECT 1
    FROM public.gov_kpi_raci_assignments gk
    WHERE gk.kpi_id = k.id
      AND gk.raci_role = 'A'
      AND gk.ends_at IS NULL
  );

-- RLS enablement and admin-only bootstrap policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'gov_feature_flags',
    'gov_role_catalog',
    'gov_legacy_role_map',
    'gov_user_role_assignments',
    'gov_ownership_entities',
    'gov_portfolios',
    'gov_property_portfolios',
    'gov_property_clusters',
    'gov_cluster_properties',
    'gov_portfolio_role_assignments',
    'gov_property_executive_assignments',
    'gov_owner_visibility_grants',
    'gov_department_governance',
    'gov_kpi_catalog',
    'gov_department_kpi_targets',
    'gov_kpi_raci_assignments',
    'gov_budget_cycles',
    'gov_department_budgets',
    'gov_financial_approval_policies',
    'gov_financial_actions_log',
    'gov_incident_reports',
    'gov_incident_escalation_chain',
    'gov_risk_heatmap_snapshots',
    'gov_authority_delegations',
    'gov_delegation_audit_log',
    'gov_exec_metric_catalog',
    'gov_exec_metric_facts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS gov_admin_manage ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY gov_admin_manage ON public.%I FOR ALL TO authenticated USING (public.gov_is_governance_admin()) WITH CHECK (public.gov_is_governance_admin())',
      tbl
    );
  END LOOP;
END $$;

COMMIT;
