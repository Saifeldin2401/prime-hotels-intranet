-- Migration: 20260901201000_database_deep_clean_hardening.sql
-- Description: Deep database cleanup and security hardening:
-- 1. Fix missing RLS policies on training_certificates
-- 2. Close leaks on document_department_access and knowledge_related_articles
-- 3. Drop duplicate permissive SELECT policies on assessments, courses, question_banks, unified_questions
-- 4. Set search_path TO 'public' on SECURITY DEFINER helper functions
-- 5. Revoke unauthenticated execution from anon/public on internal helper functions
-- 6. Add indexes on unindexed foreign key columns

-- ----------------------------------------------------------------------------
-- 1. RLS Policies on training_certificates
-- ----------------------------------------------------------------------------
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_certificates_sel" ON public.training_certificates;
CREATE POLICY training_certificates_sel ON public.training_certificates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
        AND (tp.user_id = (SELECT auth.uid()) OR (public.org_visible(tp.organization_id) AND public.is_tenant_content_editor(tp.organization_id)))
    )
  );

DROP POLICY IF EXISTS "training_certificates_ins" ON public.training_certificates;
CREATE POLICY training_certificates_ins ON public.training_certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
        AND (tp.user_id = (SELECT auth.uid()) OR (public.org_visible(tp.organization_id) AND public.is_tenant_content_editor(tp.organization_id)))
    )
  );

DROP POLICY IF EXISTS "training_certificates_upd" ON public.training_certificates;
CREATE POLICY training_certificates_upd ON public.training_certificates
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
        AND public.org_visible(tp.organization_id) AND public.is_tenant_content_editor(tp.organization_id)
    )
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
        AND public.org_visible(tp.organization_id) AND public.is_tenant_content_editor(tp.organization_id)
    )
  );

DROP POLICY IF EXISTS "training_certificates_del" ON public.training_certificates;
CREATE POLICY training_certificates_del ON public.training_certificates
  FOR DELETE TO authenticated
  USING (
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
        AND public.org_visible(tp.organization_id) AND public.is_tenant_admin(tp.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Scope document_department_access and knowledge_related_articles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "View department access" ON public.document_department_access;
DROP POLICY IF EXISTS "document_department_access_sel" ON public.document_department_access;
CREATE POLICY document_department_access_sel ON public.document_department_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_department_access.document_id
        AND (d.is_master_template = true OR public.org_visible(d.organization_id))
    )
  );

DROP POLICY IF EXISTS "document_department_access_write" ON public.document_department_access;
CREATE POLICY document_department_access_write ON public.document_department_access
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_department_access.document_id
        AND (public.org_visible(d.organization_id) AND public.is_tenant_content_editor(d.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_department_access.document_id
        AND (public.org_visible(d.organization_id) AND public.is_tenant_content_editor(d.organization_id))
    )
  );

DROP POLICY IF EXISTS "Anyone can view related articles" ON public.knowledge_related_articles;
DROP POLICY IF EXISTS "knowledge_related_articles_sel" ON public.knowledge_related_articles;
CREATE POLICY knowledge_related_articles_sel ON public.knowledge_related_articles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = knowledge_related_articles.document_id
        AND (d.is_master_template = true OR public.org_visible(d.organization_id))
    )
  );

DROP POLICY IF EXISTS "knowledge_related_articles_write" ON public.knowledge_related_articles;
CREATE POLICY knowledge_related_articles_write ON public.knowledge_related_articles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = knowledge_related_articles.document_id
        AND (public.org_visible(d.organization_id) AND public.is_tenant_content_editor(d.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = knowledge_related_articles.document_id
        AND (public.org_visible(d.organization_id) AND public.is_tenant_content_editor(d.organization_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Drop duplicate permissive SELECT policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assessments_select_tenant" ON public.assessments;
DROP POLICY IF EXISTS "courses_select_tenant" ON public.courses;
DROP POLICY IF EXISTS "question_banks_select_tenant" ON public.question_banks;
DROP POLICY IF EXISTS "unified_questions_select_tenant" ON public.unified_questions;

-- ----------------------------------------------------------------------------
-- 4. Harden search_path on canonical helper functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT organization_id FROM public.organization_memberships
  WHERE user_id = auth.uid() AND is_active = true;
$fn$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_operator_impersonated_org()
RETURNS uuid STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT target_organization_id FROM public.platform_access_sessions
  WHERE admin_user_id = auth.uid() 
    AND is_active = true 
    AND expires_at > now()
  LIMIT 1;
$fn$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_platform_user(target_user_id uuid)
RETURNS boolean STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id 
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin')
  );
$fn$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.has_tenant_access(record_org_id uuid)
RETURNS boolean STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT (
    (record_org_id IS NOT NULL AND record_org_id IN (SELECT public.get_user_organizations()))
    OR (record_org_id IS NOT NULL AND record_org_id = public.get_operator_impersonated_org())
    OR (public.is_platform_user(auth.uid()))
  );
$fn$ LANGUAGE sql;

-- ----------------------------------------------------------------------------
-- 5. Revoke anon/public execution from internal SECDEF helper functions
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_user_organizations() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_operator_impersonated_org() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_platform_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_platform_super_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_content_editor(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_people_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.org_visible(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_organization_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_has_organization_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.users_share_active_org(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_platform_session(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_learning_editor(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_content_author(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_knowledge_manager(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_training_manager(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.issue_training_certificate(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_module_quiz_integrity(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_training_module_publish_integrity() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_content_reviews_changelog() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_operator_impersonated_org() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_content_editor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_people_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_organization_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_share_active_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_platform_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_learning_editor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_content_author(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_knowledge_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_training_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_training_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_module_quiz_integrity(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Add indexes on unindexed foreign key columns
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_course_id ON public.ai_usage_log (course_id);
CREATE INDEX IF NOT EXISTS idx_course_visual_assets_content_block_id ON public.course_visual_assets (content_block_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_session_id ON public.platform_audit_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_source_change_flags_document_id ON public.source_change_flags (document_id);
CREATE INDEX IF NOT EXISTS idx_source_change_flags_resolved_by ON public.source_change_flags (resolved_by);
