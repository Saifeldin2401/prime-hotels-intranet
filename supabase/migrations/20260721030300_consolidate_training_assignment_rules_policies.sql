-- =============================================================================
-- Performance: consolidate multiple_permissive_policies on training_assignment_rules
-- =============================================================================
-- The table carried a broad "Training rules manageable by admins" FOR ALL
-- policy (roles: super_admin, corporate_admin, regional_admin, regional_hr,
-- property_manager) *stacked* on top of four narrower per-command policies
-- (training_assignment_rules_select/insert/update/delete) whose role sets
-- (corporate_admin, regional_admin, regional_hr, property_manager — missing
-- super_admin) are a strict subset of the ALL policy's. Because permissive
-- policies are OR'd, the four narrower policies were fully redundant: the ALL
-- policy already grants every permission they grant, for every command.
--
-- Dropping them changes no effective access (the ALL policy is a superset for
-- every role/command combination they covered) while removing four
-- redundant per-row policy evaluations per query — pure performance win.
--
-- Remaining policies after this migration:
--   - "Training rules manageable by admins" (FOR ALL, admin roles)
--   - training_assignment_rules_user_select (FOR SELECT, self/department/
--     property/role-targeted visibility for regular authenticated users)
-- =============================================================================

DROP POLICY IF EXISTS training_assignment_rules_select ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_insert ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_update ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_delete ON public.training_assignment_rules;
