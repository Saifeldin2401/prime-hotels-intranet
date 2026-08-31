-- Migration: 20260901240000_phase4_global_search_org_context.sql
-- Description: Phase 4 Global Search with full tenant, brand, hotel, and department context + assessments and question banks

CREATE OR REPLACE FUNCTION public.get_platform_global_search(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_platform boolean;
  v_results jsonb := '{
    "organizations":[],
    "hotels":[],
    "departments":[],
    "users":[],
    "master_sops":[],
    "master_courses":[],
    "tenant_sops":[],
    "tenant_courses":[],
    "assessments":[],
    "question_banks":[]
  }'::jsonb;
  v_orgs jsonb;
  v_hotels jsonb;
  v_depts jsonb;
  v_users jsonb;
  v_master_sops jsonb;
  v_master_courses jsonb;
  v_tenant_sops jsonb;
  v_tenant_courses jsonb;
  v_assessments jsonb;
  v_question_banks jsonb;
BEGIN
  SELECT public.is_platform_operator(v_caller_id) INTO v_is_platform;
  IF NOT COALESCE(v_is_platform, false) THEN
    -- Fallback for legacy compatibility
    SELECT public.is_platform_user(v_caller_id) INTO v_is_platform;
    IF NOT COALESCE(v_is_platform, false) THEN
      RAISE EXCEPTION 'Access Denied: Platform global search requires platform operator privileges.';
    END IF;
  END IF;

  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    RETURN v_results;
  END IF;

  -- 1. Organizations
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'lifecycle_status', o.lifecycle_status,
    'is_active', o.is_active,
    'hotel_count', (SELECT COUNT(*) FROM public.hotels h WHERE h.organization_id = o.id AND h.is_deleted = false)
  )), '[]'::jsonb)
  INTO v_orgs
  FROM public.organizations o
  WHERE (o.name ILIKE '%' || p_query || '%' OR o.slug ILIKE '%' || p_query || '%')
    AND o.is_deleted = false
  LIMIT 10;

  -- 2. Hotels (with Brand and Org context)
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', h.id,
    'name', h.name,
    'city', h.city,
    'organization_id', h.organization_id,
    'organization_name', o.name,
    'brand_id', h.brand_id,
    'brand_name', b.name
  )), '[]'::jsonb)
  INTO v_hotels
  FROM public.hotels h
  JOIN public.organizations o ON o.id = h.organization_id
  LEFT JOIN public.brands b ON b.id = h.brand_id
  WHERE (h.name ILIKE '%' || p_query || '%' OR h.city ILIKE '%' || p_query || '%')
    AND h.is_deleted = false
  LIMIT 10;

  -- 3. Departments (with Hotel and Org context)
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', d.id,
    'name', d.name,
    'hotel_id', d.hotel_id,
    'hotel_name', h.name,
    'organization_id', d.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_depts
  FROM public.departments d
  JOIN public.organizations o ON o.id = d.organization_id
  LEFT JOIN public.hotels h ON h.id = d.hotel_id
  WHERE d.name ILIKE '%' || p_query || '%'
    AND d.is_deleted = false
  LIMIT 10;

  -- 4. Users (with Org, Hotel, and Department context)
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'role', p.role,
    'organization_id', om.organization_id,
    'organization_name', o.name,
    'hotel_id', om.hotel_id,
    'hotel_name', h.name,
    'department_id', om.department_id,
    'department_name', dep.name
  )), '[]'::jsonb)
  INTO v_users
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT om1.organization_id, om1.hotel_id, om1.department_id
    FROM public.organization_memberships om1
    WHERE om1.user_id = p.id AND om1.is_deleted = false
    ORDER BY om1.created_at ASC
    LIMIT 1
  ) om ON true
  LEFT JOIN public.organizations o ON o.id = om.organization_id
  LEFT JOIN public.hotels h ON h.id = om.hotel_id
  LEFT JOIN public.departments dep ON dep.id = om.department_id
  WHERE (p.full_name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 5. Master SOPs
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', doc.id,
    'title', doc.title,
    'document_number', doc.document_number,
    'category', doc.category,
    'version', doc.current_version
  )), '[]'::jsonb)
  INTO v_master_sops
  FROM public.documents doc
  WHERE doc.is_master_template = true
    AND doc.is_deleted = false
    AND (doc.title ILIKE '%' || p_query || '%' OR doc.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 6. Master Courses
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', tm.id,
    'title', tm.title,
    'category', tm.category,
    'difficulty_level', tm.difficulty_level
  )), '[]'::jsonb)
  INTO v_master_courses
  FROM public.training_modules tm
  WHERE tm.is_master_template = true
    AND tm.is_deleted = false
    AND (tm.title ILIKE '%' || p_query || '%' OR tm.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 7. Tenant SOPs
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', doc.id,
    'title', doc.title,
    'document_number', doc.document_number,
    'organization_id', doc.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_tenant_sops
  FROM public.documents doc
  JOIN public.organizations o ON o.id = doc.organization_id
  WHERE (doc.is_master_template = false OR doc.is_master_template IS NULL)
    AND doc.is_deleted = false
    AND (doc.title ILIKE '%' || p_query || '%' OR doc.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 8. Tenant Courses
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', tm.id,
    'title', tm.title,
    'category', tm.category,
    'organization_id', tm.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_tenant_courses
  FROM public.training_modules tm
  JOIN public.organizations o ON o.id = tm.organization_id
  WHERE (tm.is_master_template = false OR tm.is_master_template IS NULL)
    AND tm.is_deleted = false
    AND (tm.title ILIKE '%' || p_query || '%' OR tm.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 9. Assessments
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', a.id,
    'title', a.title,
    'passing_score', a.passing_score,
    'organization_id', a.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_assessments
  FROM public.assessments a
  LEFT JOIN public.organizations o ON o.id = a.organization_id
  WHERE a.is_deleted = false
    AND (a.title ILIKE '%' || p_query || '%' OR a.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  -- 10. Question Banks
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'id', qb.id,
    'name', qb.name,
    'organization_id', qb.organization_id,
    'organization_name', o.name
  )), '[]'::jsonb)
  INTO v_question_banks
  FROM public.question_banks qb
  LEFT JOIN public.organizations o ON o.id = qb.organization_id
  WHERE (qb.name ILIKE '%' || p_query || '%' OR qb.description ILIKE '%' || p_query || '%')
  LIMIT 10;

  RETURN JSONB_BUILD_OBJECT(
    'organizations', v_orgs,
    'hotels', v_hotels,
    'departments', v_depts,
    'users', v_users,
    'master_sops', v_master_sops,
    'master_courses', v_master_courses,
    'tenant_sops', v_tenant_sops,
    'tenant_courses', v_tenant_courses,
    'assessments', v_assessments,
    'question_banks', v_question_banks
  );
END;
$function$;
