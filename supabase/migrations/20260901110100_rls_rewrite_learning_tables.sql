-- Migration: RLS rewrite for the learning tables under the 5-role model
-- File: 20260901110100_rls_rewrite_learning_tables.sql
--
-- ============================================================================
-- APPLY ON STAGING FIRST. Requires 20260901110000_five_role_model.sql.
-- ============================================================================
--
-- Every learning table gets fresh, small, per-operation policies:
--   * SELECT / INSERT / UPDATE / DELETE are separate policies (no FOR ALL)
--   * every write policy carries WITH CHECK
--   * gating is expressed with the platform-role helpers from 110000:
--       is_platform_admin()  - administrator (+ legacy super/corporate admin)
--       is_training_manager() - training_manager (+ admin)
--       is_content_author()   - author (+ training_manager, admin)
--       is_knowledge_manager()- knowledge_manager (+ training_manager, admin)
--   * a plain learner has NO write path to any authoring/config table
--
-- Holes this closes (see docs/roles-and-rls.md):
--   H1  training_assignment_rules "manageable by admins" was FOR ALL with
--       with_check = NULL  -> forgeable rows. Now per-op + WITH CHECK.
--   H2  training_paths "paths_manage" was FOR ALL with with_check = NULL.
--   H3  departments "departments_modify_admin_pm" was FOR ALL; a learner with
--       no matching role fell through to other permissive policies on writes.
--       Departments are now administrator-only for writes, per-op + WITH CHECK.
--   H4  training_modules / learning_quizzes / unified_* INSERT policies did not
--       pin created_by = auth.uid(); a user could author rows attributed to
--       someone else. Now every INSERT WITH CHECK pins ownership.
--   H5  certificates INSERT allowed self-issued 'training' certs via a weak
--       OR branch. Now training certs require a training_manager/admin.

BEGIN;

-- ===========================================================================
-- training_modules
-- ===========================================================================
DROP POLICY IF EXISTS training_modules_select_scope   ON public.training_modules;
DROP POLICY IF EXISTS training_modules_insert_admins  ON public.training_modules;
DROP POLICY IF EXISTS training_modules_update_admins  ON public.training_modules;
DROP POLICY IF EXISTS training_modules_delete_admins  ON public.training_modules;

CREATE POLICY p5_training_modules_select ON public.training_modules
  FOR SELECT TO authenticated
  USING (
    is_deleted IS NOT TRUE
    AND (
      status::text = 'published'
      OR created_by = (SELECT auth.uid())
      OR public.is_content_author()
      OR public.is_training_manager()
      OR public.is_platform_admin()
    )
  );

CREATE POLICY p5_training_modules_insert ON public.training_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_training_modules_update ON public.training_modules
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_training_manager()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_training_modules_delete ON public.training_modules
  FOR DELETE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- training_progress  (learner-owned rows)
-- ===========================================================================
DROP POLICY IF EXISTS training_progress_select ON public.training_progress;
DROP POLICY IF EXISTS training_progress_insert ON public.training_progress;
DROP POLICY IF EXISTS training_progress_update ON public.training_progress;
DROP POLICY IF EXISTS training_progress_delete ON public.training_progress;

CREATE POLICY p5_training_progress_select ON public.training_progress
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_training_progress_insert ON public.training_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY p5_training_progress_update ON public.training_progress
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_progress_delete ON public.training_progress
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ===========================================================================
-- learning_quizzes
-- ===========================================================================
DROP POLICY IF EXISTS learning_quizzes_select ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_insert ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_update ON public.learning_quizzes;
DROP POLICY IF EXISTS learning_quizzes_delete ON public.learning_quizzes;

CREATE POLICY p5_learning_quizzes_select ON public.learning_quizzes
  FOR SELECT TO authenticated
  USING (
    is_deleted IS NOT TRUE
    AND (
      status::text = 'published'
      OR created_by = (SELECT auth.uid())
      OR public.is_content_author()
      OR public.is_training_manager()
      OR public.is_platform_admin()
    )
  );

CREATE POLICY p5_learning_quizzes_insert ON public.learning_quizzes
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_learning_quizzes_update ON public.learning_quizzes
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_learning_quizzes_delete ON public.learning_quizzes
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- learning_quiz_questions  (quiz <-> question link rows)
-- ===========================================================================
ALTER TABLE public.learning_quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_learning_quiz_questions_select ON public.learning_quiz_questions;
DROP POLICY IF EXISTS p5_learning_quiz_questions_write  ON public.learning_quiz_questions;

CREATE POLICY p5_learning_quiz_questions_select ON public.learning_quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.learning_quizzes q WHERE q.id = quiz_id)
  );

CREATE POLICY p5_learning_quiz_questions_insert ON public.learning_quiz_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_quizzes q
      WHERE q.id = quiz_id
        AND (q.created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
    )
  );

