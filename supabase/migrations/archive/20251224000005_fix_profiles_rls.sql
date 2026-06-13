-- Fix circular RLS dependencies on profiles table
-- The profiles_select_own_and_property policy uses has_role() which queries user_roles
-- This causes a hang during auth because it creates a cycle

-- Drop the problematic policies
DROP POLICY IF EXISTS "profiles_select_own_and_property" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin_hr" ON profiles;

-- Create a simpler update policy that doesn't use has_role
CREATE POLICY "profiles_update_admin_hr" ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Keep profiles_read_all_authenticated and profiles_select_public which are simple policies
