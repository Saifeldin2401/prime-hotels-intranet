-- =============================================================================
-- Follow-up to 20260926120000_remove_hotels.
--
-- Review of the applied migration found:
--   * create_scoped_training_assignment lost two guards in its rewrite: the
--     course must belong to the target organization (otherwise a tenant can
--     assign another tenant's course) and must be published.
--   * search_knowledge_articles was rewritten to return whole rows without
--     total_count; knowledgeService reads (id, rank, total_count), so search
--     totals/pagination were always 0. Restored the lean ranked-id shape.
--   * ten RPCs still took an ignored hotel/property parameter or returned
--     always-null hotel columns; platform_set_membership still accepted the
--     retired hotel_admin role.
-- All callers in the app and edge functions already omit the hotel arguments.
-- =============================================================================

BEGIN;

-- hotel_admin stays an enum label (Postgres cannot drop one) but may not be used.
ALTER TABLE public.organization_memberships
  DROP CONSTRAINT IF EXISTS organization_memberships_role_not_hotel_admin;
ALTER TABLE public.organization_memberships
  ADD CONSTRAINT organization_memberships_role_not_hotel_admin CHECK (role <> 'hotel_admin');

-- ---- search_knowledge_articles ----------------------------------------------
DROP FUNCTION IF EXISTS public.search_knowledge_articles(text, text, text, uuid, uuid, boolean, integer, integer);
CREATE FUNCTION public.search_knowledge_articles(
  p_query text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text,
  p_status text DEFAULT 'PUBLISHED'::text, p_department_id uuid DEFAULT NULL::uuid,
  p_requires_acknowledgment boolean DEFAULT NULL::boolean,
  p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, rank real, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT
        d.id,
        CASE WHEN p_query IS NOT NULL AND btrim(p_query) <> ''
            THEN ts_rank_cd(d.search_vector, websearch_to_tsquery('english', p_query), 32)
            ELSE 0
        END AS rank,
        count(*) OVER() AS total_count
    FROM public.documents d
    WHERE d.is_deleted = false
        AND d.is_archived = false
        AND (
          public.is_platform_super_admin()
          OR COALESCE(d.is_master_template, false) = true
          OR public.org_visible(d.organization_id)
        )
        AND (p_status IS NULL OR d.status::text = p_status)
        AND d.knowledge_base_status = 'indexed'
        AND d.is_active_kb_version = true
        AND (p_query IS NULL OR btrim(p_query) = '' OR d.search_vector @@ websearch_to_tsquery('english', p_query))
        AND (p_content_type IS NULL OR lower(d.content_type) = lower(p_content_type))
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_requires_acknowledgment IS NULL OR d.requires_acknowledgment = p_requires_acknowledgment)
    ORDER BY rank DESC, d.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
$function$;

-- ---- create_scoped_training_assignment --------------------------------------
DROP FUNCTION IF EXISTS public.create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, uuid, text, uuid[], timestamptz, text, text, boolean, boolean, integer[]);
CREATE FUNCTION public.create_scoped_training_assignment(p_course_id uuid, p_scope_type text, p_organization_id uuid, p_brand_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_target_role text DEFAULT NULL::text, p_target_user_ids uuid[] DEFAULT NULL::uuid[], p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_priority text DEFAULT 'normal'::text, p_instructions text DEFAULT NULL::text, p_requires_acknowledgement boolean DEFAULT false, p_notify_on_due boolean DEFAULT true, p_reminder_days_before integer[] DEFAULT '{7,3,1}'::integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_eligible_users uuid[];
  v_rule_id uuid;
  v_course_title text;
  v_module_org uuid;
  v_user_id uuid;
  v_effective_scope_type text := CASE WHEN p_scope_type IN ('hotel', 'property') THEN 'organization' ELSE p_scope_type END;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to assign training.';
  END IF;

  SELECT title, organization_id INTO v_course_title, v_module_org
    FROM public.courses WHERE id = p_course_id AND is_deleted IS NOT TRUE;
  IF v_course_title IS NULL THEN
    RAISE EXCEPTION 'Selected training module does not exist or has been deleted.';
  END IF;
  IF v_module_org IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Training module belongs to a different organization; deploy it to this organization first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND status = 'published') THEN
    RAISE EXCEPTION 'Only published courses can be assigned. Publish the course first.'
      USING ERRCODE = 'P0001', HINT = 'ASSIGN_COURSE_NOT_PUBLISHED';
  END IF;

  v_scopes := public.get_caller_assignment_scopes(p_organization_id);

  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE THEN
    IF (v_scopes->>'can_assign_role')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: you cannot assign training in this organization.';
    ELSIF v_effective_scope_type = 'organization' AND (v_scopes->>'can_assign_org')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at organization level.';
    ELSIF v_effective_scope_type = 'brand' AND (v_scopes->>'can_assign_brand')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at brand level.';
    ELSIF v_effective_scope_type = 'department' AND (v_scopes->>'can_assign_dept')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign at department level.';
    ELSIF v_effective_scope_type = 'individual' AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: not authorized to assign to individuals.';
    END IF;
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF v_scopes->'authorized_dept_ids' IS NOT NULL AND jsonb_typeof(v_scopes->'authorized_dept_ids') = 'array'
       AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF v_scopes->'authorized_brand_ids' IS NOT NULL AND jsonb_typeof(v_scopes->'authorized_brand_ids') = 'array'
       AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;

    IF v_effective_scope_type = 'brand' AND (v_auth_brands IS NULL OR NOT (p_brand_id = ANY(v_auth_brands))) THEN
      RAISE EXCEPTION 'Access denied: not authorized for this brand.';
    ELSIF v_effective_scope_type = 'department' AND (v_auth_depts IS NULL OR NOT (p_department_id = ANY(v_auth_depts))) THEN
      RAISE EXCEPTION 'Access denied: not authorized for this department.';
    END IF;
  END IF;

  IF v_effective_scope_type = 'individual' AND p_target_user_ids IS NOT NULL THEN
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true AND om.user_id = ANY(p_target_user_ids)
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))) INTO v_eligible_users;
  ELSE
    SELECT ARRAY(SELECT DISTINCT om.user_id FROM public.organization_memberships om
      WHERE om.organization_id = p_organization_id AND om.is_active = true
        AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
        AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
        AND (p_brand_id IS NULL OR om.brand_id = p_brand_id)
        AND (p_department_id IS NULL OR om.department_id = p_department_id)
        AND (p_target_role IS NULL OR p_target_role = 'all' OR om.role::text = p_target_role)) INTO v_eligible_users;
  END IF;

  IF array_length(v_eligible_users, 1) IS NULL OR array_length(v_eligible_users, 1) = 0 THEN
    RAISE EXCEPTION 'No eligible active learners found in the selected assignment scope.';
  END IF;

  INSERT INTO public.assignments (
    training_module_id, content_id, content_type, organization_id, brand_id, department_id,
    target_role, target_type, target_id, scope_type, scope_id, target_user_ids, recipient_count,
    due_date, priority, instructions, requires_acknowledgement, notify_on_due, reminder_days_before,
    assigned_by, created_by, is_active, status
  ) VALUES (
    p_course_id, p_course_id, 'module', p_organization_id, p_brand_id, p_department_id,
    p_target_role, v_effective_scope_type,
    COALESCE(p_department_id::text, p_brand_id::text, p_organization_id::text),
    v_effective_scope_type, COALESCE(p_department_id, p_brand_id, p_organization_id),
    v_eligible_users, array_length(v_eligible_users, 1), p_due_date, p_priority, p_instructions,
    p_requires_acknowledgement, p_notify_on_due, p_reminder_days_before, v_caller_id, v_caller_id, true, 'active'
  ) RETURNING id INTO v_rule_id;

  FOREACH v_user_id IN ARRAY v_eligible_users LOOP
    INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, lp_content_type, status, created_at, updated_at)
    VALUES (v_user_id, p_course_id, v_rule_id, p_organization_id, 'module', 'not_started'::training_status, now(), now())
    ON CONFLICT (user_id, training_id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, organization_id = EXCLUDED.organization_id, updated_at = now();

    INSERT INTO public.notifications (user_id, organization_id, title, message, type, link, created_at)
    VALUES (v_user_id, p_organization_id, 'New Training Assigned: ' || v_course_title,
      COALESCE(p_instructions, 'You have been assigned to complete "' || v_course_title || '".'),
      'training_assigned', '/learn/player/' || p_course_id, now());
  END LOOP;

  IF (v_scopes->>'is_platform_admin')::boolean IS TRUE THEN
    INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, target_organization_id, metadata)
    VALUES (v_caller_id, 'create_training_assignment', 'assignments', v_rule_id, p_organization_id,
      jsonb_build_object('course_id', p_course_id, 'course_title', v_course_title, 'scope_type', v_effective_scope_type,
                         'recipient_count', array_length(v_eligible_users, 1), 'due_date', p_due_date));
  END IF;

  RETURN jsonb_build_object('success', true, 'rule_id', v_rule_id, 'course_id', p_course_id,
                            'recipient_count', array_length(v_eligible_users, 1), 'scope_type', v_effective_scope_type);
