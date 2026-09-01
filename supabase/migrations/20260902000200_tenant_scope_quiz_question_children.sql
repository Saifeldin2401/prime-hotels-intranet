-- 20260902000100_tenant_scope_quiz_question_children.sql
--
-- P1 critical RLS leak #2: quiz/question child tables were gated on GLOBAL legacy
-- roles (is_training_manager() / is_platform_admin() / is_content_author()) rather
-- than the owning organization of the parent question. Any content author in ANY
-- tenant could read/write every other tenant's question options, versions and
-- usage rows.
--
-- Fix: re-gate every child-table policy through unified_questions.organization_id
-- using the canonical tenant helpers:
--   SELECT  -> org_visible(q.organization_id)
--   WRITE   -> org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id)
--   always  -> plus q.created_by = auth.uid() self-access and is_platform_super_admin() bypass
--
-- assessment_questions was already correctly gated through assessments.organization_id
-- (verified) and is left unchanged.
--
-- Rollback: restore the prior policy bodies from migration history
-- (git show <prev>:supabase/migrations for the p5_unified_question_options_* /
-- unified_question_versions_* / unified_question_usages_* / unified_question_attempts_*
-- definitions) and re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- unified_question_options
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_question_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p5_unified_question_options_select ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_select ON public.unified_question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_options.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR org_visible(q.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS p5_unified_question_options_insert ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_insert ON public.unified_question_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_options.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS p5_unified_question_options_update ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_update ON public.unified_question_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_options.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_options.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS p5_unified_question_options_delete ON public.unified_question_options;
CREATE POLICY p5_unified_question_options_delete ON public.unified_question_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_options.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- unified_question_versions  (child of unified_questions via question_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_question_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_versions_select ON public.unified_question_versions;
CREATE POLICY unified_question_versions_select ON public.unified_question_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_versions.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR org_visible(q.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS unified_question_versions_insert ON public.unified_question_versions;
CREATE POLICY unified_question_versions_insert ON public.unified_question_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_versions.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- unified_question_usages  (child of unified_questions via question_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_question_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_usages_select ON public.unified_question_usages;
CREATE POLICY unified_question_usages_select ON public.unified_question_usages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_usages.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR org_visible(q.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS unified_question_usages_manage ON public.unified_question_usages;
CREATE POLICY unified_question_usages_manage ON public.unified_question_usages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_usages.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unified_questions q
      WHERE q.id = unified_question_usages.question_id
        AND (
          is_platform_super_admin()
          OR q.created_by = (SELECT auth.uid())
          OR (org_visible(q.organization_id) AND is_tenant_content_editor(q.organization_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- unified_question_attempts
-- SELECT policy already tenant-gated via org_visible(organization_id).
-- Harden the INSERT so a user can only record an attempt for a question whose
-- org is visible to them (previously only checked user_id = auth.uid()).
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_question_attempts_insert ON public.unified_question_attempts;
CREATE POLICY unified_question_attempts_insert ON public.unified_question_attempts
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      is_platform_super_admin()
      OR org_visible(organization_id)
    )
  );

COMMIT;
