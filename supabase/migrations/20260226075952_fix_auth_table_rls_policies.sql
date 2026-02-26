
-- ============================================================
-- Fix RLS SELECT policies on user_roles, user_properties, user_departments
-- The current policies call has_role_optimized() multiple times which
-- calls get_my_roles() for EACH role check, causing statement timeouts.
--
-- Solution: Split into two policies per table:
--   1. Users can always read their OWN rows (simple auth.uid() check)
--   2. Admins can read ALL rows (uses SECURITY DEFINER function)
-- ============================================================

-- ------- user_roles -------
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;

CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_roles_select_admin" ON user_roles
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT ur.user_id FROM user_roles ur
      WHERE ur.role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
  );

-- Make the admin policy use SECURITY DEFINER via a helper to avoid recursion
-- Actually, the above still queries user_roles from within user_roles policy.
-- Better approach: use the existing SECURITY DEFINER function.
DROP POLICY IF EXISTS "user_roles_select_admin" ON user_roles;

CREATE POLICY "user_roles_select_admin" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
  );

-- ------- user_properties -------
DROP POLICY IF EXISTS "user_properties_select_policy" ON user_properties;

CREATE POLICY "user_properties_select_own" ON user_properties
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_properties_select_admin" ON user_properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
  );

-- ------- user_departments -------
DROP POLICY IF EXISTS "user_departments_select_policy" ON user_departments;

CREATE POLICY "user_departments_select_own" ON user_departments
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_departments_select_admin" ON user_departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
  );
;
