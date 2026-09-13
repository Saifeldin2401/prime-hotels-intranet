-- Migration: 20260913190000_fix_get_org_hierarchy_multi_tenant.sql
-- Description: Fix get_org_hierarchy to reference organization_memberships (hotel_id) instead of dropped user_properties table.

CREATE OR REPLACE FUNCTION public.get_org_hierarchy(p_root_user_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text, reporting_to uuid, manager_name text, depth integer, path uuid[], path_names text[])
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Base case: top-level employees (no manager) or specific root
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
    LEFT JOIN organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE p.is_active = true
      AND (
        CASE 
          WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id
          ELSE p.reporting_to IS NULL
        END
      )
      AND (p_property_id IS NULL OR om.hotel_id = p_property_id)
    
    UNION ALL
    
    -- Recursive case: employees who report to someone in the hierarchy
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
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND NOT p.id = ANY(h.path)  -- Prevent cycles
      AND h.depth < 20  -- Max depth safety
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

GRANT EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_hierarchy(uuid, uuid) TO service_role;