END;
$function$;

-- ---- assignable learners / recipient count ----------------------------------
DROP FUNCTION IF EXISTS public.get_assignable_learners(uuid, uuid, uuid, uuid, text, text, integer, integer);
CREATE FUNCTION public.get_assignable_learners(p_org_id uuid, p_brand_id uuid DEFAULT NULL::uuid, p_dept_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, brand_id uuid, brand_name text, department_id uuid, department_name text, role text, job_title text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_search_pattern text := NULL;
BEGIN
  v_scopes := public.get_caller_assignment_scopes(p_org_id);

  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE
     AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
    RETURN;
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF jsonb_typeof(v_scopes->'authorized_dept_ids') = 'array' AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF jsonb_typeof(v_scopes->'authorized_brand_ids') = 'array' AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;
  END IF;

  IF p_search IS NOT NULL AND trim(p_search) <> '' THEN
    v_search_pattern := '%' || trim(p_search) || '%';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    COALESCE(p.full_name, 'Learner') AS full_name,
    p.email,
    p.avatar_url,
    b.id AS brand_id,
    b.name AS brand_name,
    d.id AS department_id,
    d.name AS department_name,
    om.role::text AS role,
    p.job_title
  FROM public.organization_memberships om
  JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.brands b ON b.id = om.brand_id
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.organization_id = p_org_id
    AND om.is_active = true
    AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
    AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
    AND (p_brand_id IS NULL OR om.brand_id = p_brand_id)
    AND (p_dept_id IS NULL OR om.department_id = p_dept_id)
    AND (p_role IS NULL OR p_role = 'all' OR om.role::text = p_role)
    AND (
      v_search_pattern IS NULL
      OR p.full_name ILIKE v_search_pattern
      OR p.email ILIKE v_search_pattern
      OR p.job_title ILIKE v_search_pattern
    )
  ORDER BY full_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_assignable_recipients_count(uuid, uuid, uuid, uuid, text, text, uuid[], text);
CREATE FUNCTION public.get_assignable_recipients_count(p_org_id uuid, p_brand_id uuid DEFAULT NULL::uuid, p_dept_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_individual_user_ids uuid[] DEFAULT NULL::uuid[], p_scope_type text DEFAULT 'organization'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scopes jsonb;
  v_can_org boolean;
  v_auth_depts uuid[];
  v_auth_brands uuid[];
  v_total_count integer := 0;
  v_dept_count integer := 0;
BEGIN
  v_scopes := public.get_caller_assignment_scopes(p_org_id);

  IF (v_scopes->>'is_platform_admin')::boolean IS NOT TRUE
     AND (v_scopes->>'can_assign_individual')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('recipient_count', 0, 'dept_count', 0);
  END IF;

  v_can_org := (v_scopes->>'can_assign_org')::boolean IS TRUE OR (v_scopes->>'is_platform_admin')::boolean IS TRUE;

  IF NOT v_can_org THEN
    IF jsonb_typeof(v_scopes->'authorized_dept_ids') = 'array' AND jsonb_array_length(v_scopes->'authorized_dept_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_dept_ids')::uuid) INTO v_auth_depts;
    END IF;
    IF jsonb_typeof(v_scopes->'authorized_brand_ids') = 'array' AND jsonb_array_length(v_scopes->'authorized_brand_ids') > 0 THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_scopes->'authorized_brand_ids')::uuid) INTO v_auth_brands;
    END IF;
  END IF;

  IF p_scope_type = 'individual' AND p_individual_user_ids IS NOT NULL THEN
    SELECT COUNT(DISTINCT om.user_id), COUNT(DISTINCT om.department_id)
      INTO v_total_count, v_dept_count
      FROM public.organization_memberships om
     WHERE om.organization_id = p_org_id
       AND om.is_active = true
       AND om.user_id = ANY(p_individual_user_ids)
       AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts));
  ELSE
    SELECT COUNT(DISTINCT om.user_id), COUNT(DISTINCT om.department_id)
      INTO v_total_count, v_dept_count
      FROM public.organization_memberships om
     WHERE om.organization_id = p_org_id
       AND om.is_active = true
       AND (v_can_org OR v_auth_depts IS NULL OR om.department_id = ANY(v_auth_depts))
       AND (v_can_org OR v_auth_brands IS NULL OR om.brand_id = ANY(v_auth_brands))
       AND (p_brand_id IS NULL OR om.brand_id = p_brand_id)
       AND (p_dept_id IS NULL OR om.department_id = p_dept_id)
       AND (p_role IS NULL OR p_role = 'all' OR om.role::text = p_role);
  END IF;

  RETURN jsonb_build_object(
    'recipient_count', COALESCE(v_total_count, 0),
    'dept_count', COALESCE(v_dept_count, 0)
  );
