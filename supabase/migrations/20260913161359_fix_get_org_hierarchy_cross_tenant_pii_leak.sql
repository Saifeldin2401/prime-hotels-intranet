
-- CRITICAL: get_org_hierarchy had NO authorization check at all. It is SECURITY DEFINER
-- (bypasses RLS) and was executable by the `anon` role (Postgres grants EXECUTE on new
-- functions to PUBLIC by default; the migration that last touched this function only
-- GRANTed to authenticated/service_role and never REVOKEd from PUBLIC, so anon kept it).
-- The query itself had zero organization/tenant scoping -- it walked `profiles` filtered
-- only by is_active, joined organization_memberships with a LEFT JOIN used solely for the
-- optional hotel filter. Net effect: any unauthenticated caller could hit
-- /rest/v1/rpc/get_org_hierarchy and dump full_name + email + job_title + manager chain
-- for every active employee across every tenant on the platform.
--
-- Fix: require authentication, and scope both the base case and the recursive step to
-- organizations the caller actually belongs to (via current_user_organization_ids()),
-- switching the membership join from LEFT to INNER so it also acts as the access filter.
CREATE OR REPLACE FUNCTION public.get_org_hierarchy(p_root_user_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text, reporting_to uuid, manager_name text, depth integer, path uuid[], path_names text[])
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_org_ids uuid[];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  v_org_ids := public.current_user_organization_ids();

  IF v_org_ids IS NULL OR array_length(v_org_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Access denied: no active organization membership.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      NULL::TEXT as manager_name,
      0 as depth,
      ARRAY[p.id] as path,
      ARRAY[p.full_name] as path_names
    FROM profiles p
    JOIN organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE p.is_active = true
      AND om.organization_id = ANY(v_org_ids)
      AND (
        CASE
          WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id
          ELSE p.reporting_to IS NULL
        END
      )
      AND (p_property_id IS NULL OR om.hotel_id = p_property_id)

    UNION ALL

    SELECT
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      h.full_name as manager_name,
      h.depth + 1,
      h.path || p.id,
      h.path_names || p.full_name
    FROM profiles p
    JOIN organization_memberships om2 ON om2.user_id = p.id AND om2.is_active = true
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND om2.organization_id = ANY(v_org_ids)
      AND NOT p.id = ANY(h.path)
      AND h.depth < 20
  )
  SELECT DISTINCT ON (hierarchy.id)
    hierarchy.id,
    hierarchy.full_name,
    hierarchy.job_title,
    hierarchy.email,
    hierarchy.reporting_to,
    hierarchy.manager_name,
    hierarchy.depth,
    hierarchy.path,
    hierarchy.path_names
  FROM hierarchy
  ORDER BY hierarchy.id, hierarchy.depth;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) TO service_role;
