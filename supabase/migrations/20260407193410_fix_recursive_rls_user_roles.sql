-- Reconstructed placeholder for a production migration that was applied
-- directly in the live project. The effective policy behavior already exists
-- in earlier local migrations:
--   - 20260226080323_fix_manage_policies_has_role_optimized.sql
--   - 20260226194000_optimize_user_assignment_rls_initplan.sql
--
-- The removed local file 20260407093000_fix_recursive_rls_user_roles.sql was
-- incorrect because it queried public.user_roles from inside user_roles RLS
-- policies, which reintroduced infinite recursion.
--
-- This placeholder preserves migration history alignment with production
-- without changing the local replay order again.

DO $$
BEGIN
  RAISE NOTICE '20260407193410_fix_recursive_rls_user_roles is already represented by earlier local RLS migrations.';
END
$$;
