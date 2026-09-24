-- Migration: phase2_suspension_policy_sweep
-- Wrap remaining tenant policies with org_is_operational checks

-- 1. assessments
DROP POLICY IF EXISTS multitenant_assessments_select ON public.assessments;
CREATE POLICY multitenant_assessments_select ON public.assessments
FOR SELECT USING (
  (COALESCE(is_deleted, false) = false) AND (
    is_platform_super_admin() OR (is_master_template = true) OR (
      (((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id))
       OR has_active_platform_session(organization_id))
      AND ((status = 'published') OR (created_by = auth.uid()) OR is_tenant_content_editor(organization_id))
    )
  )
);

-- 2. brands
DROP POLICY IF EXISTS brands_tenant_isolation_select ON public.brands;
CREATE POLICY brands_tenant_isolation_select ON public.brands
FOR SELECT USING (
  is_platform_super_admin()
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids())) AND public.org_is_operational(organization_id))
      OR has_active_platform_session(organization_id))
);

-- 3. enrollments
DROP POLICY IF EXISTS multitenant_enrollments_select ON public.enrollments;
CREATE POLICY multitenant_enrollments_select ON public.enrollments
FOR SELECT USING (
  is_platform_super_admin()
  OR (user_id = auth.uid() AND (organization_id IS NULL OR public.org_is_operational(organization_id)))
  OR (((organization_id IN (SELECT unnest(current_user_organization_ids())) AND public.org_is_operational(organization_id))
       OR has_active_platform_session(organization_id)) AND is_tenant_content_editor(organization_id))
);

DROP POLICY IF EXISTS multitenant_enrollments_insert ON public.enrollments;
CREATE POLICY multitenant_enrollments_insert ON public.enrollments
FOR INSERT WITH CHECK (
  is_platform_super_admin()
  OR has_active_platform_session(organization_id)
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id) AND is_tenant_content_editor(organization_id))
);

DROP POLICY IF EXISTS multitenant_enrollments_update ON public.enrollments;
CREATE POLICY multitenant_enrollments_update ON public.enrollments
FOR UPDATE USING (
  is_platform_super_admin()
  OR has_active_platform_session(organization_id)
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id) AND is_tenant_content_editor(organization_id))
);

DROP POLICY IF EXISTS multitenant_enrollments_delete ON public.enrollments;
CREATE POLICY multitenant_enrollments_delete ON public.enrollments
FOR DELETE USING (
  is_platform_super_admin()
  OR has_active_platform_session(organization_id)
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id) AND is_tenant_admin(organization_id))
);

-- 4. hotels
DROP POLICY IF EXISTS hotels_tenant_isolation_select ON public.hotels;
CREATE POLICY hotels_tenant_isolation_select ON public.hotels
FOR SELECT USING (
  is_platform_super_admin()
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids())) AND public.org_is_operational(organization_id))
      OR has_active_platform_session(organization_id))
);

-- 5. training_assignment_rules
DROP POLICY IF EXISTS multitenant_tar_select ON public.training_assignment_rules;
CREATE POLICY multitenant_tar_select ON public.training_assignment_rules
FOR SELECT USING (
  is_platform_super_admin()
  OR ((organization_id IN (SELECT unnest(current_user_organization_ids())) AND public.org_is_operational(organization_id))
      OR has_active_platform_session(organization_id))
);

-- 6. training_modules
DROP POLICY IF EXISTS multitenant_training_modules_select ON public.training_modules;
CREATE POLICY multitenant_training_modules_select ON public.training_modules
FOR SELECT USING (
  (COALESCE(is_deleted, false) = false) AND (
    is_platform_super_admin() OR (is_master_template = true) OR (
      (((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id))
       OR has_active_platform_session(organization_id))
      AND ((status = 'published') OR (created_by = auth.uid()) OR is_tenant_content_editor(organization_id))
    )
  )
);

DROP POLICY IF EXISTS multitenant_training_modules_write ON public.training_modules;
CREATE POLICY multitenant_training_modules_write ON public.training_modules
FOR ALL USING (
  ((is_master_template = true) AND is_platform_super_admin())
  OR ((organization_id IS NOT NULL) AND (((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id))
      OR has_active_platform_session(organization_id)) AND (is_tenant_content_editor(organization_id) OR (created_by = auth.uid())))
);

-- 7. unified_questions
DROP POLICY IF EXISTS multitenant_unified_questions_select ON public.unified_questions;
CREATE POLICY multitenant_unified_questions_select ON public.unified_questions
FOR SELECT USING (
  is_platform_super_admin() OR (is_master_template = true) OR (
    (((organization_id IN (SELECT unnest(current_user_organization_ids()))) AND public.org_is_operational(organization_id))
     OR has_active_platform_session(organization_id))
    AND ((status = 'published'::question_status) OR (created_by = auth.uid()) OR is_tenant_content_editor(organization_id))
  )
);

-- 8. training_progress, certificates, submissions, quiz attempts
DROP POLICY IF EXISTS training_progress_sel ON public.training_progress;
CREATE POLICY training_progress_sel ON public.training_progress
FOR SELECT USING (
  (org_visible(organization_id) AND (user_id = auth.uid() OR is_tenant_content_editor(organization_id)))
);

DROP POLICY IF EXISTS certificates_sel ON public.certificates;
CREATE POLICY certificates_sel ON public.certificates
FOR SELECT USING (
  (org_visible(organization_id) AND (user_id = auth.uid() OR is_tenant_content_editor(organization_id)))
);

DROP POLICY IF EXISTS unified_question_attempts_select ON public.unified_question_attempts;
CREATE POLICY unified_question_attempts_select ON public.unified_question_attempts
FOR SELECT USING (
  (org_visible(organization_id) AND (user_id = auth.uid() OR is_tenant_content_editor(organization_id)))
);

DROP POLICY IF EXISTS unified_quiz_sessions_select ON public.unified_quiz_sessions;
CREATE POLICY unified_quiz_sessions_select ON public.unified_quiz_sessions
FOR SELECT USING (
  (org_visible(organization_id) AND (user_id = auth.uid() OR is_tenant_content_editor(organization_id)))
);

DROP POLICY IF EXISTS training_assignment_submissions_sel ON public.training_assignment_submissions;
CREATE POLICY training_assignment_submissions_sel ON public.training_assignment_submissions
FOR SELECT USING (
  (org_visible(organization_id) AND (user_id = auth.uid() OR is_tenant_content_editor(organization_id)))
);
