-- FINAL FIX: Remove ALL recursive RLS policies on user_roles
-- The issue: ANY query to user_roles within a user_roles RLS policy causes infinite recursion

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_modify_admin_hr" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_property" ON user_roles;

-- Create ONLY ONE simple policy - users can read their own roles
-- This has NO subquery, so NO recursion
CREATE POLICY "Users can read own roles" ON user_roles
FOR SELECT
USING (user_id = auth.uid());

-- For modifications, only allow service_role (admin API operations)
-- This prevents any app user from modifying roles via client
CREATE POLICY "Service role can manage all roles" ON user_roles
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');
