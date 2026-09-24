BEGIN;

DROP POLICY IF EXISTS multitenant_lessons_select ON public.lessons;
CREATE POLICY multitenant_lessons_select ON public.lessons
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
      AND (is_platform_super_admin() OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id)))
  )
);

DROP POLICY IF EXISTS multitenant_lesson_blocks_select ON public.lesson_blocks;
CREATE POLICY multitenant_lesson_blocks_select ON public.lesson_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l JOIN course_modules cm ON cm.id = l.course_module_id
    JOIN courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND (is_platform_super_admin() OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id)))
  )
);

DROP POLICY IF EXISTS multitenant_course_modules_select ON public.course_modules;
CREATE POLICY multitenant_course_modules_select ON public.course_modules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_modules.course_id
      AND (is_platform_super_admin() OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id)))
  )
);

DROP POLICY IF EXISTS learning_objectives_select ON public.learning_objectives;
CREATE POLICY learning_objectives_select ON public.learning_objectives
FOR SELECT USING (
  is_learning_editor()
  OR (course_id IS NULL)
  OR EXISTS (
    SELECT 1 FROM courses c WHERE c.id = learning_objectives.course_id
      AND c.status = 'published' AND c.is_deleted = false
      AND (is_platform_super_admin() OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id)))
  )
);

DROP POLICY IF EXISTS objective_links_select ON public.objective_links;
CREATE POLICY objective_links_select ON public.objective_links
FOR SELECT USING (
  is_learning_editor()
  OR EXISTS (
    SELECT 1 FROM learning_objectives o WHERE o.id = objective_links.objective_id
      AND ((o.course_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM courses c WHERE c.id = o.course_id
            AND c.status = 'published' AND c.is_deleted = false
            AND (is_platform_super_admin() OR c.is_master_template = true
              OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id)))
        ))
  )
);

COMMIT;
