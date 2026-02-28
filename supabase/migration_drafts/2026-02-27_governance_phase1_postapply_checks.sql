-- Governance Phase 1 Post-Apply Checks
-- Run after applying minimal foundation or full additive draft in staging.

BEGIN;

-- Required control tables
SELECT 'gov_feature_flags_exists' AS check_name, (to_regclass('public.gov_feature_flags') IS NOT NULL) AS pass;
SELECT 'gov_role_catalog_exists' AS check_name, (to_regclass('public.gov_role_catalog') IS NOT NULL) AS pass;
SELECT 'gov_legacy_role_map_exists' AS check_name, (to_regclass('public.gov_legacy_role_map') IS NOT NULL) AS pass;

-- Feature flags must remain disabled unless explicit activation step happened
SELECT
  flag_key,
  is_enabled,
  CASE WHEN is_enabled = false THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.gov_feature_flags
WHERE flag_key IN (
  'governance_rbac_enabled',
  'governance_financial_controls_enabled',
  'governance_incident_engine_enabled',
  'governance_exec_dashboards_enabled'
)
ORDER BY flag_key;

-- Role hierarchy seed validation
SELECT
  COUNT(*)::int AS governance_roles_seeded,
  CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.gov_role_catalog;

-- Legacy mapping completeness validation
SELECT
  COUNT(*)::int AS legacy_mappings_seeded,
  CASE WHEN COUNT(*) >= 8 THEN 'PASS' ELSE 'FAIL' END AS status
FROM public.gov_legacy_role_map;

-- RLS policy bootstrap validation (minimal foundation scope)
SELECT
  tablename,
  COUNT(*)::int AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'gov_feature_flags',
    'gov_role_catalog',
    'gov_legacy_role_map',
    'gov_user_role_assignments',
    'gov_ownership_entities',
    'gov_portfolios',
    'gov_property_portfolios',
    'gov_property_clusters',
    'gov_cluster_properties'
  )
GROUP BY tablename
ORDER BY tablename;

COMMIT;
