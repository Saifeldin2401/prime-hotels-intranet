-- Final RLS Sweep Batch 8: Communications & Logs (v3 Final Fixed)

-- announcement_reads
DROP POLICY IF EXISTS "announcement_reads_insert_users" ON announcement_reads;
CREATE POLICY "announcement_reads_insert_users" ON announcement_reads FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "announcement_reads_manage" ON announcement_reads;
CREATE POLICY "announcement_reads_manage" ON announcement_reads FOR ALL TO authenticated USING ((user_id = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- announcement_acknowledgments
DROP POLICY IF EXISTS "Users can acknowledge announcements" ON announcement_acknowledgments;
CREATE POLICY "Users can acknowledge announcements" ON announcement_acknowledgments FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own acknowledgments" ON announcement_acknowledgments;
CREATE POLICY "Users can view own acknowledgments" ON announcement_acknowledgments FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = ANY (participant_ids));

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = ANY (participant_ids));

DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;
CREATE POLICY "Users can view conversations they are part of" ON conversations FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM conversation_participants cp WHERE ((cp.conversation_id = conversations.id) AND (cp.participant_id = (SELECT auth.uid())))));

-- ai_manager_digests
DROP POLICY IF EXISTS "Users can view own digests" ON ai_manager_digests;
CREATE POLICY "Users can view own digests" ON ai_manager_digests FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- related_article_clicks
DROP POLICY IF EXISTS "Users can view own clicks" ON related_article_clicks;
CREATE POLICY "Users can view own clicks" ON related_article_clicks FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR (user_id IS NULL));

-- user_sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
CREATE POLICY "Admins can view all sessions" ON user_sessions FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));

DROP POLICY IF EXISTS "Users can create sessions" ON user_sessions;
CREATE POLICY "Users can create sessions" ON user_sessions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- user_skills
DROP POLICY IF EXISTS "Admins can manage user skills" ON user_skills;
CREATE POLICY "Admins can manage user skills" ON user_skills FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

DROP POLICY IF EXISTS "Users can view own skills" ON user_skills;
CREATE POLICY "Users can view own skills" ON user_skills FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- skills
DROP POLICY IF EXISTS "Admins and HR can manage skills" ON skills;
CREATE POLICY "Admins and HR can manage skills" ON skills FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

-- module_skills
DROP POLICY IF EXISTS "Admins can manage module skills" ON module_skills;
CREATE POLICY "Admins can manage module skills" ON module_skills FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))));

-- audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- pii_access_logs
DROP POLICY IF EXISTS "Admins can view all PII logs" ON pii_access_logs;
CREATE POLICY "Admins can view all PII logs" ON pii_access_logs FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));
;
