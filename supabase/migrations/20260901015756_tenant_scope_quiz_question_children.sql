BEGIN;

ALTER TABLE public.unified_question_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p5_unified_question_options_select ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_select ON public.unified_question_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_options.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid()) OR org_visible(q.organization_id))));

DROP POLICY IF EXISTS p5_unified_question_options_insert ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_insert ON public.unified_question_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_options.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))));

DROP POLICY IF EXISTS p5_unified_question_options_update ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_update ON public.unified_question_options
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_options.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_options.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))));

DROP POLICY IF EXISTS p5_unified_question_options_delete ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_delete ON public.unified_question_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_options.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))));

ALTER TABLE public.unified_question_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_versions_select ON public.unified_question_versions;
CREATE POLICY unified_question_versions_select ON public.unified_question_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_versions.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid()) OR org_visible(q.organization_id))));

DROP POLICY IF EXISTS unified_question_versions_insert ON public.unified_question_versions;
CREATE POLICY unified_question_versions_insert ON public.unified_question_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_versions.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))));

ALTER TABLE public.unified_question_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_usages_select ON public.unified_question_usages;
CREATE POLICY unified_question_usages_select ON public.unified_question_usages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_usages.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid()) OR org_visible(q.organization_id))));

DROP POLICY IF EXISTS unified_question_usages_manage ON public.unified_question_usages;
CREATE POLICY unified_question_usages_manage ON public.unified_question_usages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_usages.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.unified_questions q WHERE q.id = unified_question_usages.question_id
      AND (is_platform_super_admin() OR q.created_by = (SELECT auth.uid())
        OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)))));

ALTER TABLE public.unified_question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_attempts_insert ON public.unified_question_attempts;
CREATE POLICY unified_question_attempts_insert ON public.unified_question_attempts
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (is_platform_super_admin() OR org_visible(organization_id)));

COMMIT;
