-- Hotfixes (applied to live 2026-08-31):
-- 1. Re-grant get_ai_agent_policies() to authenticated — Phase 14b over-revoked it and the
--    AI agent-policy service reads it on load (read-only routing config, frontend role-gated).
GRANT EXECUTE ON FUNCTION public.get_ai_agent_policies() TO authenticated;

-- 2. get_platform_user_directory referenced organization_memberships.is_deleted (no such
--    column — it's is_active) and user_roles.created_at (no such column) -> hard 42703 crash
--    on the Platform User Directory page. Corrected + aligned is_platform_user to super_admin.
CREATE OR REPLACE FUNCTION public.get_platform_user_directory(p_search text DEFAULT NULL::text, p_org_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, email text, full_name text, avatar_url text, is_active boolean, is_platform_user boolean, platform_role text, primary_organization_id uuid, primary_organization_name text, membership_count bigint, memberships jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_caller_id uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_user(v_caller_id) THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators can query the global user directory.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH user_memberships AS (
    SELECT om.user_id, om.organization_id, o.name AS org_name, om.role::text AS role,
           om.hotel_id, h.name AS hotel_name, om.department_id, d.name AS dept_name, om.is_active AS member_active
    FROM public.organization_memberships om
    LEFT JOIN public.organizations o ON o.id = om.organization_id
    LEFT JOIN public.hotels h ON h.id = om.hotel_id
    LEFT JOIN public.departments d ON d.id = om.department_id
  ),
  aggregated_memberships AS (
    SELECT um.user_id, COUNT(um.organization_id) AS m_count,
      (ARRAY_AGG(um.organization_id))[1] AS first_org_id, (ARRAY_AGG(um.org_name))[1] AS first_org_name,
      JSONB_AGG(JSONB_BUILD_OBJECT('organization_id', um.organization_id, 'organization_name', um.org_name,
        'role', um.role, 'hotel_id', um.hotel_id, 'hotel_name', um.hotel_name, 'department_id', um.department_id,
        'department_name', um.dept_name, 'is_active', um.member_active)) AS memberships_json
    FROM user_memberships um GROUP BY um.user_id
  )
  SELECT p.id, p.email::text, p.full_name::text, p.avatar_url::text,
    COALESCE(p.is_active, true),
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'super_admin'),
    (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1),
    am.first_org_id, am.first_org_name, COALESCE(am.m_count, 0), COALESCE(am.memberships_json, '[]'::jsonb), p.created_at
  FROM public.profiles p
  LEFT JOIN aggregated_memberships am ON am.user_id = p.id
  WHERE (p_search IS NULL OR p.full_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%')
    AND (p_org_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_memberships om2 WHERE om2.user_id = p.id AND om2.organization_id = p_org_id))
    AND (p_role IS NULL
         OR EXISTS (SELECT 1 FROM public.organization_memberships om3 WHERE om3.user_id = p.id AND om3.role::text = p_role)
         OR EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = p.id AND ur2.role::text = p_role))
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
