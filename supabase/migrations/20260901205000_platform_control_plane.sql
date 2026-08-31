-- ============================================================================
-- Migration: 20260901205000_platform_control_plane.sql
-- Description: Platform Control Center, Global User Management, Operations Queue,
--              Security Events, and Global Search RPCs with strict authorization.
-- ============================================================================

-- 1. Ensure is_platform_user has DEFAULT auth.uid() and recognizes platform roles
CREATE OR REPLACE FUNCTION public.is_platform_user(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'administrator')
  );
$$;

-- 2. Platform User Directory RPC (Strictly Platform Operator Only)
CREATE OR REPLACE FUNCTION public.get_platform_user_directory(
  p_search text DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  is_active boolean,
  is_platform_user boolean,
  platform_role text,
  primary_organization_id uuid,
  primary_organization_name text,
  membership_count bigint,
  memberships jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_platform boolean;
BEGIN
  -- Strict Authorization: Caller must be a platform admin
  SELECT public.is_platform_user(v_caller_id) INTO v_is_platform;
  IF NOT v_is_platform THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators can query the global user directory.';
  END IF;

  RETURN QUERY
  WITH user_memberships AS (
    SELECT 
      om.user_id,
      om.organization_id,
      o.name AS org_name,
      om.role::text AS role,
      om.hotel_id,
      h.name AS hotel_name,
      om.department_id,
      d.name AS dept_name,
      om.is_active AS member_active
    FROM public.organization_memberships om
    LEFT JOIN public.organizations o ON o.id = om.organization_id
    LEFT JOIN public.hotels h ON h.id = om.hotel_id
    LEFT JOIN public.departments d ON d.id = om.department_id
    WHERE om.is_deleted = false
  ),
  aggregated_memberships AS (
    SELECT 
      um.user_id,
      COUNT(um.organization_id) AS m_count,
      (ARRAY_AGG(um.organization_id))[1] AS first_org_id,
      (ARRAY_AGG(um.org_name))[1] AS first_org_name,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'organization_id', um.organization_id,
          'organization_name', um.org_name,
          'role', um.role,
          'hotel_id', um.hotel_id,
          'hotel_name', um.hotel_name,
          'department_id', um.department_id,
          'department_name', um.dept_name,
          'is_active', um.member_active
        )
      ) AS memberships_json
    FROM user_memberships um
    GROUP BY um.user_id
  )
  SELECT 
    p.id,
    p.email::text,
    p.full_name::text,
    p.avatar_url::text,
    COALESCE(p.is_active, true) AS is_active,
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.id 
        AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'administrator')
    ) AS is_platform_user,
    (
      SELECT ur.role::text FROM public.user_roles ur 
      WHERE ur.user_id = p.id 
      ORDER BY ur.created_at ASC LIMIT 1
    ) AS platform_role,
    am.first_org_id AS primary_organization_id,
    am.first_org_name AS primary_organization_name,
    COALESCE(am.m_count, 0) AS membership_count,
    COALESCE(am.memberships_json, '[]'::jsonb) AS memberships,
    p.created_at
  FROM public.profiles p
  LEFT JOIN aggregated_memberships am ON am.user_id = p.id
  WHERE 
    (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    AND (p_org_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_memberships om2 
      WHERE om2.user_id = p.id AND om2.organization_id = p_org_id AND om2.is_deleted = false
    ))
    AND (p_role IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_memberships om3 
      WHERE om3.user_id = p.id AND om3.role::text = p_role AND om3.is_deleted = false
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles ur2 
      WHERE ur2.user_id = p.id AND ur2.role::text = p_role
    ))
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. Platform Global Search RPC (Organizations, Hotels, Users, Master SOPs, Master Courses)
CREATE OR REPLACE FUNCTION public.get_platform_global_search(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_platform boolean;
  v_results jsonb := '{"organizations":[], "hotels":[], "users":[], "master_sops":[], "master_courses":[]}'::jsonb;
  v_orgs jsonb;
  v_hotels jsonb;
  v_users jsonb;
  v_sops jsonb;
  v_courses jsonb;
BEGIN
  SELECT public.is_platform_user(v_caller_id) INTO v_is_platform;
  IF NOT v_is_platform THEN
    RAISE EXCEPTION 'Access Denied: Platform global search requires platform operator privileges.';
  END IF;

  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    RETURN v_results;
  END IF;

  -- 1. Organizations
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'is_active', o.is_active,
    'hotel_count', (SELECT COUNT(*) FROM public.hotels h WHERE h.organization_id = o.id AND h.is_deleted = false)
  )), '[]'::jsonb)
  INTO v_orgs
  FROM public.organizations o
  WHERE (o.name ILIKE '%' || p_query || '%' OR o.slug ILIKE '%' || p_query || '%')
    AND o.is_deleted = false
  LIMIT 10;

  -- 2. Hotels
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', h.id,
    'name', h.name,
    'city', h.city,
    'organization_id', h.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_hotels
  FROM public.hotels h
  JOIN public.organizations o ON o.id = h.organization_id
  WHERE (h.name ILIKE '%' || p_query || '%' OR h.city ILIKE '%' || p_query || '%')
    AND h.is_deleted = false
  LIMIT 10;

  -- 3. Users
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'primary_org', (SELECT o2.name FROM public.organization_memberships om JOIN public.organizations o2 ON o2.id = om.organization_id WHERE om.user_id = p.id AND om.is_deleted = false LIMIT 1)
  )), '[]'::jsonb)
  INTO v_users
  FROM public.profiles p
  WHERE (p.full_name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 4. Master SOPs
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', d.id,
    'title', d.title,
    'category', d.category,
    'version', d.version
  )), '[]'::jsonb)
  INTO v_sops
  FROM public.documents d
  WHERE d.is_master_template = true
    AND d.is_deleted = false
    AND (d.title ILIKE '%' || p_query || '%' OR d.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 5. Master Courses
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', tm.id,
    'title', tm.title,
    'category', tm.category,
    'difficulty_level', tm.difficulty_level
  )), '[]'::jsonb)
  INTO v_courses
  FROM public.training_modules tm
  WHERE tm.is_master_template = true
    AND tm.is_deleted = false
    AND (tm.title ILIKE '%' || p_query || '%' OR tm.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  RETURN JSONB_BUILD_OBJECT(
    'organizations', v_orgs,
    'hotels', v_hotels,
    'users', v_users,
    'master_sops', v_sops,
    'master_courses', v_courses
  );
END;
$$;

-- 4. Platform Operations & Background Jobs Summary RPC
CREATE OR REPLACE FUNCTION public.get_platform_operations_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_platform boolean;
  v_active_jobs bigint := 0;
  v_completed_jobs bigint := 0;
  v_failed_jobs bigint := 0;
  v_total_jobs bigint := 0;
  v_recent_jobs jsonb;
BEGIN
  SELECT public.is_platform_user(v_caller_id) INTO v_is_platform;
  IF NOT v_is_platform THEN
    RAISE EXCEPTION 'Access Denied: Platform operations summary requires platform privileges.';
  END IF;

  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'in_progress', 'queued')),
    COUNT(*) FILTER (WHERE status IN ('completed', 'success')),
    COUNT(*) FILTER (WHERE status IN ('failed', 'error')),
    COUNT(*)
  INTO v_active_jobs, v_completed_jobs, v_failed_jobs, v_total_jobs
  FROM public.course_generation_jobs;

  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', j.id,
    'mode', j.mode,
    'status', j.status,
    'created_at', j.created_at,
    'updated_at', j.updated_at,
    'duration_ms', j.duration_ms,
    'error_message', j.error_message,
    'models_used', j.models_used
  ) ORDER BY j.created_at DESC), '[]'::jsonb)
  INTO v_recent_jobs
  FROM (
    SELECT * FROM public.course_generation_jobs
    ORDER BY created_at DESC
    LIMIT 25
  ) j;

  RETURN JSONB_BUILD_OBJECT(
    'active_jobs', v_active_jobs,
    'completed_jobs', v_completed_jobs,
    'failed_jobs', v_failed_jobs,
    'total_jobs', v_total_jobs,
    'recent_jobs', v_recent_jobs
  );
END;
$$;

-- 5. Retry Failed Job RPC
CREATE OR REPLACE FUNCTION public.retry_failed_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_platform boolean;
BEGIN
  SELECT public.is_platform_user(v_caller_id) INTO v_is_platform;
  IF NOT v_is_platform THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators can retry system jobs.';
  END IF;

  UPDATE public.course_generation_jobs
  SET status = 'pending',
      error_message = NULL,
      updated_at = NOW()
  WHERE id = p_job_id;

  -- Audit action
  INSERT INTO public.platform_audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_caller_id,
    'retry_background_job',
    'course_generation_job',
    p_job_id::text,
    jsonb_build_object('retried_at', NOW())
  );

  RETURN true;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_platform_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_user_directory(text, uuid, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_global_search(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_operations_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_job(uuid) TO authenticated;
