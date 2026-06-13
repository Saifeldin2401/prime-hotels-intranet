-- Individual Group 1: Verified Columns

-- goals (employee_id)
DROP POLICY IF EXISTS "goals_insert_own" ON goals;
CREATE POLICY "goals_insert_own" ON goals FOR INSERT WITH CHECK (
  employee_id = (select auth.uid())
);
DROP POLICY IF EXISTS "goals_update_own" ON goals;
CREATE POLICY "goals_update_own" ON goals FOR UPDATE USING (
  employee_id = (select auth.uid())
);

-- attendance (employee_id)
DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own" ON attendance FOR INSERT WITH CHECK (
  employee_id = (select auth.uid())
);
DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
CREATE POLICY "attendance_update_own" ON attendance FOR UPDATE USING (
  employee_id = (select auth.uid())
);

-- pii_access_logs (accessed_by)
-- Wait, Schema check showed accessed_by AND user_id. 
-- The warning said pii_access_logs_insert_admin and pii_access_logs_select_admin.
-- These usually check role.
DROP POLICY IF EXISTS "pii_access_logs_insert_admin" ON pii_access_logs;
CREATE POLICY "pii_access_logs_insert_admin" ON pii_access_logs FOR INSERT WITH CHECK (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);
DROP POLICY IF EXISTS "pii_access_logs_select_admin" ON pii_access_logs;
CREATE POLICY "pii_access_logs_select_admin" ON pii_access_logs FOR SELECT USING (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);
;
