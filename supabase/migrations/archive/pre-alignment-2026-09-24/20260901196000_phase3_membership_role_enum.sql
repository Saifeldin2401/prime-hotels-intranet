-- Phase 3 (full): replace the free-text organization_memberships.role with a typed enum
-- matching the frontend TenantRole union exactly. The 4 values in use
-- (organization_admin, hotel_admin, department_manager, learner) are all canonical.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE public.membership_role AS ENUM (
      'organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin',
      'department_manager', 'training_manager', 'knowledge_manager', 'author',
      'instructor', 'learner'
    );
  END IF;
END $$;

DROP POLICY IF EXISTS org_memberships_tenant_isolation_admin ON public.organization_memberships;
DROP POLICY IF EXISTS org_memberships_tenant_isolation_select ON public.organization_memberships;

ALTER TABLE public.organization_memberships ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.organization_memberships
  ALTER COLUMN role TYPE public.membership_role USING role::text::public.membership_role;
ALTER TABLE public.organization_memberships ALTER COLUMN role SET DEFAULT 'learner'::public.membership_role;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT public.is_platform_super_admin() OR public.has_active_platform_session(p_org_id)
    OR EXISTS (SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
        AND role IN ('organization_owner','organization_admin'));
$fn$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT public.is_platform_super_admin() OR public.has_active_platform_session(p_org_id)
    OR EXISTS (SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
        AND role IN ('organization_owner','organization_admin','brand_admin','hotel_admin',
                     'training_manager','knowledge_manager','author','instructor'));
$fn$;

CREATE OR REPLACE FUNCTION public.is_tenant_people_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT public.is_platform_super_admin() OR public.has_active_platform_session(p_org_id)
    OR EXISTS (SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
        AND role IN ('organization_owner','organization_admin','hotel_admin'));
$fn$;
GRANT EXECUTE ON FUNCTION public.is_tenant_people_admin(uuid) TO authenticated;

CREATE POLICY org_memberships_tenant_isolation_select ON public.organization_memberships FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin() OR user_id = auth.uid()
  OR organization_id = ANY (public.current_user_organization_ids())
  OR public.has_active_platform_session(organization_id)
);
CREATE POLICY org_memberships_tenant_isolation_admin ON public.organization_memberships FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_people_admin(organization_id))
WITH CHECK (
  (public.is_platform_super_admin() OR public.is_tenant_people_admin(organization_id))
  AND (public.is_platform_super_admin() OR role <> 'organization_owner')
);
