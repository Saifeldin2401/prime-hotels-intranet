-- Migration: 20260926180000_multitenant_identity_isolation.sql
-- Description: Enforce multi-tenant identity and membership isolation.
-- 1. Ensure unique membership per tenant per user.
-- 2. Provide audited tenant member removal RPC (deactivating membership, preserving global identity).

-- 1. Add unique constraint on (organization_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.organization_memberships'::regclass 
      AND conname = 'uq_organization_memberships_org_user'
  ) THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_org_user UNIQUE (organization_id, user_id);
  END IF;
END $$;

-- 2. Tenant member removal RPC: deactivates membership in the specific tenant
-- without affecting the user's global profile or their memberships in other tenants.
CREATE OR REPLACE FUNCTION public.remove_tenant_member(
  p_org_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_authorized boolean := false;
  v_target_role membership_role;
BEGIN
  -- Verify caller authority: platform operator or tenant people admin
  IF public.is_platform_operator(v_caller_id) THEN
    v_is_authorized := true;
  ELSIF public.is_tenant_people_admin(p_org_id) AND public.org_is_operational(p_org_id) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to manage members in this organization.'
      USING ERRCODE = '42501';
  END IF;

  -- Ensure we don't accidentally remove an organization_owner unless platform operator
  SELECT role INTO v_target_role
  FROM public.organization_memberships
  WHERE organization_id = p_org_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_target_role = 'organization_owner' AND NOT public.is_platform_operator(v_caller_id) THEN
    RAISE EXCEPTION 'Access Denied: Organization owners cannot be removed by tenant administrators.'
      USING ERRCODE = '42501';
  END IF;

  -- Deactivate the membership row for this tenant only
  UPDATE public.organization_memberships
  SET is_active = false,
      updated_at = now()
  WHERE organization_id = p_org_id AND user_id = p_user_id;

  -- Log audit event
  INSERT INTO public.system_events (
    event_type,
    actor_id,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    'membership_deactivated',
    v_caller_id,
    'organization_memberships',
    p_user_id,
    jsonb_build_object(
      'organization_id', p_org_id,
      'user_id', p_user_id,
      'previous_role', v_target_role
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_tenant_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_tenant_member(uuid, uuid) TO authenticated, service_role;

-- 3. Tenant member activation RPC: reactivates membership in the specific tenant
CREATE OR REPLACE FUNCTION public.activate_tenant_member(
  p_org_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_authorized boolean := false;
  v_target_role membership_role;
BEGIN
  IF public.is_platform_operator(v_caller_id) THEN
    v_is_authorized := true;
  ELSIF public.is_tenant_people_admin(p_org_id) AND public.org_is_operational(p_org_id) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to manage members in this organization.'
      USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_target_role
  FROM public.organization_memberships
  WHERE organization_id = p_org_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.organization_memberships
  SET is_active = true,
      updated_at = now()
  WHERE organization_id = p_org_id AND user_id = p_user_id;

  INSERT INTO public.system_events (
    event_type,
    actor_id,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    'membership_activated',
    v_caller_id,
    'organization_memberships',
    p_user_id,
    jsonb_build_object(
      'organization_id', p_org_id,
      'user_id', p_user_id,
      'role', v_target_role
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_tenant_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_tenant_member(uuid, uuid) TO authenticated, service_role;

