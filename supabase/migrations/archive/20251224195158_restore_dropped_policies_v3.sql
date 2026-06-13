-- ============================================
-- RESTORE POLICIES THAT WERE DROPPED BY CASCADE
-- Using the new SECURITY DEFINER helper functions
-- ============================================

-- Tasks: Restore full access policies (using correct column names)
DROP POLICY IF EXISTS "tasks_select_own" ON tasks;
CREATE POLICY "tasks_select_own" ON tasks
FOR SELECT USING (
  assigned_to_id = auth.uid() 
  OR created_by_id = auth.uid()
  OR has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'property_manager')
);

DROP POLICY IF EXISTS "tasks_manage_own" ON tasks;
CREATE POLICY "tasks_manage_own" ON tasks
FOR ALL USING (
  created_by_id = auth.uid()
  OR has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'property_manager')
);

-- Training paths
DROP POLICY IF EXISTS "training_paths_manage" ON training_paths;
CREATE POLICY "training_paths_manage" ON training_paths
FOR ALL USING (
  has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'regional_hr')
);

-- Training path modules
DROP POLICY IF EXISTS "training_path_modules_manage" ON training_path_modules;
CREATE POLICY "training_path_modules_manage" ON training_path_modules
FOR ALL USING (
  has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'regional_hr')
);

-- User path enrollments
DROP POLICY IF EXISTS "user_path_enrollments_manage" ON user_path_enrollments;
CREATE POLICY "user_path_enrollments_manage" ON user_path_enrollments
FOR ALL USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'regional_hr')
);

-- Training quiz attempts
DROP POLICY IF EXISTS "training_quiz_attempts_manage" ON training_quiz_attempts;
CREATE POLICY "training_quiz_attempts_manage" ON training_quiz_attempts
FOR ALL USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'regional_admin')
);

-- Announcement reads
DROP POLICY IF EXISTS "announcement_reads_manage" ON announcement_reads;
CREATE POLICY "announcement_reads_manage" ON announcement_reads
FOR ALL USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'regional_admin')
);

-- PII access logs
DROP POLICY IF EXISTS "pii_access_logs_manage" ON pii_access_logs;
CREATE POLICY "pii_access_logs_manage" ON pii_access_logs
FOR ALL USING (
  has_role(auth.uid(), 'regional_admin')
  OR has_role(auth.uid(), 'regional_hr')
);;
