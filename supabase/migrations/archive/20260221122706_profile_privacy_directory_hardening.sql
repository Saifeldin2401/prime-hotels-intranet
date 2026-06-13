-- Profile privacy, directory scope, and birthdays hardening for production

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone_extension text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS salary_grade text;

COMMENT ON COLUMN public.profiles.bio IS 'Public employee profile about section.';
COMMENT ON COLUMN public.profiles.phone_extension IS 'Public internal extension number.';
COMMENT ON COLUMN public.profiles.national_id IS 'Private national identifier. Visible only to HR/Admin.';
COMMENT ON COLUMN public.profiles.salary_grade IS 'Private compensation grade. Visible only to HR/Admin.';

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_ci ON public.profiles (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_profiles_hire_date ON public.profiles (hire_date);
CREATE INDEX IF NOT EXISTS idx_profiles_birthday_month_day
  ON public.profiles ((date_part('month', date_of_birth)), (date_part('day', date_of_birth)));

CREATE OR REPLACE FUNCTION public.is_hr_or_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = ANY (
        ARRAY[
          'corporate_admin'::public.app_role,
          'regional_admin'::public.app_role,
          'regional_hr'::public.app_role,
          'property_hr'::public.app_role
        ]
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_roles public.app_role[];
  v_property_ids uuid[];
  v_department_ids uuid[];
BEGIN
  IF v_uid IS NULL OR p_target_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(ur.role), ARRAY[]::public.app_role[])
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_uid;

  IF (
    'corporate_admin'::public.app_role = ANY(v_roles) OR
    'regional_admin'::public.app_role = ANY(v_roles) OR
    'regional_hr'::public.app_role = ANY(v_roles)
  ) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(up.property_id), ARRAY[]::uuid[])
  INTO v_property_ids
  FROM public.user_properties up
  WHERE up.user_id = v_uid;

  SELECT COALESCE(array_agg(ud.department_id), ARRAY[]::uuid[])
  INTO v_department_ids
  FROM public.user_departments ud
  WHERE ud.user_id = v_uid;

  IF 'department_head'::public.app_role = ANY(v_roles) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_departments ud
      WHERE ud.user_id = p_target_user_id
        AND ud.department_id = ANY(v_department_ids)
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_properties up
    WHERE up.user_id = p_target_user_id
      AND up.property_id = ANY(v_property_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_directory(
  p_search text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_role public.app_role DEFAULT NULL,
  p_management_level text DEFAULT 'all',
  p_sort text DEFAULT 'name_asc',
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  job_title text,
  work_email text,
  phone_extension text,
  bio text,
  joining_date date,
  is_active boolean,
  staff_id text,
  manager_id uuid,
  manager_name text,
  manager_title text,
  primary_property_id uuid,
  primary_property_name text,
  primary_department_id uuid,
  primary_department_name text,
  property_ids uuid[],
  property_names text[],
  department_ids uuid[],
  department_names text[],
  roles public.app_role[],
  management_level text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH scoped_profiles AS (
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.job_title,
    p.email,
    p.phone_extension,
    p.bio,
    p.hire_date,
    p.is_active,
    p.staff_id,
    p.reporting_to,
    p.updated_at
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
      array_agg(up.property_id ORDER BY pr.name NULLS LAST, up.property_id) AS property_ids,
      array_agg(COALESCE(pr.name, 'Unknown Property') ORDER BY pr.name NULLS LAST, up.property_id) AS property_names,
      (array_agg(up.property_id ORDER BY pr.name NULLS LAST, up.property_id))[1] AS primary_property_id,
      (array_agg(COALESCE(pr.name, 'Unknown Property') ORDER BY pr.name NULLS LAST, up.property_id))[1] AS primary_property_name
    FROM public.user_properties up
    LEFT JOIN public.properties pr ON pr.id = up.property_id
    WHERE up.user_id = sp.id
  ) prop ON true
  LEFT JOIN LATERAL (
    SELECT
      array_agg(ud.department_id ORDER BY d.name NULLS LAST, ud.department_id) AS department_ids,
      array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, ud.department_id) AS department_names,
      (array_agg(ud.department_id ORDER BY d.name NULLS LAST, ud.department_id))[1] AS primary_department_id,
      (array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, ud.department_id))[1] AS primary_department_name
    FROM public.user_departments ud
    LEFT JOIN public.departments d ON d.id = ud.department_id
    WHERE ud.user_id = sp.id
  ) dept ON true
  LEFT JOIN LATERAL (
    SELECT array_agg(ur.role ORDER BY ur.role) AS roles
    FROM public.user_roles ur
    WHERE ur.user_id = sp.id
  ) rl ON true
),
enriched AS (
  SELECT
    sd.id,
    sd.full_name,
    sd.avatar_url,
    sd.job_title,
    sd.email::text AS work_email,
    sd.phone_extension,
    sd.bio,
    sd.hire_date AS joining_date,
    sd.is_active,
    sd.staff_id,
    sd.reporting_to AS manager_id,
    mgr.full_name AS manager_name,
    mgr.job_title AS manager_title,
    sd.primary_property_id,
    sd.primary_property_name,
    sd.primary_department_id,
    sd.primary_department_name,
    sd.property_ids,
    sd.property_names,
    sd.department_ids,
    sd.department_names,
    sd.roles,
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
  e.id,
  e.full_name,
  e.avatar_url,
  e.job_title,
  e.work_email,
  e.phone_extension,
  e.bio, e.joining_date,
  e.is_active,
  e.staff_id,
  e.manager_id,
  e.manager_name,
  e.manager_title,
  e.primary_property_id,
  e.primary_property_name,
  e.primary_department_id,
  e.primary_department_name,
  e.property_ids,
  e.property_names,
  e.department_ids,
  e.department_names,
  e.roles,
  e.management_level,
  e.updated_at
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
$$;

CREATE OR REPLACE FUNCTION public.get_employee_public_profile(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  job_title text,
  work_email text,
  phone_extension text,
  bio text,
  joining_date date,
  is_active boolean,
  staff_id text,
  manager_id uuid,
  manager_name text,
  manager_title text,
  property_names text[],
  department_names text[],
  roles public.app_role[],
  skills text[],
  certifications text[],
  direct_reports jsonb,
  updated_at timestamptz,
  is_edited boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH base AS (
  SELECT d.*
  FROM public.get_employee_directory(
    p_search := NULL,
    p_property_id := NULL,
    p_department_id := NULL,
    p_role := NULL,
    p_management_level := 'all',
    p_sort := 'name_asc',
    p_include_inactive := true
  ) d
  WHERE d.id = p_profile_id
  LIMIT 1
),
skill_data AS (
  SELECT COALESCE(array_agg(s_name ORDER BY s_name), ARRAY[]::text[]) AS skills
  FROM (
    SELECT DISTINCT s.name AS s_name
    FROM public.user_skills us
    JOIN public.skills s ON s.id = us.skill_id
    WHERE us.user_id = p_profile_id
      AND COALESCE(us.verified, true) = true
  ) sub
),
cert_data AS (
  SELECT COALESCE(array_agg(c_title ORDER BY c_date DESC NULLS LAST), ARRAY[]::text[]) AS certifications
  FROM (
    SELECT DISTINCT ON (COALESCE(c.title, c.certificate_type, 'Certificate'))
      COALESCE(c.title, c.certificate_type, 'Certificate') AS c_title,
      COALESCE(c.completion_date, c.created_at) AS c_date
    FROM public.certificates c
    WHERE c.user_id = p_profile_id
      AND COALESCE(c.status, 'active') <> 'revoked'
    ORDER BY COALESCE(c.title, c.certificate_type, 'Certificate'), COALESCE(c.completion_date, c.created_at) DESC NULLS LAST
  ) sub
),
direct_report_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'job_title', p.job_title,
        'avatar_url', p.avatar_url
      )
      ORDER BY p.full_name
    ),
    '[]'::jsonb
  ) AS direct_reports
  FROM public.profiles p
  WHERE p.reporting_to = p_profile_id
    AND COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
)
SELECT
  b.id,
  b.full_name,
  b.avatar_url,
  b.job_title,
  b.work_email,
  b.phone_extension,
  b.bio,
  b.joining_date,
  b.is_active,
  b.staff_id,
  b.manager_id,
  b.manager_name,
  b.manager_title,
  b.property_names,
  b.department_names,
  b.roles,
  sd.skills,
  cd.certifications,
  dr.direct_reports,
  b.updated_at,
  (b.updated_at > (SELECT p.created_at FROM public.profiles p WHERE p.id = b.id)) AS is_edited
