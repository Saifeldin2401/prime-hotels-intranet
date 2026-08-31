-- Phase 14 (E2E verification found these): three tables still leaked cross-tenant.

-- 1. departments: legacy p5_* policies (p5_departments_select USING is_active=true) OR-ed with
--    the tenant-isolation policy -> every authenticated user saw all departments.
DROP POLICY IF EXISTS p5_departments_select ON public.departments;
DROP POLICY IF EXISTS p5_departments_insert ON public.departments;
DROP POLICY IF EXISTS p5_departments_update ON public.departments;
DROP POLICY IF EXISTS p5_departments_delete ON public.departments;
DROP POLICY IF EXISTS departments_tenant_isolation_select ON public.departments;
CREATE POLICY departments_tenant_isolation_select ON public.departments FOR SELECT TO authenticated
USING (public.org_visible(organization_id));

-- 2. unified_quiz_sessions / unified_question_attempts: SELECT allowed any legacy
--    corporate/regional/property/department_head role to read every org's quiz history.
DROP POLICY IF EXISTS unified_quiz_sessions_select ON public.unified_quiz_sessions;
CREATE POLICY unified_quiz_sessions_select ON public.unified_quiz_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));

DROP POLICY IF EXISTS unified_question_attempts_select ON public.unified_question_attempts;
CREATE POLICY unified_question_attempts_select ON public.unified_question_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));

-- 3. unified_quiz_questions link table: _manage ALL was a legacy-role check. Isolate via parent.
DROP POLICY IF EXISTS unified_quiz_questions_manage ON public.unified_quiz_questions;
DROP POLICY IF EXISTS unified_quiz_questions_select ON public.unified_quiz_questions;
CREATE POLICY unified_quiz_questions_select ON public.unified_quiz_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_quizzes lq WHERE lq.id = unified_quiz_questions.quiz_id
  AND (public.is_platform_super_admin() OR public.org_visible(lq.organization_id))));
CREATE POLICY unified_quiz_questions_manage ON public.unified_quiz_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_quizzes lq WHERE lq.id = unified_quiz_questions.quiz_id
  AND public.org_visible(lq.organization_id) AND public.is_tenant_content_editor(lq.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.learning_quizzes lq WHERE lq.id = unified_quiz_questions.quiz_id
  AND public.org_visible(lq.organization_id) AND public.is_tenant_content_editor(lq.organization_id)));
