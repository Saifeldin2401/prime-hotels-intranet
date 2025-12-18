-- Create a security definer function to check assignment permissions
-- This bypasses RLS on user_roles, ensuring the check always succeeds if the user has the role
CREATE OR REPLACE FUNCTION can_manage_assignments(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = $1
    AND role::text IN (
        'regional_admin', 
        'regional_hr', 
        'property_hr', 
        'department_manager',
        'general_manager',
        'admin',
        'super_admin',
        'property_manager'
    )
  );
$$;

-- Update the policy to use this function
DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;

CREATE POLICY "HR can manage assignments" ON learning_assignments
    FOR ALL USING (
        can_manage_assignments(auth.uid())
    );
