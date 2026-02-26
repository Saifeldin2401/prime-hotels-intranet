-- Drop previous policies to replace them
DROP POLICY IF EXISTS "Dept Heads view dept progress" ON learning_progress;
DROP POLICY IF EXISTS "Property Managers view property progress" ON learning_progress;
DROP POLICY IF EXISTS "Regional Admins view all progress" ON learning_progress;
DROP POLICY IF EXISTS "Tech Support view all progress" ON learning_progress; -- just in case

-- 1. Regional Admins view all progress (using security definer function)
CREATE POLICY "Regional Admins view all progress" ON learning_progress
  FOR SELECT USING (
    has_role(auth.uid(), 'regional_admin')
  );

-- 2. Dept Heads view dept progress
-- We keep the join logic but use has_role for the role check
CREATE POLICY "Dept Heads view dept progress" ON learning_progress
  FOR SELECT USING (
    has_role(auth.uid(), 'department_head') AND
    EXISTS (
      SELECT 1 FROM user_departments ud
      JOIN user_departments my_dept ON my_dept.department_id = ud.department_id
      WHERE ud.user_id = learning_progress.user_id
      AND my_dept.user_id = auth.uid()
    )
  );

-- 3. Property Managers view property progress
CREATE POLICY "Property Managers view property progress" ON learning_progress
  FOR SELECT USING (
    (has_role(auth.uid(), 'property_manager') OR has_role(auth.uid(), 'property_hr')) AND
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN user_properties my_prop ON my_prop.property_id = up.property_id
      WHERE up.user_id = learning_progress.user_id
      AND my_prop.user_id = auth.uid()
    )
  );
  
-- 4. Add "Users can read own role" policy to user_roles just in case
-- This helps client-side checks and other non-security-definer queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' AND policyname = 'Users can read own role'
    ) THEN
        CREATE POLICY "Users can read own role" ON user_roles
          FOR SELECT USING (user_id = auth.uid());
    END IF;
END
$$;;
