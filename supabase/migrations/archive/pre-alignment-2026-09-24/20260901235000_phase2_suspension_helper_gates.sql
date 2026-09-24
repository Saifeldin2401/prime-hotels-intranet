-- Migration: phase2_suspension_helper_gates
-- Add org_is_operational check to tenant role helper functions

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND (organization_id = p_org_id OR p_org_id IS NULL)
        AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin')
        AND public.org_is_operational(organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND (organization_id = p_org_id OR p_org_id IS NULL)
        AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin', 
                     'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
        AND public.org_is_operational(organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_people_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND organization_id = p_org_id
        AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'hotel_admin')
        AND public.org_is_operational(organization_id)
    );
$$;
