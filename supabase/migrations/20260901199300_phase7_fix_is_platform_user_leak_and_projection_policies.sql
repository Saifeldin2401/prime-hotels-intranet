-- Phase 7: the courses/assessments projection model is a synced strangler-fig read model of
-- training_modules/learning_quizzes (trigger trg_sync_training_module_to_course). It is
-- tenant-isolated EXCEPT: a concurrently-added set of *_modify_tenant policies OR-ed in
-- is_platform_user(auth.uid()), which returned TRUE for legacy 'corporate_admin'/'regional_admin'
-- (tenant roles, NOT platform roles) -> those admins of any org could read/write every org's
-- courses / assessments / question_banks / unified_questions / media_assets.

-- 1. is_platform_user: platform = super_admin only.
CREATE OR REPLACE FUNCTION public.is_platform_user(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'super_admin');
$fn$;

-- 2. Drop the redundant *_modify_tenant ALL policies (canonical multitenant_* sets are stricter).
DROP POLICY IF EXISTS courses_modify_tenant ON public.courses;
DROP POLICY IF EXISTS assessments_modify_tenant ON public.assessments;
DROP POLICY IF EXISTS question_banks_modify_tenant ON public.question_banks;
DROP POLICY IF EXISTS unified_questions_modify_tenant ON public.unified_questions;

-- 3. Missing WITH CHECK on the course-hierarchy FOR ALL write policies.
DROP POLICY IF EXISTS multitenant_course_modules_write ON public.course_modules;
CREATE POLICY multitenant_course_modules_write ON public.course_modules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))));

DROP POLICY IF EXISTS multitenant_lessons_write ON public.lessons;
CREATE POLICY multitenant_lessons_write ON public.lessons FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON c.id = cm.course_id
  WHERE cm.id = lessons.course_module_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))))
WITH CHECK (EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON c.id = cm.course_id
  WHERE cm.id = lessons.course_module_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))));

DROP POLICY IF EXISTS multitenant_lesson_blocks_write ON public.lesson_blocks;
CREATE POLICY multitenant_lesson_blocks_write ON public.lesson_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON cm.id = l.course_module_id JOIN public.courses c ON c.id = cm.course_id
  WHERE l.id = lesson_blocks.lesson_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))))
WITH CHECK (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON cm.id = l.course_module_id JOIN public.courses c ON c.id = cm.course_id
  WHERE l.id = lesson_blocks.lesson_id
  AND ((c.is_master_template AND public.is_platform_super_admin())
       OR (c.organization_id IS NOT NULL AND public.org_visible(c.organization_id) AND public.is_tenant_content_editor(c.organization_id)))));
