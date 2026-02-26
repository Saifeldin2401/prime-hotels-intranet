-- Messages
DROP POLICY IF EXISTS "users_select_own_messages" ON messages;
CREATE POLICY "users_select_own_messages" ON messages FOR SELECT USING (
  ((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id) OR (recipient_id IS NULL)
);

DROP POLICY IF EXISTS "users_insert_messages" ON messages;
CREATE POLICY "users_insert_messages" ON messages FOR INSERT WITH CHECK (
  (select auth.uid()) = sender_id
);

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  user_id = (select auth.uid())
) WITH CHECK (
  user_id = (select auth.uid())
);

-- Learning Progress
DROP POLICY IF EXISTS "Users view own progress" ON learning_progress;
CREATE POLICY "Users view own progress" ON learning_progress FOR SELECT USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Users manage own progress" ON learning_progress;
CREATE POLICY "Users manage own progress" ON learning_progress FOR ALL USING (
  user_id = (select auth.uid())
);

DROP POLICY IF EXISTS "HR can view all progress" ON learning_progress;
CREATE POLICY "HR can view all progress" ON learning_progress FOR SELECT USING (
  has_role((select auth.uid()), 'regional_admin'::text) OR 
  has_role((select auth.uid()), 'regional_hr'::text) OR 
  ((has_role((select auth.uid()), 'property_hr'::text) OR has_role((select auth.uid()), 'department_manager'::text)) AND 
   (EXISTS ( 
      SELECT 1 FROM user_properties up_me
      JOIN user_properties up_target ON ((up_me.property_id = up_target.property_id))
      WHERE ((up_me.user_id = (select auth.uid())) AND (up_target.user_id = learning_progress.user_id))
   )))
);

-- Tasks
DROP POLICY IF EXISTS "tasks_select_own" ON tasks;
CREATE POLICY "tasks_select_own" ON tasks FOR SELECT USING (
  (assigned_to_id = (select auth.uid())) OR 
  (created_by_id = (select auth.uid())) OR 
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'property_manager'::app_role)
);

DROP POLICY IF EXISTS "tasks_update_assigned" ON tasks;
CREATE POLICY "tasks_update_assigned" ON tasks FOR UPDATE USING (
  assigned_to_id = (select auth.uid())
);

DROP POLICY IF EXISTS "tasks_manage_own" ON tasks;
CREATE POLICY "tasks_manage_own" ON tasks FOR ALL USING (
  (created_by_id = (select auth.uid())) OR 
  has_role((select auth.uid()), 'regional_admin'::app_role) OR 
  has_role((select auth.uid()), 'property_manager'::app_role)
);

DROP POLICY IF EXISTS "tasks_select_unified" ON tasks;
CREATE POLICY "tasks_select_unified" ON tasks FOR SELECT USING (
  (created_by_id = (select auth.uid())) OR 
  (assigned_to_id = (select auth.uid())) OR 
  auth_has_any_role((select auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR 
  (auth_has_role((select auth.uid()), 'property_manager'::text) AND check_property_access(property_id)) OR 
  (auth_has_role((select auth.uid()), 'department_head'::text) AND check_property_access(property_id) AND (department_id IN ( 
      SELECT user_departments.department_id 
      FROM user_departments 
      WHERE (user_departments.user_id = (select auth.uid()))
  )))
);

DROP POLICY IF EXISTS "tasks_manage_unified" ON tasks;
CREATE POLICY "tasks_manage_unified" ON tasks FOR ALL USING (
  (created_by_id = (select auth.uid())) OR 
  auth_has_any_role((select auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR 
  (auth_has_role((select auth.uid()), 'property_manager'::text) AND check_property_access(property_id))
);

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (
  id = (select auth.uid())
) WITH CHECK (
  id = (select auth.uid())
);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (
  id = (select auth.uid())
) WITH CHECK (
  id = (select auth.uid())
);
;