END;
$function$;

-- ---- search RPCs ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.secure_search_documents(text, uuid, uuid, text, text, uuid, text[], timestamptz, timestamptz, text, boolean, boolean, text, text, integer, integer);
CREATE FUNCTION public.secure_search_documents(p_search_query text, p_folder_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_visibility text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_file_type text[] DEFAULT NULL::text[], p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_confidentiality_level text DEFAULT NULL::text, p_include_deleted boolean DEFAULT false, p_include_archived boolean DEFAULT false, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, content text, file_url text, status text, visibility text, department_id uuid, folder_id uuid, file_type text, file_size bigint, file_extension text, confidentiality_level text, is_deleted boolean, is_archived boolean, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, view_count integer, download_count integer, content_type text, author jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_sort_column TEXT;
BEGIN
    v_sort_column := CASE WHEN p_sort_by IN ('created_at','updated_at','title','file_size','view_count') THEN p_sort_by ELSE 'created_at' END;
    v_is_admin := public.is_platform_super_admin();

    RETURN QUERY
    SELECT d.id, d.title, d.description, d.content, d.file_url, d.status::TEXT, d.visibility::TEXT,
           d.department_id, d.folder_id, d.file_type, d.file_size, d.file_extension,
           d.confidentiality_level::TEXT, d.is_deleted, d.is_archived, d.created_by, d.created_at,
           d.updated_at, d.expires_at, d.view_count, d.download_count, d.content_type,
           jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) AS author
    FROM documents d
    LEFT JOIN profiles p ON d.created_by = p.id
    WHERE
        (p_search_query IS NULL OR p_search_query = '' OR
            (d.title ILIKE '%'||p_search_query||'%' OR d.description ILIKE '%'||p_search_query||'%' OR d.content ILIKE '%'||p_search_query||'%'))
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        AND (v_is_admin OR COALESCE(d.is_master_template,false) OR public.org_visible(d.organization_id))
        AND (
            v_is_admin
            OR d.created_by = v_user_id
            OR d.owner_id = v_user_id
            OR (d.status = 'PUBLISHED' AND (
                    d.visibility = 'all_properties'
                    OR (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM organization_memberships om
                        WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
                    ))
                    OR (d.visibility = 'specific_departments' AND EXISTS (
                        SELECT 1 FROM organization_memberships om
                        JOIN document_department_access dda ON dda.department_id = om.department_id
                        WHERE om.user_id = v_user_id AND om.is_active = true AND dda.document_id = d.id
                    ))
                    OR (d.visibility = 'role' AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT))
               ))
        )
    ORDER BY
        CASE v_sort_column WHEN 'title' THEN d.title ELSE NULL END ASC NULLS LAST,
        CASE v_sort_column WHEN 'created_at' THEN d.created_at::TEXT WHEN 'updated_at' THEN d.updated_at::TEXT ELSE NULL END::TIMESTAMPTZ DESC NULLS LAST
    LIMIT LEAST(p_limit, 500) OFFSET GREATEST(p_offset, 0);
