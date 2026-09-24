-- Phase 4 (partial) + platform-owner bootstrap.
--
-- 1. PLATFORM OWNER: no account held app_role 'super_admin', so is_platform_super_admin()
--    was false for everyone -> the /platform/* operator console and all master-content
--    management were unreachable. Designate the platform owner (islam.mahrous@gmail.com).
INSERT INTO public.user_roles (user_id, role)
SELECT '5aa53b85-30df-4acb-a638-2c7adafa07e5', 'super_admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '5aa53b85-30df-4acb-a638-2c7adafa07e5' AND role = 'super_admin'::app_role
);

-- 2. properties: drop the USING(true) cross-tenant list leak, scope to org.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id) ON DELETE CASCADE
  DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.properties SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='properties'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', p.policyname); END LOOP;
END $$;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_sel ON public.properties FOR SELECT TO authenticated
USING (public.org_visible(organization_id));
CREATE POLICY properties_write ON public.properties FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)))
WITH CHECK (public.is_platform_super_admin() OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)));

DROP POLICY IF EXISTS "brands_select_public" ON public.brands;
DROP POLICY IF EXISTS "properties_select_public" ON public.properties;
