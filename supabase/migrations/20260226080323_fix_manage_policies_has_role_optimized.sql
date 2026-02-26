
-- ============================================================
-- Fix INSERT/UPDATE/DELETE RLS policies on user_roles, user_properties,
-- user_departments to stop calling has_role_optimized() 3x per check.
-- Replace with a single get_my_roles() SECURITY DEFINER call via EXISTS.
-- ============================================================

-- ------- user_roles -------
DROP POLICY IF EXISTS "user_roles_manage_policy_delete" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_policy_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_policy_update" ON user_roles;

CREATE POLICY "user_roles_manage_policy_insert" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_roles_manage_policy_update" ON user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_roles_manage_policy_delete" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

-- ------- user_properties -------
DROP POLICY IF EXISTS "user_properties_manage_policy_delete" ON user_properties;
DROP POLICY IF EXISTS "user_properties_manage_policy_insert" ON user_properties;
DROP POLICY IF EXISTS "user_properties_manage_policy_update" ON user_properties;

CREATE POLICY "user_properties_manage_policy_insert" ON user_properties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_properties_manage_policy_update" ON user_properties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_properties_manage_policy_delete" ON user_properties
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

-- ------- user_departments -------
DROP POLICY IF EXISTS "user_departments_manage_policy_delete" ON user_departments;
DROP POLICY IF EXISTS "user_departments_manage_policy_insert" ON user_departments;
DROP POLICY IF EXISTS "user_departments_manage_policy_update" ON user_departments;

CREATE POLICY "user_departments_manage_policy_insert" ON user_departments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_departments_manage_policy_update" ON user_departments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );

CREATE POLICY "user_departments_manage_policy_delete" ON user_departments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM unnest(public.get_my_roles()) AS r
      WHERE r IN ('corporate_admin', 'regional_admin', 'regional_hr')
    )
  );
;