END;
$function$;

DROP FUNCTION IF EXISTS public.secure_search_users(text, uuid, uuid, text, boolean, integer);
CREATE FUNCTION public.secure_search_users(p_search_query text, p_department_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, email text, full_name text, phone text, job_title text, staff_id text, avatar_url text, is_active boolean, hire_date date, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_platform BOOLEAN;
    v_user_org_ids UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    v_is_platform := public.is_platform_super_admin();
    v_user_org_ids := public.current_user_organization_ids();

    RETURN QUERY
    SELECT DISTINCT
        p.id, p.email, p.full_name, p.phone, p.job_title, p.staff_id, p.avatar_url,
        p.is_active, p.hire_date, p.created_at
    FROM public.profiles p
    LEFT JOIN public.organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE
        (p_search_query IS NULL OR p_search_query = '' OR
            (p.full_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%' OR
             p.job_title ILIKE '%' || p_search_query || '%' OR
             p.staff_id ILIKE '%' || p_search_query || '%'))
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
        AND (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships om3
            WHERE om3.user_id = p.id AND om3.is_active = true AND om3.department_id = p_department_id
        ))
        AND (p_role IS NULL OR om.role::text = p_role OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p.id AND ur.role::TEXT = p_role
        ))
        AND (
            v_is_platform
            OR p.id = v_user_id
            OR (
                om.organization_id = ANY(v_user_org_ids)
                AND public.org_is_operational(om.organization_id)
            )
        )
    ORDER BY p.full_name ASC NULLS LAST
    LIMIT LEAST(p_limit, 200);
