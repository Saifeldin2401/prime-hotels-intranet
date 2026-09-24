BEGIN;

ALTER TABLE public.course_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.course_generation_jobs_default_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (public.current_user_organization_ids())[1];
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_course_generation_jobs_default_org ON public.course_generation_jobs;
CREATE TRIGGER trg_course_generation_jobs_default_org
  BEFORE INSERT ON public.course_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.course_generation_jobs_default_org();

DROP POLICY IF EXISTS course_generation_jobs_select ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_select ON public.course_generation_jobs
  FOR SELECT TO authenticated USING (
    created_by = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin());

DROP POLICY IF EXISTS course_generation_jobs_insert ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_insert ON public.course_generation_jobs
  FOR INSERT TO authenticated WITH CHECK (
    created_by = (SELECT auth.uid()) AND org_visible(organization_id));

DROP POLICY IF EXISTS course_generation_jobs_update ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_update ON public.course_generation_jobs
  FOR UPDATE TO authenticated USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin())
  WITH CHECK (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin());

DROP POLICY IF EXISTS course_generation_jobs_delete ON public.course_generation_jobs;
CREATE POLICY course_generation_jobs_delete ON public.course_generation_jobs
  FOR DELETE TO authenticated USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin());

COMMIT;