CREATE POLICY p5_learning_quiz_questions_update ON public.learning_quiz_questions
  FOR UPDATE TO authenticated
  USING (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_learning_quiz_questions_delete ON public.learning_quiz_questions
  FOR DELETE TO authenticated
  USING (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- unified_questions
-- ===========================================================================
DROP POLICY IF EXISTS unified_questions_select ON public.unified_questions;
DROP POLICY IF EXISTS unified_questions_insert ON public.unified_questions;
DROP POLICY IF EXISTS unified_questions_update ON public.unified_questions;
DROP POLICY IF EXISTS unified_questions_delete ON public.unified_questions;

CREATE POLICY p5_unified_questions_select ON public.unified_questions
  FOR SELECT TO authenticated
  USING (
    status::text = 'published'
    OR created_by = (SELECT auth.uid())
    OR public.is_content_author()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_unified_questions_insert ON public.unified_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_unified_questions_update ON public.unified_questions
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_unified_questions_delete ON public.unified_questions
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- unified_question_options  (mirror parent question)
-- ===========================================================================
DROP POLICY IF EXISTS unified_question_options_select ON public.unified_question_options;
DROP POLICY IF EXISTS unified_question_options_insert ON public.unified_question_options;
DROP POLICY IF EXISTS unified_question_options_update ON public.unified_question_options;
DROP POLICY IF EXISTS unified_question_options_delete ON public.unified_question_options;

CREATE POLICY p5_unified_question_options_select ON public.unified_question_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = question_id
        AND (
          q.status::text = 'published'
          OR q.created_by = (SELECT auth.uid())
          OR public.is_content_author()
          OR public.is_training_manager()
          OR public.is_platform_admin()
        )
    )
  );

CREATE POLICY p5_unified_question_options_insert ON public.unified_question_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = question_id
        AND (q.created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
    )
  );

CREATE POLICY p5_unified_question_options_update ON public.unified_question_options
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = question_id
        AND (q.created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = question_id
        AND (q.created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
    )
  );

CREATE POLICY p5_unified_question_options_delete ON public.unified_question_options
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = question_id
        AND (q.created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
    )
  );

-- ===========================================================================
-- documents  (training blocks + knowledge base)
--   NOTE: this replaces the elaborate per-visibility SELECT with a simpler
--   published-or-owner-or-manager read. The department/property/role scoped
--   visibility of the legacy intranet is intentionally dropped for the
--   learning-platform product; revisit if KB scoping is reintroduced.
-- ===========================================================================
DROP POLICY IF EXISTS documents_select_consolidated   ON public.documents;
DROP POLICY IF EXISTS documents_modify_author_approver ON public.documents;
DROP POLICY IF EXISTS documents_update_author_approver ON public.documents;
DROP POLICY IF EXISTS documents_delete_author_approver ON public.documents;

CREATE POLICY p5_documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      status::text = 'PUBLISHED'
      OR created_by = (SELECT auth.uid())
      OR public.is_content_author()
      OR public.is_knowledge_manager()
      OR public.is_training_manager()
      OR public.is_platform_admin()
    )
  );

CREATE POLICY p5_documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      public.is_content_author()
      OR public.is_knowledge_manager()
      OR public.is_training_manager()
      OR public.is_platform_admin()
    )
  );

CREATE POLICY p5_documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_knowledge_manager()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR public.is_knowledge_manager()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_documents_delete ON public.documents
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_knowledge_manager()
    OR public.is_platform_admin()
  );

-- ===========================================================================
-- certificates
-- ===========================================================================
DROP POLICY IF EXISTS consolidated_certificates_select        ON public.certificates;
DROP POLICY IF EXISTS "Authenticated can insert certificates"  ON public.certificates;

CREATE POLICY p5_certificates_select ON public.certificates
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_certificates_insert ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_training_manager()
    OR public.is_platform_admin()
    OR (user_id = (SELECT auth.uid()) AND (certificate_type)::text <> 'training')
  );

CREATE POLICY p5_certificates_update ON public.certificates
  FOR UPDATE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_certificates_delete ON public.certificates
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ===========================================================================
-- skills  (shared taxonomy, no owner column)
-- ===========================================================================
DROP POLICY IF EXISTS "Everyone can view skills" ON public.skills;
DROP POLICY IF EXISTS skills_manage_insert       ON public.skills;
DROP POLICY IF EXISTS skills_manage_update       ON public.skills;
DROP POLICY IF EXISTS skills_manage_delete       ON public.skills;

CREATE POLICY p5_skills_select ON public.skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY p5_skills_insert ON public.skills
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_skills_update ON public.skills
  FOR UPDATE TO authenticated
  USING (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_skills_delete ON public.skills
  FOR DELETE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- training_paths  (H2)
-- ===========================================================================
DROP POLICY IF EXISTS paths_view   ON public.training_paths;
DROP POLICY IF EXISTS paths_manage ON public.training_paths;

CREATE POLICY p5_training_paths_select ON public.training_paths
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_paths_insert ON public.training_paths
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_training_paths_update ON public.training_paths
  FOR UPDATE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_paths_delete ON public.training_paths
  FOR DELETE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- training_path_modules  (link rows)
-- ===========================================================================
ALTER TABLE public.training_path_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_training_path_modules_select ON public.training_path_modules;
DROP POLICY IF EXISTS p5_training_path_modules_insert ON public.training_path_modules;
DROP POLICY IF EXISTS p5_training_path_modules_update ON public.training_path_modules;
DROP POLICY IF EXISTS p5_training_path_modules_delete ON public.training_path_modules;

CREATE POLICY p5_training_path_modules_select ON public.training_path_modules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_paths p WHERE p.id = path_id));