END;
$function$;

-- ---- org hierarchy, sidebar counts, memberships ----------------------------
DROP FUNCTION IF EXISTS public.get_org_hierarchy(uuid, uuid);
CREATE FUNCTION public.get_org_hierarchy(p_root_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text, reporting_to uuid, manager_name text, depth integer, path uuid[], path_names text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_org_ids uuid[];
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  IF public.is_platform_super_admin() THEN
    SELECT array_agg(DISTINCT om.organization_id) INTO v_org_ids
    FROM organization_memberships om
    WHERE om.is_active = true;
  ELSE
    SELECT array_agg(DISTINCT om.organization_id) INTO v_org_ids
    FROM organization_memberships om
    WHERE om.user_id = v_caller_id AND om.is_active = true;
  END IF;

  IF v_org_ids IS NULL OR array_length(v_org_ids, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT p.id, p.full_name, p.job_title, p.email, p.reporting_to,
           NULL::TEXT as manager_name, 0 as depth, ARRAY[p.id] as path, ARRAY[p.full_name] as path_names
    FROM profiles p
    JOIN organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE p.is_active = true
      AND om.organization_id = ANY(v_org_ids)
      AND (CASE WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id ELSE p.reporting_to IS NULL END)
    UNION ALL
    SELECT p.id, p.full_name, p.job_title, p.email, p.reporting_to,
           h.full_name as manager_name, h.depth + 1, h.path || p.id, h.path_names || p.full_name
    FROM profiles p
    JOIN organization_memberships om2 ON om2.user_id = p.id AND om2.is_active = true
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND om2.organization_id = ANY(v_org_ids)
      AND NOT p.id = ANY(h.path)
      AND h.depth < 20
  )
  SELECT DISTINCT ON (hierarchy.id)
    hierarchy.id, hierarchy.full_name, hierarchy.job_title, hierarchy.email, hierarchy.reporting_to,
    hierarchy.manager_name, hierarchy.depth, hierarchy.path, hierarchy.path_names
  FROM hierarchy
  ORDER BY hierarchy.id, hierarchy.depth;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_sidebar_counts(uuid, text, uuid[], uuid[], uuid);
CREATE FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text DEFAULT NULL::text, p_department_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_caller uuid := (SELECT auth.uid());
    v_unread_notifications integer := 0;
    v_pending_training integer := 0;
BEGIN
    IF v_caller IS NULL THEN
        RETURN json_build_object('unreadNotifications', 0, 'pendingApprovals', 0, 'overdueTasks', 0,
                                 'unreadMessages', 0, 'pendingTraining', 0, 'activeGoals', 0);
    END IF;

    IF p_user_id IS DISTINCT FROM v_caller AND NOT public.is_hr_or_admin(v_caller) THEN
        RAISE EXCEPTION 'Unauthorized: can only view your own sidebar counts';
    END IF;

    BEGIN
        SELECT count(*)::integer INTO v_unread_notifications
        FROM notifications
        WHERE user_id = p_user_id AND read_at IS NULL;
    EXCEPTION WHEN OTHERS THEN
        v_unread_notifications := 0;
    END;

    BEGIN
        SELECT count(*)::integer INTO v_pending_training
        FROM training_progress tp
        WHERE tp.user_id = p_user_id
          AND (tp.status IS NULL OR tp.status NOT IN ('completed', 'passed'));
    EXCEPTION WHEN OTHERS THEN
        v_pending_training := 0;
    END;

    RETURN json_build_object(
        'unreadNotifications', COALESCE(v_unread_notifications, 0),
        'pendingApprovals', 0,
        'overdueTasks', 0,
        'unreadMessages', 0,
        'pendingTraining', COALESCE(v_pending_training, 0),
        'activeGoals', 0
    );
END;
$function$;

DROP FUNCTION IF EXISTS public.platform_set_membership(uuid, uuid, text, uuid, uuid, boolean);
CREATE FUNCTION public.platform_set_membership(p_org_id uuid, p_user_id uuid, p_role text, p_department_id uuid DEFAULT NULL::uuid, p_active boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage'))
     AND NOT public.is_tenant_people_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to manage members of this organization' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('organization_owner','organization_admin','brand_admin',
                    'department_manager','training_manager','knowledge_manager','author','instructor','learner') THEN
    RAISE EXCEPTION 'Invalid membership role' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'organization_owner' AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Only a platform operator may set organization_owner' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organization_memberships SET
    role = p_role::public.membership_role,
    department_id = p_department_id, is_active = p_active, updated_at = now()
  WHERE organization_id = p_org_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role, department_id, is_active)
    VALUES (p_org_id, p_user_id, p_role::public.membership_role, p_department_id, p_active);
  END IF;
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_membership', 'organization_membership', p_user_id::text,
          jsonb_build_object('role', p_role, 'department_id', p_department_id, 'is_active', p_active));
