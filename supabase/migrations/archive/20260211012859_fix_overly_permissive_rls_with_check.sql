
-- Phase 2: Fix overly permissive WITH CHECK (true) policies
-- Replace WITH CHECK (true) with proper access controls matching USING clause

-- 1. audit_logs: INSERT WITH CHECK (true) -> require authenticated user
-- Keep broad since audit logging is done by system/functions
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. pii_access_logs: INSERT WITH CHECK (true) -> require authenticated user
DROP POLICY IF EXISTS "pii_access_logs_insert_policy" ON public.pii_access_logs;
CREATE POLICY "pii_access_logs_insert_policy" ON public.pii_access_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. escalation_rules: ALL WITH CHECK (true) -> match USING clause role check
DROP POLICY IF EXISTS "consolidated_escalation_rules_all" ON public.escalation_rules;
CREATE POLICY "consolidated_escalation_rules_all" ON public.escalation_rules
  FOR ALL
  USING (
    has_role((SELECT (SELECT auth.uid())), 'regional_admin'::text) 
    OR auth_has_role((SELECT (SELECT auth.uid())), 'regional_admin'::text)
  )
  WITH CHECK (
    has_role((SELECT (SELECT auth.uid())), 'regional_admin'::text) 
    OR auth_has_role((SELECT (SELECT auth.uid())), 'regional_admin'::text)
  );

-- 4. job_postings: ALL WITH CHECK (true) -> match USING clause role check
DROP POLICY IF EXISTS "consolidated_job_postings_all" ON public.job_postings;
CREATE POLICY "consolidated_job_postings_all" ON public.job_postings
  FOR ALL
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_hr'::app_role, 'property_hr'::app_role, 'regional_admin'::app_role])
    ))
    OR auth_has_any_role((SELECT (SELECT auth.uid())), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text])
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_hr'::app_role, 'property_hr'::app_role, 'regional_admin'::app_role])
    ))
    OR auth_has_any_role((SELECT (SELECT auth.uid())), ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_manager'::text])
  );

-- 5. job_applications: UPDATE WITH CHECK (true) -> match USING clause role check
DROP POLICY IF EXISTS "consolidated_job_applications_update" ON public.job_applications;
CREATE POLICY "consolidated_job_applications_update" ON public.job_applications
  FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN job_postings jp ON jp.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = ANY(ARRAY['regional_hr'::app_role, 'property_hr'::app_role])
        AND jp.id = job_applications.job_posting_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = 'property_manager'::app_role
        AND (SELECT (SELECT auth.uid())) = ANY(job_applications.routed_to)
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN job_postings jp ON jp.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = ANY(ARRAY['regional_hr'::app_role, 'property_hr'::app_role])
        AND jp.id = job_applications.job_posting_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = 'property_manager'::app_role
        AND (SELECT (SELECT auth.uid())) = ANY(job_applications.routed_to)
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  );

-- 6. sop_assignments: ALL WITH CHECK (true) -> match USING clause role check
DROP POLICY IF EXISTS "consolidated_sop_assignments_all" ON public.sop_assignments;
CREATE POLICY "consolidated_sop_assignments_all" ON public.sop_assignments
  FOR ALL
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = 'property_hr'::app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = 'property_hr'::app_role
        AND sd.id = sop_assignments.sop_document_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  );

-- 7. sop_quiz_questions: ALL WITH CHECK (true) -> match USING clause role check
DROP POLICY IF EXISTS "consolidated_sop_quiz_questions_all" ON public.sop_quiz_questions;
CREATE POLICY "consolidated_sop_quiz_questions_all" ON public.sop_quiz_questions
  FOR ALL
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = 'property_hr'::app_role
        AND sd.id = sop_quiz_questions.sop_document_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_properties up ON up.user_id = ur.user_id
      JOIN sop_documents sd ON sd.property_id = up.property_id
      WHERE ur.user_id = (SELECT (SELECT auth.uid()))
        AND ur.role = 'property_hr'::app_role
        AND sd.id = sop_quiz_questions.sop_document_id
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT (SELECT auth.uid()))
        AND user_roles.role = ANY(ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
  );
;
