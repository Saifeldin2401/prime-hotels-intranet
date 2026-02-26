-- Consolidate duplicate SELECT/INSERT policies and remove permissive overlaps.

-- departments
DROP POLICY IF EXISTS departments_select_authenticated ON public.departments;

-- document_acknowledgments
DROP POLICY IF EXISTS doc_ack_insert_own ON public.document_acknowledgments;
DROP POLICY IF EXISTS document_acknowledgments_insert ON public.document_acknowledgments;
CREATE POLICY document_acknowledgments_insert ON public.document_acknowledgments
  FOR INSERT TO public
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_acknowledgments.document_id
        AND (d.created_by = (SELECT auth.uid()) OR d.status = 'PUBLISHED'::public.document_status)
    )
  );

-- maintenance_attachments
DROP POLICY IF EXISTS "Users can upload maintenance attachments" ON public.maintenance_attachments;
DROP POLICY IF EXISTS maintenance_attachments_insert ON public.maintenance_attachments;
CREATE POLICY maintenance_attachments_insert ON public.maintenance_attachments
  FOR INSERT TO public
  WITH CHECK (
    ((SELECT auth.uid()) = uploaded_by_id)
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_tickets mt
      WHERE mt.id = maintenance_attachments.ticket_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.user_properties
            WHERE user_properties.user_id = (SELECT auth.uid())
              AND user_properties.property_id = mt.property_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_roles.user_id = (SELECT auth.uid())
              AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
          )
        )
    )
  );

-- maintenance_comments
DROP POLICY IF EXISTS "Users can create maintenance comments" ON public.maintenance_comments;
DROP POLICY IF EXISTS maintenance_comments_insert ON public.maintenance_comments;
CREATE POLICY maintenance_comments_insert ON public.maintenance_comments
  FOR INSERT TO public
  WITH CHECK (
    ((SELECT auth.uid()) = author_id)
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_tickets mt
      WHERE mt.id = maintenance_comments.ticket_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.user_properties
            WHERE user_properties.user_id = (SELECT auth.uid())
              AND user_properties.property_id = mt.property_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_roles.user_id = (SELECT auth.uid())
              AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'department_head'::public.app_role])
          )
        )
    )
  );

-- user_settings
DROP POLICY IF EXISTS user_settings_full_management ON public.user_settings;
DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;

CREATE POLICY user_settings_select ON public.user_settings
  FOR SELECT TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
  );

CREATE POLICY user_settings_insert ON public.user_settings
  FOR INSERT TO public
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
  );

CREATE POLICY user_settings_update ON public.user_settings
  FOR UPDATE TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
  );

CREATE POLICY user_settings_delete ON public.user_settings
  FOR DELETE TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::text)
  );

-- user_skills
DROP POLICY IF EXISTS "Admins can manage user skills" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can view all user skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can view own skills" ON public.user_skills;

CREATE POLICY user_skills_select ON public.user_skills
  FOR SELECT TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])
    )
  );

CREATE POLICY user_skills_insert_admin ON public.user_skills
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])
    )
  );

CREATE POLICY user_skills_update_admin ON public.user_skills
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])
    )
  );

CREATE POLICY user_skills_delete_admin ON public.user_skills
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role, 'property_hr'::public.app_role, 'department_head'::public.app_role])
    )
  );

-- sop_quiz_attempts
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.sop_quiz_attempts;
DROP POLICY IF EXISTS consolidated_sop_quiz_attempts_select ON public.sop_quiz_attempts;
CREATE POLICY sop_quiz_attempts_select ON public.sop_quiz_attempts
  FOR SELECT TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_departments ud_head ON ud_head.user_id = ur.user_id
      JOIN public.user_departments ud_staff ON ud_staff.department_id = ud_head.department_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'department_head'::public.app_role
        AND ud_staff.user_id = sop_quiz_attempts.user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.user_properties up_hr ON up_hr.user_id = ur.user_id
      JOIN public.user_properties up_staff ON up_staff.property_id = up_hr.property_id
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role = 'property_hr'::public.app_role
        AND up_staff.user_id = sop_quiz_attempts.user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::public.app_role, 'regional_hr'::public.app_role])
    )
  );

-- knowledge_questions
DROP POLICY IF EXISTS "Draft questions visible to creators" ON public.knowledge_questions;
DROP POLICY IF EXISTS "Published questions visible to all" ON public.knowledge_questions;
CREATE POLICY knowledge_questions_select ON public.knowledge_questions
  FOR SELECT TO public
  USING (
    status = 'published'::public.question_status
    OR created_by = (SELECT auth.uid())
    OR reviewed_by = (SELECT auth.uid())
  );

-- leaves
DROP POLICY IF EXISTS "Users can view own leaves" ON public.leaves;;