END;
$function$;

-- ---- employee directory / colleague profile ---------------------------------
DROP FUNCTION IF EXISTS public.get_employee_public_profile(uuid);
DROP FUNCTION IF EXISTS public.get_employee_directory(text, uuid, uuid, app_role, text, text, boolean);

CREATE FUNCTION public.get_employee_directory(p_search text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_role app_role DEFAULT NULL::app_role, p_management_level text DEFAULT 'all'::text, p_sort text DEFAULT 'name_asc'::text, p_include_inactive boolean DEFAULT false)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text, bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text, manager_title text, primary_department_id uuid, primary_department_name text, department_ids uuid[], department_names text[], roles app_role[], management_level text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH scoped_profiles AS (
  SELECT p.id, p.full_name, p.avatar_url, p.job_title, p.email, p.phone_extension, p.bio,
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
    COALESCE(dept.department_ids, ARRAY[]::uuid[]) AS department_ids,
    COALESCE(dept.department_names, ARRAY[]::text[]) AS department_names,
    dept.primary_department_id,
    dept.primary_department_name,
    COALESCE(rl.roles, ARRAY[]::public.app_role[]) AS roles
  FROM scoped_profiles sp
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
    sd.primary_department_id, sd.primary_department_name,
    sd.department_ids, sd.department_names, sd.roles,
    CASE
      WHEN ('administrator'::public.app_role = ANY(sd.roles)
            OR 'corporate_admin'::public.app_role = ANY(sd.roles)
            OR 'regional_admin'::public.app_role = ANY(sd.roles)
            OR 'regional_hr'::public.app_role = ANY(sd.roles)) THEN 'executive'
      WHEN ('training_manager'::public.app_role = ANY(sd.roles)
            OR 'department_head'::public.app_role = ANY(sd.roles)
            OR 'manager'::public.app_role = ANY(sd.roles)) THEN 'management'
      ELSE 'staff'
    END AS management_level,
    sd.updated_at
  FROM scope_data sd
  LEFT JOIN public.profiles mgr ON mgr.id = sd.reporting_to
)
SELECT
  e.id, e.full_name, e.avatar_url, e.job_title, e.work_email, e.phone_extension,
  e.bio, e.joining_date, e.is_active, e.staff_id, e.manager_id, e.manager_name, e.manager_title,
  e.primary_department_id, e.primary_department_name,
  e.department_ids, e.department_names, e.roles, e.management_level, e.updated_at
