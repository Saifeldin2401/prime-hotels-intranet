-- Training & SOP Tables

-- training_paths
DROP POLICY IF EXISTS "training_paths_manage" ON training_paths;
CREATE POLICY "training_paths_manage" ON training_paths FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'regional_hr'::app_role)
);

-- training_path_modules
DROP POLICY IF EXISTS "training_path_modules_manage" ON training_path_modules;
CREATE POLICY "training_path_modules_manage" ON training_path_modules FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'regional_hr'::app_role)
);

-- learning_assignments
DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;
CREATE POLICY "HR can manage assignments" ON learning_assignments FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::text) OR 
  has_role((select auth.uid()), 'regional_hr'::text) OR 
  ((has_role((select auth.uid()), 'property_manager'::text) OR has_role((select auth.uid()), 'property_hr'::text) OR has_role((select auth.uid()), 'department_manager'::text)) AND 
   ((assigned_by = (select auth.uid())) OR 
    ((target_type = 'property'::learning_target_type) AND has_property_access((select auth.uid()), (target_id)::uuid)) OR 
    ((target_type = 'department'::learning_target_type) AND (EXISTS ( 
       SELECT 1 FROM departments d WHERE (d.id = (learning_assignments.target_id)::uuid) AND has_property_access((select auth.uid()), d.property_id)
    ))) OR 
    (EXISTS ( 
       SELECT 1 FROM user_properties up_me JOIN user_properties up_creator ON ((up_me.property_id = up_creator.property_id))
       WHERE ((up_me.user_id = (select auth.uid())) AND (up_creator.user_id = learning_assignments.assigned_by))
    ))))
);

-- user_path_enrollments
DROP POLICY IF EXISTS "user_path_enrollments_manage" ON user_path_enrollments;
CREATE POLICY "user_path_enrollments_manage" ON user_path_enrollments FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'regional_hr'::app_role)
);

DROP POLICY IF EXISTS "user_path_enrollments_own" ON user_path_enrollments;
CREATE POLICY "user_path_enrollments_own" ON user_path_enrollments FOR SELECT USING (
  user_id = (select auth.uid())
);

-- training_quiz_attempts
DROP POLICY IF EXISTS "training_quiz_attempts_manage" ON training_quiz_attempts;
CREATE POLICY "training_quiz_attempts_manage" ON training_quiz_attempts FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'regional_hr'::app_role)
);

DROP POLICY IF EXISTS "quiz_attempts_own" ON training_quiz_attempts;
CREATE POLICY "quiz_attempts_own" ON training_quiz_attempts FOR SELECT USING (
  user_id = (select auth.uid())
);

-- training_module_resources
DROP POLICY IF EXISTS "training_module_resources_manage" ON training_module_resources;
CREATE POLICY "training_module_resources_manage" ON training_module_resources FOR ALL USING (
  has_role((select auth.uid()), 'regional_admin'::text) OR 
  has_role((select auth.uid()), 'regional_hr'::text) OR 
  has_role((select auth.uid()), 'property_manager'::text) OR 
  has_role((select auth.uid()), 'property_hr'::text) OR 
  has_role((select auth.uid()), 'department_manager'::text)
);

-- sop_quiz_attempts
DROP POLICY IF EXISTS "Users can create own quiz attempts" ON sop_quiz_attempts;
CREATE POLICY "Users can create own quiz attempts" ON sop_quiz_attempts FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON sop_quiz_attempts;
CREATE POLICY "Users can view own quiz attempts" ON sop_quiz_attempts FOR SELECT USING (
  user_id = (select auth.uid())
);

-- sop_assignments
DROP POLICY IF EXISTS "Users can view own assignments" ON sop_assignments;
CREATE POLICY "Users can view own assignments" ON sop_assignments FOR SELECT USING (
  assigned_to_user_id = (select auth.uid())
);

-- sop_reading_logs
DROP POLICY IF EXISTS "Users can create own reading logs" ON sop_reading_logs;
CREATE POLICY "Users can create own reading logs" ON sop_reading_logs FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Users can update own reading logs" ON sop_reading_logs;
CREATE POLICY "Users can update own reading logs" ON sop_reading_logs FOR UPDATE USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Users can view own reading logs" ON sop_reading_logs;
CREATE POLICY "Users can view own reading logs" ON sop_reading_logs FOR SELECT USING (
  user_id = (select auth.uid())
);

-- announcement_reads
DROP POLICY IF EXISTS "announcement_reads_insert_users" ON announcement_reads;
CREATE POLICY "announcement_reads_insert_users" ON announcement_reads FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

-- notification_preferences
DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
CREATE POLICY "notification_preferences_select_own" ON notification_preferences FOR SELECT USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
CREATE POLICY "notification_preferences_update_own" ON notification_preferences FOR UPDATE USING (
  user_id = (select auth.uid())
) WITH CHECK (
  user_id = (select auth.uid())
);

-- user_settings
DROP POLICY IF EXISTS "user_settings_insert_own" ON user_settings;
CREATE POLICY "user_settings_insert_own" ON user_settings FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "user_settings_select_own" ON user_settings;
CREATE POLICY "user_settings_select_own" ON user_settings FOR SELECT USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "user_settings_manage_admin" ON user_settings;
CREATE POLICY "user_settings_manage_admin" ON user_settings FOR ALL USING (
  auth_has_role((select auth.uid()), 'regional_admin'::text)
);

-- password_history
DROP POLICY IF EXISTS "password_history_insert_own" ON password_history;
CREATE POLICY "password_history_insert_own" ON password_history FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "password_history_select_own" ON password_history;
CREATE POLICY "password_history_select_own" ON password_history FOR SELECT USING (
  user_id = (select auth.uid())
);

-- temporary_approvers
DROP POLICY IF EXISTS "temporary_approvers_insert_own" ON temporary_approvers;
CREATE POLICY "temporary_approvers_insert_own" ON temporary_approvers FOR INSERT WITH CHECK (
  delegator_id = (select auth.uid())
);
;
