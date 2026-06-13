-- AI Autonomous Governance Core Schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================
-- Policy Configuration & Versioning
-- =============================
CREATE TABLE IF NOT EXISTS public.ai_policy_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  active_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.ai_policy_sets
  ADD CONSTRAINT ai_policy_sets_domain_check
  CHECK (domain IN ('workflow', 'task', 'delegation', 'routing', 'sla', 'optimization'));

CREATE UNIQUE INDEX IF NOT EXISTS ai_policy_sets_domain_name_idx
  ON public.ai_policy_sets(domain, name);

CREATE TABLE IF NOT EXISTS public.ai_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_set_id UUID NOT NULL REFERENCES public.ai_policy_sets(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  policy_json JSONB NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.ai_policy_versions
  ADD CONSTRAINT ai_policy_versions_status_check
  CHECK (status IN ('draft', 'active', 'rolled_back', 'superseded'));

CREATE UNIQUE INDEX IF NOT EXISTS ai_policy_versions_set_version_idx
  ON public.ai_policy_versions(policy_set_id, version);

CREATE INDEX IF NOT EXISTS ai_policy_versions_set_status_idx
  ON public.ai_policy_versions(policy_set_id, status);

ALTER TABLE public.ai_policy_sets
  ADD CONSTRAINT ai_policy_sets_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES public.ai_policy_versions(id);

CREATE TABLE IF NOT EXISTS public.ai_policy_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_set_id UUID NOT NULL REFERENCES public.ai_policy_sets(id) ON DELETE CASCADE,
  from_version_id UUID REFERENCES public.ai_policy_versions(id),
  to_version_id UUID REFERENCES public.ai_policy_versions(id),
  proposal_id UUID,
  risk_score NUMERIC(4, 3),
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_policy_changes_set_idx
  ON public.ai_policy_changes(policy_set_id, applied_at);

-- =============================
-- AI Proposal & Decision Ledger
-- =============================
CREATE TABLE IF NOT EXISTS public.ai_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  proposal_json JSONB NOT NULL,
  requested_by UUID,
  policy_set_id UUID REFERENCES public.ai_policy_sets(id),
  base_version_id UUID REFERENCES public.ai_policy_versions(id),
  status TEXT NOT NULL DEFAULT 'pending',
  risk_score NUMERIC(4, 3),
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_proposals
  ADD CONSTRAINT ai_proposals_status_check
  CHECK (status IN ('pending', 'validated', 'needs_review', 'rejected', 'applied'));

CREATE INDEX IF NOT EXISTS ai_proposals_status_idx
  ON public.ai_proposals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.ai_proposals(id) ON DELETE CASCADE,
  decision_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  applied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================
-- Metrics & Rollback
-- =============================
CREATE TABLE IF NOT EXISTS public.ai_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  metrics_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_metrics_snapshots_window_idx
  ON public.ai_metrics_snapshots(window_end DESC);

CREATE TABLE IF NOT EXISTS public.ai_change_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_change_id UUID NOT NULL REFERENCES public.ai_policy_changes(id) ON DELETE CASCADE,
  baseline_metrics JSONB NOT NULL,
  post_metrics JSONB NOT NULL,
  result TEXT NOT NULL,
  rolled_back BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_change_evaluations
  ADD CONSTRAINT ai_change_evaluations_result_check
  CHECK (result IN ('improved', 'neutral', 'degraded'));

-- =============================
-- Safety & Constraints
-- =============================
CREATE TABLE IF NOT EXISTS public.ai_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  constraint_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_risk_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_apply_max NUMERIC(4, 3) NOT NULL,
  requires_review_min NUMERIC(4, 3) NOT NULL,
  blocked_min NUMERIC(4, 3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  schema_version TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================
-- Audit & Compliance
-- =============================
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_audit_logs_created_at_idx
  ON public.ai_audit_logs(created_at DESC);

-- =============================
-- Helper Functions
-- =============================
CREATE OR REPLACE FUNCTION public.get_active_policy(p_domain TEXT)
RETURNS TABLE(policy_set_id UUID, version_id UUID, version TEXT, policy_json JSONB)
LANGUAGE sql
STABLE
AS $$
  SELECT s.id, v.id, v.version, v.policy_json
  FROM public.ai_policy_sets s
  JOIN public.ai_policy_versions v ON v.id = s.active_version_id
  WHERE s.domain = p_domain
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- =============================
-- Seed Defaults
-- =============================
WITH policy_sets AS (
  INSERT INTO public.ai_policy_sets (name, domain)
  VALUES
    ('default_workflow', 'workflow'),
    ('default_task', 'task'),
    ('default_delegation', 'delegation'),
    ('default_routing', 'routing'),
    ('default_sla', 'sla'),
    ('default_optimization', 'optimization')
  ON CONFLICT (domain, name) DO NOTHING
  RETURNING id, domain
),
policy_jsons AS (
  SELECT
    id,
    domain,
    CASE domain
      WHEN 'workflow' THEN jsonb_build_object(
        'schema_version', '1.0',
        'routing_rules', jsonb_build_array(),
        'escalation_rules', jsonb_build_array(),
        'parallel_stages', jsonb_build_object('enabled', false, 'roles', jsonb_build_array()),
        'action_overrides', jsonb_build_object(),
        'scheduled_workflows', jsonb_build_object()
      )
      WHEN 'task' THEN jsonb_build_object(
        'schema_version', '1.0',
        'reprioritize_rules', jsonb_build_object('overdue_multiplier', 1.5),
        'reassignment_rules', jsonb_build_object('max_load_per_user', 25),
        'escalation_rules', jsonb_build_object('overdue_hours', 24)
      )
      WHEN 'delegation' THEN jsonb_build_object(
        'schema_version', '1.0',
        'absence_detection', jsonb_build_object('threshold_hours', 12),
        'delegate_selection', jsonb_build_object('strategy', 'least_loaded')
      )
      WHEN 'routing' THEN jsonb_build_object(
        'schema_version', '1.0',
        'routes', jsonb_build_array()
      )
      WHEN 'sla' THEN jsonb_build_object(
        'schema_version', '1.0',
        'escalation_rules', jsonb_build_array(),
        'default_threshold_hours', 48
      )
      WHEN 'optimization' THEN jsonb_build_object(
        'schema_version', '1.0',
        'allowed_changes', jsonb_build_array(
          'adjust_escalation_hours',
          'enable_parallel_stage',
          'adjust_reprioritize_multiplier',
          'adjust_delegate_strategy'
        ),
        'risk_limits', jsonb_build_object('max_risk_score', 0.3),
        'rollback_conditions', jsonb_build_object('sla_breach_rate_gt', 0.05, 'cycle_time_increase_gt', 0.1)
      )
    END AS policy_json
  FROM policy_sets
),
policy_versions AS (
  INSERT INTO public.ai_policy_versions (policy_set_id, version, policy_json, hash, status)
  SELECT
    id,
    'v1.0.0',
    policy_json,
    encode(digest(policy_json::text, 'sha256'), 'hex'),
    'active'
  FROM policy_jsons
  RETURNING id, policy_set_id
)
UPDATE public.ai_policy_sets s
SET active_version_id = v.id
FROM policy_versions v
WHERE v.policy_set_id = s.id;

INSERT INTO public.ai_constraints (name, constraint_json)
VALUES (
  'immutable_governance',
  jsonb_build_object(
    'schema_version', '1.0',
    'blocked_actions', jsonb_build_array(
      'modify_hierarchy',
      'modify_permissions',
      'modify_payroll',
      'modify_hr_legal',
      'modify_contracts',
      'modify_authority_limits',
      'modify_approval_chain'
    ),
    'blocked_domains', jsonb_build_array(
      'permissions',
      'hr_legal',
      'payroll',
      'contracts'
    ),
    'mandatory_approvals', jsonb_build_array('gm_final', 'director_final')
  )
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ai_risk_thresholds (auto_apply_max, requires_review_min, blocked_min)
VALUES (0.2, 0.2, 0.4)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_schema_registry (name, schema_version, schema_json)
VALUES
  (
    'optimization_proposal',
    '1.0',
    '{
      "type": "object",
      "required": ["decision_type", "policy_set", "policy_version_base", "changes", "risk_score"],
      "properties": {
        "decision_type": { "const": "workflow_optimization" },
        "policy_set": { "type": "string" },
        "policy_version_base": { "type": "string" },
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["action", "path", "value"],
            "properties": {
              "action": { "type": "string" },
              "path": { "type": "string" },
              "value": {},
              "old": {}
            },
            "additionalProperties": false
          }
        },
        "risk_score": { "type": "number", "minimum": 0, "maximum": 1 },
        "expected_outcomes": { "type": "object" },
        "rollback_conditions": { "type": "object" }
      },
      "additionalProperties": false
    }'::jsonb
  ),
  (
    'routing_proposal',
    '1.0',
    '{
      "type": "object",
      "required": ["decision_type", "policy_set", "policy_version_base", "changes", "risk_score"],
      "properties": {
        "decision_type": { "const": "routing_decision" },
        "policy_set": { "type": "string" },
        "policy_version_base": { "type": "string" },
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["action", "path", "value"],
            "properties": {
              "action": { "type": "string" },
              "path": { "type": "string" },
              "value": {},
              "old": {}
            },
            "additionalProperties": false
          }
        },
        "risk_score": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "additionalProperties": false
    }'::jsonb
  ),
  (
    'task_proposal',
    '1.0',
    '{
      "type": "object",
      "required": ["decision_type", "policy_set", "policy_version_base", "changes", "risk_score"],
      "properties": {
        "decision_type": { "const": "task_decision" },
        "policy_set": { "type": "string" },
        "policy_version_base": { "type": "string" },
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["action", "path", "value"],
            "properties": {
              "action": { "type": "string" },
              "path": { "type": "string" },
              "value": {},
              "old": {}
            },
            "additionalProperties": false
          }
        },
        "risk_score": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "additionalProperties": false
    }'::jsonb
  ),
  (
    'delegation_proposal',
    '1.0',
    '{
      "type": "object",
      "required": ["decision_type", "policy_set", "policy_version_base", "changes", "risk_score"],
      "properties": {
        "decision_type": { "const": "delegation_decision" },
        "policy_set": { "type": "string" },
        "policy_version_base": { "type": "string" },
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["action", "path", "value"],
            "properties": {
              "action": { "type": "string" },
              "path": { "type": "string" },
              "value": {},
              "old": {}
            },
            "additionalProperties": false
          }
        },
        "risk_score": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "additionalProperties": false
    }'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- =============================