FROM enriched e
WHERE (p_department_id IS NULL OR p_department_id = ANY(e.department_ids))
  AND (p_role IS NULL OR p_role = ANY(e.roles))
  AND (p_management_level IS NULL OR lower(p_management_level) = 'all' OR lower(p_management_level) = lower(e.management_level))
ORDER BY
  CASE WHEN p_sort = 'name_desc' THEN e.full_name END DESC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_asc' THEN e.joining_date END ASC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_desc' THEN e.joining_date END DESC NULLS LAST,
  CASE WHEN p_sort = 'name_asc' OR p_sort IS NULL THEN e.full_name END ASC NULLS LAST,
  e.full_name ASC;
$function$;

CREATE FUNCTION public.get_employee_public_profile(p_profile_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text, bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text, manager_title text, department_names text[], roles app_role[], skills text[], certifications text[], direct_reports jsonb, updated_at timestamp with time zone, is_edited boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT d.*
  FROM public.get_employee_directory(
    p_search := NULL,
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
    jsonb_agg(jsonb_build_object('id', p.id, 'full_name', p.full_name, 'job_title', p.job_title, 'avatar_url', p.avatar_url)
              ORDER BY p.full_name),
    '[]'::jsonb) AS direct_reports
  FROM public.profiles p
  WHERE p.reporting_to = p_profile_id
    AND COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
)
SELECT
  b.id, b.full_name, b.avatar_url, b.job_title, b.work_email, b.phone_extension, b.bio,
  b.joining_date, b.is_active, b.staff_id, b.manager_id, b.manager_name, b.manager_title,
  b.department_names, b.roles, sd.skills, cd.certifications, dr.direct_reports, b.updated_at,
  (b.updated_at > (SELECT p.created_at FROM public.profiles p WHERE p.id = b.id)) AS is_edited
FROM base b
CROSS JOIN skill_data sd
CROSS JOIN cert_data cd
CROSS JOIN direct_report_data dr;
$function$;

-- ---- grants -----------------------------------------------------------------
DO $grants$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.search_knowledge_articles(text, text, text, uuid, boolean, integer, integer)',
    'public.create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, text, uuid[], timestamptz, text, text, boolean, boolean, integer[])',
    'public.get_assignable_learners(uuid, uuid, uuid, text, text, integer, integer)',
    'public.get_assignable_recipients_count(uuid, uuid, uuid, text, text, uuid[], text)',
    'public.secure_search_documents(text, uuid, text, text, uuid, text[], timestamptz, timestamptz, text, boolean, boolean, text, text, integer, integer)',
    'public.secure_search_users(text, uuid, text, boolean, integer)',
    'public.get_org_hierarchy(uuid)',
    'public.get_sidebar_counts(uuid, text, uuid[])',
    'public.platform_set_membership(uuid, uuid, text, uuid, boolean)',
    'public.get_employee_public_profile(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
  -- Internal: only reached through get_employee_public_profile.
  REVOKE ALL ON FUNCTION public.get_employee_directory(text, uuid, app_role, text, text, boolean) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_employee_directory(text, uuid, app_role, text, text, boolean) TO service_role;
END
$grants$;

COMMIT;
