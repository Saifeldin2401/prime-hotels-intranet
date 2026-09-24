-- P1 critical RLS leak #1: cross-tenant READ leaks on learning child tables
--
-- Intent:
--   Several SELECT policies on tables that hang off `courses` only verified that
--   the row chained to *some* course row -- they never checked that the calling
--   user's tenant can see that course. Any authenticated user could therefore
--   read every tenant's lessons, lesson blocks, course modules, learning
--   objectives and objective links.
--
--   This migration rewrites the offending SELECT policies to gate through
--   courses.organization_id via the existing SECURITY DEFINER helper
--   org_visible(uuid), while preserving the is_platform_super_admin() and
--   is_master_template bypasses used on sibling policies. WRITE policies are
--   left untouched.
--
-- Tables fixed:
--   public.lessons            (multitenant_lessons_select)
--   public.lesson_blocks      (multitenant_lesson_blocks_select)
--   public.course_modules     (multitenant_course_modules_select)
--   public.learning_objectives(learning_objectives_select)   -- published-course branch was un-scoped
--   public.objective_links    (objective_links_select)       -- nested published-course branch was un-scoped
--
-- Verified already tenant-safe (left as-is):
--   public.course_competencies (course_competencies_sel)  -- already requires org_visible(c.organization_id)
--   public.lesson_progress     (lesson_progress_select)   -- row-scoped to the caller's own enrollment
--   public.learning_events     (learning_events_select)   -- row-scoped to user_id = auth.uid()
--   (is_learning_editor() remains a deliberate global-editor bypass on the last two, matching siblings.)
--
-- Rollback:
--   Re-create each policy below with its previous USING expression (the pre-migration
--   text simply omitted the org_visible()/is_platform_super_admin()/is_master_template
--   predicates shown here). No data is modified.

BEGIN;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS multitenant_lessons_select ON public.lessons;
CREATE POLICY multitenant_lessons_select ON public.lessons
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
      AND (
        is_platform_super_admin()
        OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id))
      )
  )
);

-- ---------------------------------------------------------------------------
-- lesson_blocks
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS multitenant_lesson_blocks_select ON public.lesson_blocks;
CREATE POLICY multitenant_lesson_blocks_select ON public.lesson_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN course_modules cm ON cm.id = l.course_module_id
    JOIN courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND (
        is_platform_super_admin()
        OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id))
      )
  )
);

-- ---------------------------------------------------------------------------
-- course_modules
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS multitenant_course_modules_select ON public.course_modules;
CREATE POLICY multitenant_course_modules_select ON public.course_modules
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM courses c
    WHERE c.id = course_modules.course_id
      AND (
        is_platform_super_admin()
        OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id))
      )
  )
);

-- ---------------------------------------------------------------------------
-- learning_objectives
--   Keep: global editor bypass, and course-less (course_id IS NULL) objectives.
--   Fix:  the "published course" branch must also be tenant-visible.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS learning_objectives_select ON public.learning_objectives;
CREATE POLICY learning_objectives_select ON public.learning_objectives
FOR SELECT USING (
  is_learning_editor()
  OR (course_id IS NULL)
  OR EXISTS (
    SELECT 1
    FROM courses c
    WHERE c.id = learning_objectives.course_id
      AND c.status = 'published'
      AND c.is_deleted = false
      AND (
        is_platform_super_admin()
        OR c.is_master_template = true
        OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id))
      )
  )
);

-- ---------------------------------------------------------------------------
-- objective_links
--   Same fix applied to the nested published-course check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS objective_links_select ON public.objective_links;
CREATE POLICY objective_links_select ON public.objective_links
FOR SELECT USING (
  is_learning_editor()
  OR EXISTS (
    SELECT 1
    FROM learning_objectives o
    WHERE o.id = objective_links.objective_id
      AND (
        (o.course_id IS NULL)
        OR EXISTS (
          SELECT 1
          FROM courses c
          WHERE c.id = o.course_id
            AND c.status = 'published'
            AND c.is_deleted = false
            AND (
              is_platform_super_admin()
              OR c.is_master_template = true
              OR ((c.organization_id IS NOT NULL) AND org_visible(c.organization_id))
            )
        )
      )
  )
);

COMMIT;
