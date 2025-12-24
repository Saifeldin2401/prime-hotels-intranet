-- Fix RLS Circular Dependency on user_roles
-- The issue: has_role() queries user_roles, but user_roles RLS policy calls has_role()
-- This creates a circular dependency causing timeouts

-- Drop the problematic policies that use has_role
DROP POLICY IF EXISTS "user_roles_modify_admin_hr" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_property" ON user_roles;

-- Keep only the simple policy: users can read their own roles
-- This doesn't create circular dependency
-- Policy already exists: "Users can read own roles"

-- Recreate admin/HR modification policy WITHOUT using has_role
-- Instead, check directly in user_roles for admin role
CREATE POLICY "user_roles_modify_admin_hr" ON user_roles
FOR ALL
USING (
  -- Allow if user is regional_admin or regional_hr (checked directly to avoid recursion)
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('regional_admin', 'regional_hr')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('regional_admin', 'regional_hr')
  )
);

-- Note: Removed user_roles_select_property policy as it was causing circular dependency
-- Users can still read their own roles via "Users can read own roles" policy
