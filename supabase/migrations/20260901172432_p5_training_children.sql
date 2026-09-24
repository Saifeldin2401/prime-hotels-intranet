
BEGIN;

CREATE OR REPLACE FUNCTION public.set_training_child_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_fk text := TG_ARGV[0];
  v_parent text := TG_ARGV[1];
  v_fkval uuid;
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT p.organization_id FROM public.%I p WHERE p.id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;
  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.set_training_child_org() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_training_child_org() TO authenticated, service_role;

-- helper to run per-table steps
DO $mig$
DECLARE
  r record;
  specs jsonb := '[
    {"t":"course_source_documents","fk":"training_module_id","p":"training_modules"},
    {"t":"module_skills","fk":"module_id","p":"training_modules"},
    {"t":"source_change_flags","fk":"training_module_id","p":"training_modules"},
    {"t":"training_certificate_settings","fk":"module_id","p":"training_modules"},
    {"t":"training_module_prerequisites","fk":"module_id","p":"training_modules"},
    {"t":"training_module_versions","fk":"training_module_id","p":"training_modules"},
    {"t":"training_block_progress","fk":"training_module_id","p":"training_modules"},
    {"t":"course_visual_assets","fk":"course_id","p":"training_modules"},
    {"t":"training_path_modules","fk":"path_id","p":"training_paths"},
    {"t":"user_path_enrollments","fk":"path_id","p":"training_paths"},
    {"t":"course_competencies","fk":"course_id","p":"courses"},
    {"t":"course_modules","fk":"course_id","p":"courses"},
    {"t":"training_certificates","fk":"training_progress_id","p":"training_progress"},
    {"t":"training_session_attendees","fk":"session_id","p":"training_sessions"}
  ]'::jsonb;
  s jsonb;
  tbl text; fk text; par text;
BEGIN
  FOR s IN SELECT * FROM jsonb_array_elements(specs) LOOP
    tbl := s->>'t'; fk := s->>'fk'; par := s->>'p';
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', tbl);
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema='public' AND table_name=tbl AND constraint_name=tbl||'_organization_id_fkey') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE',
        tbl, tbl||'_organization_id_fkey');
    END IF;
    EXECUTE format(
      'UPDATE public.%I x SET organization_id = COALESCE((SELECT p.organization_id FROM public.%I p WHERE p.id = x.%I), ''e0000000-0000-0000-0000-000000000001''::uuid) WHERE x.organization_id IS NULL',
      tbl, par, fk);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', 'idx_'||tbl||'_organization_id', tbl);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org ON public.%I', tbl);
    EXECUTE format('CREATE TRIGGER trg_set_org BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org(%L, %L)', tbl, fk, par);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$mig$;

-- extra source_change_flags document fallback backfill (already NOT NULL-safe, no-op if none)
UPDATE public.source_change_flags x
   SET organization_id = COALESCE(
     (SELECT m.organization_id FROM public.training_modules m WHERE m.id = x.training_module_id),
     (SELECT d.organization_id FROM public.documents d WHERE d.id = x.document_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE x.organization_id IS NULL;

-- ===== RLS remediation =====

-- course_source_documents
DROP POLICY IF EXISTS course_source_documents_select ON public.course_source_documents;
CREATE POLICY course_source_documents_select ON public.course_source_documents
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS course_source_documents_write ON public.course_source_documents;
CREATE POLICY course_source_documents_write ON public.course_source_documents
  FOR ALL TO authenticated
  USING (org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules tm WHERE tm.id = course_source_documents.training_module_id AND tm.created_by = (SELECT auth.uid()))))
  WITH CHECK (org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules tm WHERE tm.id = course_source_documents.training_module_id AND tm.created_by = (SELECT auth.uid()))));
DROP POLICY IF EXISTS course_source_documents_service_role_all ON public.course_source_documents;
CREATE POLICY course_source_documents_service_role_all ON public.course_source_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- module_skills
DROP POLICY IF EXISTS "Everyone can view module skills" ON public.module_skills;
CREATE POLICY module_skills_select ON public.module_skills FOR SELECT TO authenticated USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS module_skills_manage_insert ON public.module_skills;
CREATE POLICY module_skills_manage_insert ON public.module_skills FOR INSERT TO authenticated WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS module_skills_manage_update ON public.module_skills;
CREATE POLICY module_skills_manage_update ON public.module_skills FOR UPDATE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id)) WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS module_skills_manage_delete ON public.module_skills;
CREATE POLICY module_skills_manage_delete ON public.module_skills FOR DELETE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS module_skills_service_role_all ON public.module_skills;
CREATE POLICY module_skills_service_role_all ON public.module_skills FOR ALL TO service_role USING (true) WITH CHECK (true);

-- source_change_flags
DROP POLICY IF EXISTS source_change_flags_select ON public.source_change_flags;
CREATE POLICY source_change_flags_select ON public.source_change_flags
  FOR SELECT TO authenticated
  USING ((org_visible(organization_id) AND (is_content_manager((SELECT auth.uid())) OR is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules tm WHERE tm.id = source_change_flags.training_module_id AND (tm.created_by = (SELECT auth.uid()) OR tm.owner_id = (SELECT auth.uid()))))) OR is_platform_super_admin());
DROP POLICY IF EXISTS source_change_flags_update ON public.source_change_flags;
CREATE POLICY source_change_flags_update ON public.source_change_flags
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND (is_content_manager((SELECT auth.uid())) OR is_tenant_content_editor(organization_id)))
  WITH CHECK (org_visible(organization_id) AND (is_content_manager((SELECT auth.uid())) OR is_tenant_content_editor(organization_id)));
