-- =============================================================================
-- P1 critical RLS leak #3: public.course_generation_jobs
-- -----------------------------------------------------------------------------
-- Problem:
--   course_generation_jobs already carries an organization_id column but has
--   ZERO org-aware policies. Its SELECT policy keyed off legacy user_roles
--   role names (super_admin/corporate_admin/regional_admin/property_manager/
--   department_head) with NO organization filter, so any user holding one of
--   those roles could read every tenant's course generation jobs. INSERT only
--   checked created_by = auth.uid() (no org binding). There were no UPDATE or
--   DELETE policies at all.
--
-- Fix:
--   * Rewrite SELECT/INSERT and add UPDATE/DELETE policies using the canonical
--     tenant RLS helpers (org_visible / is_tenant_content_editor /
--     is_platform_super_admin).
--   * Add a BEFORE INSERT trigger that defaults organization_id from the
--     creator's current_user_organization_ids()[1] when NULL, so inserts from
--     older clients still land in the right tenant and satisfy the new
--     WITH CHECK (org_visible(organization_id)).
--
-- Rollback notes:
--   BEGIN;
--     DROP TRIGGER IF EXISTS trg_course_generation_jobs_default_org ON public.course_generation_jobs;
--     DROP FUNCTION IF EXISTS public.course_generation_jobs_default_org();
--     DROP POLICY IF EXISTS course_generation_jobs_select ON public.course_generation_jobs;
--     DROP POLICY IF EXISTS course_generation_jobs_insert ON public.course_generation_jobs;
--     DROP POLICY IF EXISTS course_generation_jobs_update ON public.course_generation_jobs;
--     DROP POLICY IF EXISTS course_generation_jobs_delete ON public.course_generation_jobs;
--     -- (then re-create the prior legacy SELECT/INSERT policies if truly needed)
--   COMMIT;
-- =============================================================================

BEGIN;

ALTER TABLE public.course_generation_jobs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Default organization_id from the creator's primary org when not supplied.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.course_generation_jobs_default_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_generation_jobs_default_org ON public.course_generation_jobs;
CREATE TRIGGER trg_course_generation_jobs_default_org
  BEFORE INSERT ON public.course_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.course_generation_jobs_default_org();

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS course_generation_jobs_select ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_select
  ON public.course_generation_jobs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS course_generation_jobs_insert ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_insert
  ON public.course_generation_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND org_visible(organization_id)
  );

DROP POLICY IF EXISTS course_generation_jobs_update ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_update
  ON public.course_generation_jobs
  FOR UPDATE
  TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  )
  WITH CHECK (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS course_generation_jobs_delete ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_delete
  ON public.course_generation_jobs
  FOR DELETE
  TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

COMMIT;
