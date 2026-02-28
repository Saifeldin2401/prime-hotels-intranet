-- Governance Phase 1 follow-up: add covering indexes for FK columns
-- Safe additive migration, no behavior changes.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_gov_feature_flags_updated_by
    ON public.gov_feature_flags (updated_by);

CREATE INDEX IF NOT EXISTS idx_gov_legacy_role_map_governance_role_code
    ON public.gov_legacy_role_map (governance_role_code);

CREATE INDEX IF NOT EXISTS idx_gov_portfolios_ownership_entity_id
    ON public.gov_portfolios (ownership_entity_id);

CREATE INDEX IF NOT EXISTS idx_gov_role_catalog_parent_role_code
    ON public.gov_role_catalog (parent_role_code);

CREATE INDEX IF NOT EXISTS idx_gov_user_role_assignments_assigned_by
    ON public.gov_user_role_assignments (assigned_by);

COMMIT;