FROM base b
CROSS JOIN skill_data sd
CROSS JOIN cert_data cd
CROSS JOIN direct_report_data dr;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_private_profile(
  p_profile_id uuid,
  p_reason text DEFAULT 'profile_private_view'
)
RETURNS TABLE (
  date_of_birth date,
  employee_id text,
  emergency_contact_name text,
  emergency_contact_phone text,
  national_id text,
  salary_grade text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF v_uid <> p_profile_id AND NOT public.is_hr_or_admin(v_uid) THEN
    RAISE EXCEPTION 'Access denied to private profile data' USING ERRCODE = '42501';
  END IF;

  IF v_uid <> p_profile_id THEN
    PERFORM public.log_pii_access(
      p_profile_id,
      ARRAY[
        'date_of_birth',
        'staff_id',
        'emergency_contact_name',
        'emergency_contact_phone',
        'national_id',
        'salary_grade'
      ]::text[],
      p_reason
    );
  END IF;

  RETURN QUERY
  SELECT
    p.date_of_birth,
    p.staff_id AS employee_id,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.national_id,
    p.salary_grade
  FROM public.profiles p
  WHERE p.id = p_profile_id
    AND COALESCE(p.is_deleted, false) = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_todays_birthdays(p_property_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  job_title text,
  property_name text,
  birthday date,
  age integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.job_title,
  prop.name AS property_name,
  p.date_of_birth AS birthday,
  date_part('year', age(current_date, p.date_of_birth))::int AS age
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT pr.*
  FROM public.user_properties up
  JOIN public.properties pr ON pr.id = up.property_id
  WHERE up.user_id = p.id
  ORDER BY pr.name
  LIMIT 1
) prop ON true
WHERE COALESCE(p.is_deleted, false) = false
  AND p.is_active = true
  AND date_part('month', p.date_of_birth) = date_part('month', current_date)
  AND date_part('day', p.date_of_birth) = date_part('day', current_date)
  AND public.can_view_employee_public_profile(p.id)
  AND (
    p_property_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.user_properties up
      WHERE up.user_id = p.id
        AND up.property_id = p_property_id
    )
  )
