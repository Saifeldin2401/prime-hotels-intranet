BEGIN;

CREATE OR REPLACE FUNCTION public.set_p5_child_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;
  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;
  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_p5_child_org_from_parent() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_p5_child_org_from_parent() TO authenticated, service_role;

-- categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='categories'
      AND constraint_name='categories_organization_id_fkey') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.categories t SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.departments d WHERE d.id = t.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories (organization_id);
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.categories;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('departments', 'department_id');

-- document_categories
ALTER TABLE public.document_categories ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_categories'
      AND constraint_name='document_categories_organization_id_fkey') THEN
    ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_categories t SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.departments d WHERE d.id = t.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_categories_organization_id ON public.document_categories (organization_id);
ALTER TABLE public.document_categories ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_categories;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('departments', 'department_id');

-- document_folders
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='document_folders'
      AND constraint_name='document_folders_organization_id_fkey') THEN
    ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.document_folders t SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.departments d WHERE d.id = t.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_folders_organization_id ON public.document_folders (organization_id);
ALTER TABLE public.document_folders ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.document_folders;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('departments', 'department_id');

-- events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='events'
      AND constraint_name='events_organization_id_fkey') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.events t SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.departments d WHERE d.id = t.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events (organization_id);
ALTER TABLE public.events ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.events;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('departments', 'department_id');

-- report_definitions
ALTER TABLE public.report_definitions ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='report_definitions'
      AND constraint_name='report_definitions_organization_id_fkey') THEN
    ALTER TABLE public.report_definitions ADD CONSTRAINT report_definitions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.report_definitions t SET organization_id = COALESCE(
  (SELECT d.organization_id FROM public.departments d WHERE d.id = t.department_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_definitions_organization_id ON public.report_definitions (organization_id);
ALTER TABLE public.report_definitions ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.report_definitions;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('departments', 'department_id');

-- media_asset_usages
ALTER TABLE public.media_asset_usages ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='media_asset_usages'
      AND constraint_name='media_asset_usages_organization_id_fkey') THEN
    ALTER TABLE public.media_asset_usages ADD CONSTRAINT media_asset_usages_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.media_asset_usages t SET organization_id = COALESCE(
  (SELECT ma.organization_id FROM public.media_assets ma WHERE ma.id = t.media_asset_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_asset_usages_organization_id ON public.media_asset_usages (organization_id);
ALTER TABLE public.media_asset_usages ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.media_asset_usages;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.media_asset_usages
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('media_assets', 'media_asset_id');

-- media_collection_items
ALTER TABLE public.media_collection_items ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='media_collection_items'
      AND constraint_name='media_collection_items_organization_id_fkey') THEN
    ALTER TABLE public.media_collection_items ADD CONSTRAINT media_collection_items_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.media_collection_items t SET organization_id = COALESCE(
  (SELECT mc.organization_id FROM public.media_collections mc WHERE mc.id = t.collection_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_collection_items_organization_id ON public.media_collection_items (organization_id);
ALTER TABLE public.media_collection_items ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.media_collection_items;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.media_collection_items
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('media_collections', 'collection_id');

-- webhook_deliveries
ALTER TABLE public.webhook_deliveries ADD COLUMN IF NOT EXISTS organization_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='webhook_deliveries'
      AND constraint_name='webhook_deliveries_organization_id_fkey') THEN
    ALTER TABLE public.webhook_deliveries ADD CONSTRAINT webhook_deliveries_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
UPDATE public.webhook_deliveries t SET organization_id = COALESCE(
  (SELECT e.organization_id FROM public.webhook_endpoints e WHERE e.id = t.endpoint_id),
  'e0000000-0000-0000-0000-000000000001'::uuid) WHERE t.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_organization_id ON public.webhook_deliveries (organization_id);
ALTER TABLE public.webhook_deliveries ALTER COLUMN organization_id SET NOT NULL;
DROP TRIGGER IF EXISTS trg_set_org ON public.webhook_deliveries;
CREATE TRIGGER trg_set_org BEFORE INSERT ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_child_org_from_parent('webhook_endpoints', 'endpoint_id');

-- ================= RLS =================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select_authenticated  ON public.categories;
DROP POLICY IF EXISTS categories_manage_admin_insert   ON public.categories;
DROP POLICY IF EXISTS categories_manage_admin_update   ON public.categories;
DROP POLICY IF EXISTS categories_manage_admin_delete   ON public.categories;
CREATE POLICY categories_select_authenticated ON public.categories
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY categories_manage_admin_insert ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_tenant_admin(organization_id)
         OR public.is_tenant_content_editor(organization_id)
         OR public.is_platform_super_admin())
  );
CREATE POLICY categories_manage_admin_update ON public.categories
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_tenant_admin(organization_id)
         OR public.is_tenant_content_editor(organization_id)
         OR public.is_platform_super_admin())
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_tenant_admin(organization_id)
         OR public.is_tenant_content_editor(organization_id)
         OR public.is_platform_super_admin())
  );
