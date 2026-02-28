-- Governance Phase 1 (Minimal Foundation, Safe Additive)
-- Purpose:
--   - Establish governance role catalog and portfolio hierarchy
--   - Keep all feature flags OFF by default
--   - No runtime cutover, no changes to legacy RBAC path
-- Safety:
--   - Additive only
--   - No destructive rewrite of existing app schema

BEGIN;

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Governance role model
-- ---------------------------------------------------------------------------

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
  is_executive = EXCLUDED.is_executive,
  updated_at = now();

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

-- ---------------------------------------------------------------------------
-- Portfolio and ownership hierarchy
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_gov_property_portfolios_property ON public.gov_property_portfolios(property_id);
CREATE INDEX IF NOT EXISTS idx_gov_property_portfolios_portfolio ON public.gov_property_portfolios(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_gov_cluster_properties_cluster ON public.gov_cluster_properties(cluster_id);
CREATE INDEX IF NOT EXISTS idx_gov_cluster_properties_property ON public.gov_cluster_properties(property_id);

-- ---------------------------------------------------------------------------
-- Governance admin helpers and baseline RLS
-- ---------------------------------------------------------------------------

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
    'gov_cluster_properties'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = 'gov_admin_manage'
    ) THEN
      EXECUTE format(
        'CREATE POLICY gov_admin_manage ON public.%I FOR ALL TO authenticated USING (public.gov_is_governance_admin()) WITH CHECK (public.gov_is_governance_admin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