CREATE POLICY p5_training_path_modules_insert ON public.training_path_modules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_path_modules_update ON public.training_path_modules
  FOR UPDATE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_path_modules_delete ON public.training_path_modules
  FOR DELETE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- training_assignment_rules  (H1)
-- ===========================================================================
DROP POLICY IF EXISTS "Training rules manageable by admins"   ON public.training_assignment_rules;
DROP POLICY IF EXISTS training_assignment_rules_user_select   ON public.training_assignment_rules;

CREATE POLICY p5_training_assignment_rules_select ON public.training_assignment_rules
  FOR SELECT TO authenticated
  USING (
    public.is_training_manager()
    OR public.is_platform_admin()
    OR (
      COALESCE(is_deleted, false) = false
      AND (
        target_type = 'everyone'
        OR (target_role IS NOT NULL AND target_role IN (
              SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())))
        OR (target_department_id IS NOT NULL AND target_department_id IN (
              SELECT ud.department_id FROM public.user_departments ud WHERE ud.user_id = (SELECT auth.uid())))
      )
    )
  );

CREATE POLICY p5_training_assignment_rules_insert ON public.training_assignment_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_training_assignment_rules_update ON public.training_assignment_rules
  FOR UPDATE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_assignment_rules_delete ON public.training_assignment_rules
  FOR DELETE TO authenticated
  USING (public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- training_assignment_submissions
-- ===========================================================================
DROP POLICY IF EXISTS "Learners can submit own assignments"            ON public.training_assignment_submissions;
DROP POLICY IF EXISTS "Learners and instructors can view submissions"  ON public.training_assignment_submissions;
DROP POLICY IF EXISTS "Learners and instructors can update submissions" ON public.training_assignment_submissions;

CREATE POLICY p5_training_assignment_submissions_select ON public.training_assignment_submissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_training_assignment_submissions_insert ON public.training_assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY p5_training_assignment_submissions_update ON public.training_assignment_submissions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_training_assignment_submissions_delete ON public.training_assignment_submissions
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ===========================================================================
-- media_assets
-- ===========================================================================
DROP POLICY IF EXISTS media_assets_select ON public.media_assets;
DROP POLICY IF EXISTS media_assets_insert ON public.media_assets;
DROP POLICY IF EXISTS media_assets_update ON public.media_assets;
DROP POLICY IF EXISTS media_assets_delete ON public.media_assets;

CREATE POLICY p5_media_assets_select ON public.media_assets
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR uploaded_by = (SELECT auth.uid())
    OR public.is_content_author()
    OR public.is_knowledge_manager()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_media_assets_insert ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (
      public.is_content_author()
      OR public.is_knowledge_manager()
      OR public.is_training_manager()
      OR public.is_platform_admin()
    )
  );

CREATE POLICY p5_media_assets_update ON public.media_assets
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.is_knowledge_manager()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    OR public.is_knowledge_manager()
    OR public.is_training_manager()
    OR public.is_platform_admin()
  );

CREATE POLICY p5_media_assets_delete ON public.media_assets
  FOR DELETE TO authenticated
  USING (uploaded_by = (SELECT auth.uid()) OR public.is_platform_admin());

-- ===========================================================================
-- course_visual_assets
-- ===========================================================================
DROP POLICY IF EXISTS course_visual_assets_select ON public.course_visual_assets;
DROP POLICY IF EXISTS course_visual_assets_insert ON public.course_visual_assets;
DROP POLICY IF EXISTS course_visual_assets_update ON public.course_visual_assets;
DROP POLICY IF EXISTS course_visual_assets_delete ON public.course_visual_assets;

CREATE POLICY p5_course_visual_assets_select ON public.course_visual_assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY p5_course_visual_assets_insert ON public.course_visual_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (public.is_content_author() OR public.is_training_manager() OR public.is_platform_admin())
  );

CREATE POLICY p5_course_visual_assets_update ON public.course_visual_assets
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin())
  WITH CHECK (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_course_visual_assets_delete ON public.course_visual_assets
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.is_training_manager() OR public.is_platform_admin());

-- ===========================================================================
-- departments  (H3) - org config, administrator-only writes
-- ===========================================================================
DROP POLICY IF EXISTS departments_select_authenticated ON public.departments;
DROP POLICY IF EXISTS departments_modify_admin_pm       ON public.departments;

CREATE POLICY p5_departments_select ON public.departments
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_training_manager() OR public.is_platform_admin());

CREATE POLICY p5_departments_insert ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY p5_departments_update ON public.departments
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY p5_departments_delete ON public.departments
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

COMMIT;
