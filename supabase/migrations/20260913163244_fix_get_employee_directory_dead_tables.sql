
CREATE OR REPLACE FUNCTION public.get_employee_directory(p_search text DEFAULT NULL::text, p_property_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_role app_role DEFAULT NULL::app_role, p_management_level text DEFAULT 'all'::text, p_sort text DEFAULT 'name_asc'::text, p_include_inactive boolean DEFAULT false)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text, bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text, manager_title text, primary_property_id uuid, primary_property_name text, primary_department_id uuid, primary_department_name text, property_ids uuid[], property_names text[], department_ids uuid[], department_names text[], roles app_role[], management_level text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH scoped_profiles AS (
  SELECT
    p.id, p.full_name, p.avatar_url, p.job_title, p.email, p.phone_extension, p.bio,
    p.hire_date, p.is_active, p.staff_id, p.reporting_to, p.updated_at
  FROM public.profiles p
  WHERE COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
    AND (p_include_inactive OR p.is_active = true)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      COALESCE(p.job_title, '') ILIKE '%' || p_search || '%' OR
      COALESCE(p.staff_id, '') ILIKE '%' || p_search || '%'
    )
),
scope_data AS (
  SELECT
    sp.*,
    COALESCE(prop.property_ids, ARRAY[]::uuid[]) AS property_ids,
    COALESCE(prop.property_names, ARRAY[]::text[]) AS property_names,
    prop.primary_property_id,
    prop.primary_property_name,
    COALESCE(dept.department_ids, ARRAY[]::uuid[]) AS department_ids,
    COALESCE(dept.department_names, ARRAY[]::text[]) AS department_names,
    dept.primary_department_id,
    dept.primary_department_name,
    COALESCE(rl.roles, ARRAY[]::public.app_role[]) AS roles
  FROM scoped_profiles sp
  LEFT JOIN LATERAL (
    SELECT
      array_agg(om.hotel_id ORDER BY h.name NULLS LAST, om.hotel_id) AS property_ids,
      array_agg(COALESCE(h.name, 'Unknown Property') ORDER BY h.name NULLS LAST, om.hotel_id) AS property_names,
      (array_agg(om.hotel_id ORDER BY h.name NULLS LAST, om.hotel_id))[1] AS primary_property_id,
      (array_agg(COALESCE(h.name, 'Unknown Property') ORDER BY h.name NULLS LAST, om.hotel_id))[1] AS primary_property_name
    FROM public.organization_memberships om
    LEFT JOIN public.hotels h ON h.id = om.hotel_id
    WHERE om.user_id = sp.id AND om.is_active = true AND om.hotel_id IS NOT NULL
  ) prop ON true
  LEFT JOIN LATERAL (
    SELECT
      array_agg(om.department_id ORDER BY d.name NULLS LAST, om.department_id) AS department_ids,
      array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, om.department_id) AS department_names,
      (array_agg(om.department_id ORDER BY d.name NULLS LAST, om.department_id))[1] AS primary_department_id,
      (array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, om.department_id))[1] AS primary_department_name
    FROM public.organization_memberships om
    LEFT JOIN public.departments d ON d.id = om.department_id
    WHERE om.user_id = sp.id AND om.is_active = true AND om.department_id IS NOT NULL
  ) dept ON true
  LEFT JOIN LATERAL (
    SELECT array_agg(ur.role ORDER BY ur.role) AS roles
    FROM public.user_roles ur
    WHERE ur.user_id = sp.id
  ) rl ON true
),
enriched AS (
  SELECT
    sd.id, sd.full_name, sd.avatar_url, sd.job_title, sd.email::text AS work_email,
    sd.phone_extension, sd.bio, sd.hire_date AS joining_date, sd.is_active, sd.staff_id,
    sd.reporting_to AS manager_id, mgr.full_name AS manager_name, mgr.job_title AS manager_title,
    sd.primary_property_id, sd.primary_property_name, sd.primary_department_id, sd.primary_department_name,
    sd.property_ids, sd.property_names, sd.department_ids, sd.department_names, sd.roles,
    CASE
      WHEN (
        'corporate_admin'::public.app_role = ANY(sd.roles) OR
        'regional_admin'::public.app_role = ANY(sd.roles) OR
        'regional_hr'::public.app_role = ANY(sd.roles)
      ) THEN 'executive'
      WHEN (
        'property_manager'::public.app_role = ANY(sd.roles) OR
        'property_hr'::public.app_role = ANY(sd.roles) OR
        'department_head'::public.app_role = ANY(sd.roles) OR
        'manager'::public.app_role = ANY(sd.roles)
      ) THEN 'management'
      ELSE 'staff'
    END AS management_level,
    sd.updated_at
  FROM scope_data sd
  LEFT JOIN public.profiles mgr ON mgr.id = sd.reporting_to
)
SELECT
  e.id, e.full_name, e.avatar_url, e.job_title, e.work_email, e.phone_extension,
  e.bio, e.joining_date, e.is_active, e.staff_id, e.manager_id, e.manager_name, e.manager_title,
  e.primary_property_id, e.primary_property_name, e.primary_department_id, e.primary_department_name,
  e.property_ids, e.property_names, e.department_ids, e.department_names, e.roles, e.management_level, e.updated_at
FROM enriched e
WHERE (p_property_id IS NULL OR p_property_id = ANY(e.property_ids))
  AND (p_department_id IS NULL OR p_department_id = ANY(e.department_ids))
  AND (p_role IS NULL OR p_role = ANY(e.roles))
  AND (
    p_management_level IS NULL OR lower(p_management_level) = 'all' OR
    lower(p_management_level) = lower(e.management_level)
  )
ORDER BY
  CASE WHEN p_sort = 'name_desc' THEN e.full_name END DESC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_asc' THEN e.joining_date END ASC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_desc' THEN e.joining_date END DESC NULLS LAST,
  CASE WHEN p_sort = 'name_asc' OR p_sort IS NULL THEN e.full_name END ASC NULLS LAST,
  e.full_name ASC;
$function$;