ORDER BY p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.export_birthdays_for_month(
  p_month integer,
  p_year integer DEFAULT date_part('year', current_date)::int,
  p_property_id uuid DEFAULT NULL
)
RETURNS TABLE (
  full_name text,
  job_title text,
  hotel text,
  department text,
  birthday_date date,
  age integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_hr_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only HR/Admin roles can export birthday lists' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.full_name,
    p.job_title,
    prop.name AS hotel,
    dept.name AS department,
    p.date_of_birth AS birthday_date,
    date_part('year', age(make_date(p_year, p_month, 1), p.date_of_birth))::int AS age
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM public.user_properties up
    JOIN public.properties pr ON pr.id = up.property_id
    WHERE up.user_id = p.id
    ORDER BY pr.name
    LIMIT 1
  ) prop ON true
  LEFT JOIN LATERAL (
    SELECT d.*
    FROM public.user_departments ud
    JOIN public.departments d ON d.id = ud.department_id
    WHERE ud.user_id = p.id
    ORDER BY d.name
    LIMIT 1
  ) dept ON true
  WHERE COALESCE(p.is_deleted, false) = false
    AND p.is_active = true
    AND date_part('month', p.date_of_birth)::int = p_month
    AND public.can_view_employee_public_profile(p.id)
    AND (
      p_property_id IS NULL OR EXISTS (
        SELECT 1
        FROM public.user_properties up2
        WHERE up2.user_id = p.id
          AND up2.property_id = p_property_id
      )
    )
  ORDER BY date_part('day', p.date_of_birth), p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_hr_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_employee_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_directory(text, uuid, uuid, public.app_role, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_private_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_birthdays(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_birthdays_for_month(integer, integer, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';;
