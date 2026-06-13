-- Batch 2: Knowledge & Training Tables RLS Optimization (v2)

-- documents
DROP POLICY IF EXISTS "documents_manage" ON documents;
CREATE POLICY "documents_manage" ON documents FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR (auth_has_role((SELECT auth.uid()), 'property_manager'::text) AND check_property_access(property_id)));

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]) OR (auth_has_role((SELECT auth.uid()), 'property_manager'::text) AND check_property_access(property_id)) OR ((status = 'PUBLISHED'::document_status) AND (is_deleted = false) AND ((visibility = 'all_properties'::document_visibility) OR ((visibility = 'property'::document_visibility) AND check_property_access(property_id)))));

-- document_versions
DROP POLICY IF EXISTS "document_versions_manage" ON document_versions;
CREATE POLICY "document_versions_manage" ON document_versions FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text]));

-- document_approvals
DROP POLICY IF EXISTS "document_approvals_insert" ON document_approvals;
CREATE POLICY "document_approvals_insert" ON document_approvals FOR INSERT TO authenticated WITH CHECK (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "document_approvals_update" ON document_approvals;
CREATE POLICY "document_approvals_update" ON document_approvals FOR UPDATE TO authenticated USING (approver_id = (SELECT auth.uid())) WITH CHECK (approver_id = (SELECT auth.uid()));

-- training_content_blocks
DROP POLICY IF EXISTS "training_content_blocks_delete" ON training_content_blocks;
CREATE POLICY "training_content_blocks_delete" ON training_content_blocks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM training_modules tm WHERE tm.id = training_content_blocks.training_module_id AND (tm.created_by = (SELECT auth.uid()) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]))));

DROP POLICY IF EXISTS "training_content_blocks_insert" ON training_content_blocks;
CREATE POLICY "training_content_blocks_insert" ON training_content_blocks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM training_modules tm WHERE tm.id = training_module_id AND (tm.created_by = (SELECT auth.uid()) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]))));

DROP POLICY IF EXISTS "training_content_blocks_update" ON training_content_blocks;
CREATE POLICY "training_content_blocks_update" ON training_content_blocks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM training_modules tm WHERE tm.id = training_content_blocks.training_module_id AND (tm.created_by = (SELECT auth.uid()) OR auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text]))));

-- quizzes
DROP POLICY IF EXISTS "quizzes_all" ON quizzes;
CREATE POLICY "quizzes_all" ON quizzes FOR ALL TO authenticated USING (auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text]));

-- quiz_questions
DROP POLICY IF EXISTS "quiz_questions_all" ON quiz_questions;
CREATE POLICY "quiz_questions_all" ON quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND auth_has_any_role((SELECT auth.uid()), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text])));

-- quiz_attempts
DROP POLICY IF EXISTS "quiz_attempts_insert" ON quiz_attempts;
CREATE POLICY "quiz_attempts_insert" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "quiz_attempts_select" ON quiz_attempts;
CREATE POLICY "quiz_attempts_select" ON quiz_attempts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- quiz_answers
DROP POLICY IF EXISTS "quiz_answers_insert" ON quiz_answers;
CREATE POLICY "quiz_answers_insert" ON quiz_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "quiz_answers_select" ON quiz_answers;
CREATE POLICY "quiz_answers_select" ON quiz_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = (SELECT auth.uid())));
;