DROP POLICY IF EXISTS source_change_flags_service_role_all ON public.source_change_flags;
CREATE POLICY source_change_flags_service_role_all ON public.source_change_flags FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_certificate_settings
DROP POLICY IF EXISTS auth_view_cert_settings ON public.training_certificate_settings;
CREATE POLICY auth_view_cert_settings ON public.training_certificate_settings FOR SELECT TO authenticated USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS hr_admin_manage_cert_settings_insert ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_insert ON public.training_certificate_settings FOR INSERT TO authenticated WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_cert_settings_update ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_update ON public.training_certificate_settings FOR UPDATE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id)) WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_cert_settings_delete ON public.training_certificate_settings;
CREATE POLICY hr_admin_manage_cert_settings_delete ON public.training_certificate_settings FOR DELETE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS training_certificate_settings_service_role_all ON public.training_certificate_settings;
CREATE POLICY training_certificate_settings_service_role_all ON public.training_certificate_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_module_prerequisites
DROP POLICY IF EXISTS auth_view_prereqs ON public.training_module_prerequisites;
CREATE POLICY auth_view_prereqs ON public.training_module_prerequisites FOR SELECT TO authenticated USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS hr_admin_manage_prereqs_insert ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_insert ON public.training_module_prerequisites FOR INSERT TO authenticated WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_prereqs_update ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_update ON public.training_module_prerequisites FOR UPDATE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id)) WITH CHECK (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS hr_admin_manage_prereqs_delete ON public.training_module_prerequisites;
CREATE POLICY hr_admin_manage_prereqs_delete ON public.training_module_prerequisites FOR DELETE TO authenticated USING (org_visible(organization_id) AND is_tenant_content_editor(organization_id));
DROP POLICY IF EXISTS training_module_prerequisites_service_role_all ON public.training_module_prerequisites;
CREATE POLICY training_module_prerequisites_service_role_all ON public.training_module_prerequisites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_module_versions
DROP POLICY IF EXISTS training_module_versions_select ON public.training_module_versions;
CREATE POLICY training_module_versions_select ON public.training_module_versions
  FOR SELECT TO authenticated
  USING ((org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules m WHERE m.id = training_module_versions.training_module_id AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))))) OR is_platform_super_admin());
DROP POLICY IF EXISTS training_module_versions_write ON public.training_module_versions;
CREATE POLICY training_module_versions_write ON public.training_module_versions
  FOR ALL TO authenticated
  USING ((org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules m WHERE m.id = training_module_versions.training_module_id AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))))) OR is_platform_super_admin())
  WITH CHECK ((org_visible(organization_id) AND (is_tenant_content_editor(organization_id) OR EXISTS (SELECT 1 FROM public.training_modules m WHERE m.id = training_module_versions.training_module_id AND (m.created_by = (SELECT auth.uid()) OR m.updated_by = (SELECT auth.uid()))))) OR is_platform_super_admin());
DROP POLICY IF EXISTS training_module_versions_service_role_all ON public.training_module_versions;
CREATE POLICY training_module_versions_service_role_all ON public.training_module_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_block_progress
DROP POLICY IF EXISTS training_block_progress_select ON public.training_block_progress;
CREATE POLICY training_block_progress_select ON public.training_block_progress
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id)) OR is_platform_super_admin());
DROP POLICY IF EXISTS training_block_progress_service_role_all ON public.training_block_progress;
CREATE POLICY training_block_progress_service_role_all ON public.training_block_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

-- course_visual_assets
DROP POLICY IF EXISTS p5_course_visual_assets_select ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_select ON public.course_visual_assets FOR SELECT TO authenticated USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS p5_course_visual_assets_insert ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_insert ON public.course_visual_assets FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND created_by = (SELECT auth.uid()) AND (is_content_author((SELECT auth.uid())) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS p5_course_visual_assets_update ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_update ON public.course_visual_assets FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))))
  WITH CHECK (org_visible(organization_id) AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS p5_course_visual_assets_delete ON public.course_visual_assets;
CREATE POLICY p5_course_visual_assets_delete ON public.course_visual_assets FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND (created_by = (SELECT auth.uid()) OR is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS course_visual_assets_service_role_all ON public.course_visual_assets;
CREATE POLICY course_visual_assets_service_role_all ON public.course_visual_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_path_modules
DROP POLICY IF EXISTS p5_training_path_modules_select ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_select ON public.training_path_modules FOR SELECT TO authenticated USING (org_visible(organization_id) OR is_platform_super_admin());
DROP POLICY IF EXISTS p5_training_path_modules_insert ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_insert ON public.training_path_modules FOR INSERT TO authenticated WITH CHECK (org_visible(organization_id) AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS p5_training_path_modules_update ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_update ON public.training_path_modules FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))))
  WITH CHECK (org_visible(organization_id) AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS p5_training_path_modules_delete ON public.training_path_modules;
CREATE POLICY p5_training_path_modules_delete ON public.training_path_modules FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND (is_training_manager((SELECT auth.uid())) OR is_platform_admin((SELECT auth.uid()))));
DROP POLICY IF EXISTS training_path_modules_service_role_all ON public.training_path_modules;
CREATE POLICY training_path_modules_service_role_all ON public.training_path_modules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_path_enrollments
DROP POLICY IF EXISTS user_path_enrollments_view ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_view ON public.user_path_enrollments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id)) OR is_platform_super_admin());
DROP POLICY IF EXISTS user_path_enrollments_service_role_all ON public.user_path_enrollments;
CREATE POLICY user_path_enrollments_service_role_all ON public.user_path_enrollments FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
