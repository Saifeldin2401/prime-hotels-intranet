-- Drop valid existing policies to avoid conflicts
DROP POLICY IF EXISTS "HR can view all progress" ON learning_progress;
DROP POLICY IF EXISTS "Users manage own progress" ON learning_progress;
DROP POLICY IF EXISTS "Users view own progress" ON learning_progress;

-- 1. Users can view their own progress
CREATE POLICY "Users view own progress" ON learning_progress
  FOR SELECT USING (user_id = auth.uid());

-- 2. Users can update their own progress (e.g. marking complete)
CREATE POLICY "Users manage own progress" ON learning_progress
  FOR ALL USING (user_id = auth.uid());

-- 3. Department Heads can view progress of users in their department
CREATE POLICY "Dept Heads view dept progress" ON learning_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_departments ud
      JOIN user_departments my_dept ON my_dept.department_id = ud.department_id
      WHERE ud.user_id = learning_progress.user_id
      AND my_dept.user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head')
    )
  );

-- 4. Property Managers/HR can view progress of users in their property
CREATE POLICY "Property Managers view property progress" ON learning_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN user_properties my_prop ON my_prop.property_id = up.property_id
      WHERE up.user_id = learning_progress.user_id
      AND my_prop.user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('property_manager', 'property_hr'))
    )
  );

-- 5. Regional Admins can view all progress
CREATE POLICY "Regional Admins view all progress" ON learning_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'regional_admin')
  );
;
