-- Fix permissions for assignment creation

-- 1. Ensure users can read their own roles (critical for RLS checks)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- 2. Update learning_assignments management policy to include more roles
-- Previous policy was too restrictive or relied on roles the user might not have
DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;

CREATE POLICY "HR can manage assignments" ON learning_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
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
        )
    );

-- 3. Also allow reading of departments/properties for everyone (often needed for UI filters)
DROP POLICY IF EXISTS "Departments viewable by all" ON departments;
CREATE POLICY "Departments viewable by all" ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Properties viewable by all" ON properties;
CREATE POLICY "Properties viewable by all" ON properties FOR SELECT TO authenticated USING (true);
