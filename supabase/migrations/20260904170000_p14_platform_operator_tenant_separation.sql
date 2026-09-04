-- ============================================================================
-- Migration: 20260904170000_p14_platform_operator_tenant_separation.sql
-- Description: Updates resolve_account_context() so platform operators have
--              NULL primary_organization_id unless actively running a
--              break-glass session (platform_access_sessions).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_account_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_operator boolean;
  v_roles text[];
  v_perms text[];
  v_session jsonb;
  v_memberships jsonb;
  v_primary_org uuid;
  v_member_count int;
  v_operational_count int;
  v_dest text;
  v_top_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('is_platform_operator', false, 'recommended_destination', '/login');
  END IF;
  v_is_operator := public.is_platform_operator(v_uid);

  SELECT array_agg(DISTINCT pra.platform_role::text) INTO v_roles
  FROM public.platform_users pu
  JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id
  WHERE pu.user_id = v_uid AND pu.is_active AND pra.revoked_at IS NULL;

  SELECT array_agg(p) INTO v_perms
  FROM (SELECT unnest(ARRAY['operator.manage','tenant.manage','billing.manage','master_content.manage',
                            'ops.manage','config.manage','tenant.enter','tenant.read']) AS p) cand
  WHERE public.platform_operator_can(cand.p, v_uid);

  SELECT to_jsonb(s) INTO v_session FROM (
    SELECT pas.id, pas.target_organization_id, pas.acting_role, pas.access_reason,
           pas.started_at, pas.expires_at, o.name AS target_organization_name
    FROM public.platform_access_sessions pas
    JOIN public.organizations o ON o.id = pas.target_organization_id
    WHERE pas.admin_user_id = v_uid AND pas.is_active = true
      AND (pas.ended_at IS NULL OR pas.ended_at > now()) AND pas.expires_at > now()
    ORDER BY pas.started_at DESC LIMIT 1
  ) s;

  SELECT jsonb_agg(jsonb_build_object(
           'organization_id', om.organization_id, 'organization_name', o.name, 'role', om.role::text,
           'brand_id', om.brand_id, 'hotel_id', om.hotel_id, 'hotel_name', h.name,
           'department_id', om.department_id, 'department_name', d.name, 'is_active', om.is_active,
           'lifecycle_status', o.lifecycle_status,
           'operational', public.org_is_operational(om.organization_id)
         ) ORDER BY om.is_primary DESC, o.name),
         count(*),
         count(*) FILTER (WHERE public.org_is_operational(om.organization_id)),
         (array_agg(om.organization_id ORDER BY om.is_primary DESC, o.name))[1]
    INTO v_memberships, v_member_count, v_operational_count, v_primary_org
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  LEFT JOIN public.hotels h ON h.id = om.hotel_id
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.user_id = v_uid AND om.is_active = true;

  SELECT om.role::text INTO v_top_role
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_uid AND om.is_active = true AND public.org_is_operational(om.organization_id)
  ORDER BY CASE om.role::text
    WHEN 'organization_owner' THEN 0 WHEN 'organization_admin' THEN 1 WHEN 'brand_admin' THEN 2
    WHEN 'hotel_admin' THEN 3 WHEN 'department_manager' THEN 4 WHEN 'training_manager' THEN 5
    WHEN 'instructor' THEN 6 WHEN 'knowledge_manager' THEN 7 WHEN 'author' THEN 8 ELSE 9 END
  LIMIT 1;

  IF v_is_operator THEN
    v_dest := '/platform';
    -- A platform operator operates on the global plane; primary_organization_id is null
    -- unless an active break-glass impersonation session is underway.
    IF v_session IS NOT NULL THEN
      v_primary_org := (v_session->>'target_organization_id')::uuid;
    ELSE
      v_primary_org := NULL;
    END IF;
  ELSIF v_member_count > 0 AND v_operational_count = 0 THEN
    v_dest := '/suspended';
  ELSIF v_top_role IN ('organization_owner','organization_admin','brand_admin','hotel_admin') THEN
    v_dest := '/admin';
  ELSIF v_top_role IN ('training_manager','instructor') THEN
    v_dest := '/training';
  ELSIF v_top_role IN ('knowledge_manager','author') THEN
    v_dest := '/knowledge';
  ELSE
    v_dest := '/home/learner';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_uid,
    'is_platform_operator', v_is_operator,
    'platform_roles', COALESCE(to_jsonb(v_roles), '[]'::jsonb),
    'platform_permissions', COALESCE(to_jsonb(v_perms), '[]'::jsonb),
    'active_platform_session', v_session,
    'tenant_memberships', COALESCE(v_memberships, '[]'::jsonb),
    'primary_organization_id', v_primary_org,
    'is_multi_org', COALESCE(v_member_count, 0) > 1,
    'all_orgs_suspended', (COALESCE(v_member_count,0) > 0 AND COALESCE(v_operational_count,0) = 0),
    'recommended_destination', v_dest
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_account_context() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_account_context() TO authenticated;