CREATE POLICY categories_manage_admin_delete ON public.categories
  FOR DELETE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_tenant_admin(organization_id)
         OR public.is_tenant_content_editor(organization_id)
         OR public.is_platform_super_admin())
  );
DROP POLICY IF EXISTS categories_service_role_all ON public.categories;
CREATE POLICY categories_service_role_all ON public.categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_doc_cats               ON public.document_categories;
DROP POLICY IF EXISTS hr_admin_manage_doc_cats_insert  ON public.document_categories;
DROP POLICY IF EXISTS hr_admin_manage_doc_cats_update  ON public.document_categories;
DROP POLICY IF EXISTS hr_admin_manage_doc_cats_delete  ON public.document_categories;
CREATE POLICY auth_view_doc_cats ON public.document_categories
  FOR SELECT TO authenticated
  USING (public.org_visible(organization_id) OR public.is_platform_super_admin());
CREATE POLICY hr_admin_manage_doc_cats_insert ON public.document_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
CREATE POLICY hr_admin_manage_doc_cats_update ON public.document_categories
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
CREATE POLICY hr_admin_manage_doc_cats_delete ON public.document_categories
  FOR DELETE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
DROP POLICY IF EXISTS document_categories_service_role_all ON public.document_categories;
CREATE POLICY document_categories_service_role_all ON public.document_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_folders_delete ON public.document_folders;
CREATE POLICY document_folders_delete ON public.document_folders
  FOR DELETE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND is_system = false
    AND (
      has_role((SELECT auth.uid()), 'regional_admin'::app_role)
      OR (has_role((SELECT auth.uid()), 'property_manager'::app_role)
          AND property_id IS NOT NULL
          AND has_property_access((SELECT auth.uid()), property_id))
      OR created_by = (SELECT auth.uid())
      OR public.is_platform_super_admin()
    )
  );
DROP POLICY IF EXISTS document_folders_service_role_all ON public.document_folders;
CREATE POLICY document_folders_service_role_all ON public.document_folders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS events_select_consolidated  ON public.events;
DROP POLICY IF EXISTS "Users can create events"   ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
CREATE POLICY events_select_consolidated ON public.events
  FOR SELECT TO authenticated
  USING (
    (
      public.org_visible(organization_id)
      AND (is_public = true OR (SELECT auth.uid()) = ANY (attendees))
    )
    OR public.is_platform_super_admin()
  );
CREATE POLICY "Users can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );
CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );
DROP POLICY IF EXISTS events_service_role_all ON public.events;
CREATE POLICY events_service_role_all ON public.events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_admin_manage_report_defs_insert ON public.report_definitions;
DROP POLICY IF EXISTS hr_admin_manage_report_defs_update ON public.report_definitions;
DROP POLICY IF EXISTS hr_admin_manage_report_defs_delete ON public.report_definitions;
CREATE POLICY hr_admin_manage_report_defs_insert ON public.report_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
CREATE POLICY hr_admin_manage_report_defs_update ON public.report_definitions
  FOR UPDATE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  )
  WITH CHECK (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
CREATE POLICY hr_admin_manage_report_defs_delete ON public.report_definitions
  FOR DELETE TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (public.is_hr_or_admin((SELECT auth.uid())) OR public.is_platform_super_admin())
  );
DROP POLICY IF EXISTS report_definitions_service_role_all ON public.report_definitions;
CREATE POLICY report_definitions_service_role_all ON public.report_definitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
