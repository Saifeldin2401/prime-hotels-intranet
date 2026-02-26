-- Final RLS Sweep Batch 5: SOP & Knowledge Base (v3 Final Corrected)

-- sop_documents
DROP POLICY IF EXISTS "Property HR can manage property SOPs" ON sop_documents;
CREATE POLICY "Property HR can manage property SOPs" ON sop_documents FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM (user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = 'property_hr'::app_role) AND ((up.property_id = sop_documents.property_id) OR (sop_documents.property_id IS NULL)))));

DROP POLICY IF EXISTS "Regional admin/HR can manage all SOPs" ON sop_documents;
CREATE POLICY "Regional admin/HR can manage all SOPs" ON sop_documents FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- sop_assignments
DROP POLICY IF EXISTS "Property HR can manage property assignments" ON sop_assignments;
CREATE POLICY "Property HR can manage property assignments" ON sop_assignments FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) JOIN sop_documents sd ON ((sd.property_id = up.property_id))) WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = 'property_hr'::app_role) AND (sd.id = sop_assignments.sop_document_id))));

DROP POLICY IF EXISTS "Regional admin/HR can manage all assignments" ON sop_assignments;
CREATE POLICY "Regional admin/HR can manage all assignments" ON sop_assignments FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- sop_reading_logs
DROP POLICY IF EXISTS "Regional admin/HR can view all reading logs" ON sop_reading_logs;
CREATE POLICY "Regional admin/HR can view all reading logs" ON sop_reading_logs FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

DROP POLICY IF EXISTS "Users can update own reading logs" ON sop_reading_logs;
CREATE POLICY "Users can update own reading logs" ON sop_reading_logs FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own reading logs" ON sop_reading_logs;
CREATE POLICY "Users can view own reading logs" ON sop_reading_logs FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- sop_quiz_questions
DROP POLICY IF EXISTS "Property HR can manage property quiz questions" ON sop_quiz_questions;
CREATE POLICY "Property HR can manage property quiz questions" ON sop_quiz_questions FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM ((user_roles ur JOIN user_properties up ON ((up.user_id = ur.user_id))) JOIN sop_documents sd ON ((sd.property_id = up.property_id))) WHERE ((ur.user_id = (SELECT auth.uid())) AND (ur.role = 'property_hr'::app_role) AND (sd.id = sop_quiz_questions.sop_document_id))));

DROP POLICY IF EXISTS "Regional admin/HR can manage quiz questions" ON sop_quiz_questions;
CREATE POLICY "Regional admin/HR can manage quiz questions" ON sop_quiz_questions FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- sop_quiz_attempts
DROP POLICY IF EXISTS "Department heads can view department quiz attempts" ON sop_quiz_attempts;
CREATE POLICY "Department heads can view department quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles ur JOIN user_departments ud_head ON ud_head.user_id = ur.user_id JOIN user_departments ud_staff ON ud_staff.department_id = ud_head.department_id WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'department_head'::app_role AND ud_staff.user_id = sop_quiz_attempts.user_id));

DROP POLICY IF EXISTS "Property HR can view property quiz attempts" ON sop_quiz_attempts;
CREATE POLICY "Property HR can view property quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles ur JOIN user_properties up_hr ON up_hr.user_id = ur.user_id JOIN user_properties up_staff ON up_staff.property_id = up_hr.property_id WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'property_hr'::app_role AND up_staff.user_id = sop_quiz_attempts.user_id));

DROP POLICY IF EXISTS "Regional admin/HR can view all quiz attempts" ON sop_quiz_attempts;
CREATE POLICY "Regional admin/HR can view all quiz attempts" ON sop_quiz_attempts FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))));

-- sop_bookmarks
DROP POLICY IF EXISTS "bookmarks_delete" ON sop_bookmarks;
CREATE POLICY "bookmarks_delete" ON sop_bookmarks FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bookmarks_insert" ON sop_bookmarks;
CREATE POLICY "bookmarks_insert" ON sop_bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bookmarks_select" ON sop_bookmarks;
CREATE POLICY "bookmarks_select" ON sop_bookmarks FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- sop_comments
DROP POLICY IF EXISTS "comments_delete" ON sop_comments;
CREATE POLICY "comments_delete" ON sop_comments FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "comments_insert" ON sop_comments;
CREATE POLICY "comments_insert" ON sop_comments FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "comments_update" ON sop_comments;
CREATE POLICY "comments_update" ON sop_comments FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- sop_feedback
DROP POLICY IF EXISTS "feedback_insert" ON sop_feedback;
CREATE POLICY "feedback_insert" ON sop_feedback FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "feedback_update" ON sop_feedback;
CREATE POLICY "feedback_update" ON sop_feedback FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- knowledge_questions
DROP POLICY IF EXISTS "Creators can update own questions" ON knowledge_questions;
CREATE POLICY "Creators can update own questions" ON knowledge_questions FOR UPDATE TO authenticated USING ((created_by = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role]))))));

DROP POLICY IF EXISTS "Draft questions visible to creators" ON knowledge_questions;
CREATE POLICY "Draft questions visible to creators" ON knowledge_questions FOR SELECT TO authenticated USING ((created_by = (SELECT auth.uid())) OR (reviewed_by = (SELECT auth.uid())));

-- knowledge_quiz_sessions
DROP POLICY IF EXISTS "Users can create sessions" ON knowledge_quiz_sessions;
CREATE POLICY "Users can create sessions" ON knowledge_quiz_sessions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own sessions" ON knowledge_quiz_sessions;
CREATE POLICY "Users can update own sessions" ON knowledge_quiz_sessions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users see own sessions" ON knowledge_quiz_sessions;
CREATE POLICY "Users see own sessions" ON knowledge_quiz_sessions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- knowledge_question_options
DROP POLICY IF EXISTS "Full access to question options" ON knowledge_question_options;
CREATE POLICY "Full access to question options" ON knowledge_question_options FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role])))));

-- knowledge_question_usages
DROP POLICY IF EXISTS "HR can manage usages" ON knowledge_question_usages;
CREATE POLICY "HR can manage usages" ON knowledge_question_usages FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role])))));

-- knowledge_question_attempts
DROP POLICY IF EXISTS "Users can create attempts" ON knowledge_question_attempts;
CREATE POLICY "Users can create attempts" ON knowledge_question_attempts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users see own attempts" ON knowledge_question_attempts;
CREATE POLICY "Users see own attempts" ON knowledge_question_attempts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- knowledge_question_versions
DROP POLICY IF EXISTS "HR can view versions" ON knowledge_question_versions;
CREATE POLICY "HR can view versions" ON knowledge_question_versions FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role])))));
;