-- RLS
-- =============================
ALTER TABLE public.ai_policy_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policy_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_change_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_risk_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_policy_sets_admin_read" ON public.ai_policy_sets
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_policy_versions_admin_read" ON public.ai_policy_versions
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_policy_changes_admin_read" ON public.ai_policy_changes
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_proposals_admin_read" ON public.ai_proposals
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_decisions_admin_read" ON public.ai_decisions
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_metrics_snapshots_admin_read" ON public.ai_metrics_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_change_evaluations_admin_read" ON public.ai_change_evaluations
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_constraints_admin_read" ON public.ai_constraints
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_risk_thresholds_admin_read" ON public.ai_risk_thresholds
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_schema_registry_admin_read" ON public.ai_schema_registry
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

CREATE POLICY "ai_audit_logs_admin_read" ON public.ai_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role_optimized('regional_admin'::app_role));

-- Allow admins to read, but all writes remain service-role only (service role bypasses RLS)
GRANT SELECT ON public.ai_policy_sets TO authenticated;
GRANT SELECT ON public.ai_policy_versions TO authenticated;
GRANT SELECT ON public.ai_policy_changes TO authenticated;
GRANT SELECT ON public.ai_proposals TO authenticated;
GRANT SELECT ON public.ai_decisions TO authenticated;
GRANT SELECT ON public.ai_metrics_snapshots TO authenticated;
GRANT SELECT ON public.ai_change_evaluations TO authenticated;
GRANT SELECT ON public.ai_constraints TO authenticated;
GRANT SELECT ON public.ai_risk_thresholds TO authenticated;
GRANT SELECT ON public.ai_schema_registry TO authenticated;
GRANT SELECT ON public.ai_audit_logs TO authenticated;

-- Keep ai_proposals updated_at fresh
CREATE TRIGGER update_ai_proposals_updated_at
  BEFORE UPDATE ON public.ai_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
