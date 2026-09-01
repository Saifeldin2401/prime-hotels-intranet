-- 1. REVOKE anon from sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.deploy_master_content(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_global_search(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_ai_operations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_operations_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_user_directory(text, uuid, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_employee_transfer(uuid, uuid, uuid, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.retry_failed_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.retry_course_generation_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_hotel_entitlement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_membership_entitlement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, uuid, text, uuid[], timestamptz, text, text, boolean, boolean, integer[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assignable_learners(uuid, uuid, uuid, uuid, text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assignable_recipients_count(uuid, uuid, uuid, uuid, text, text, uuid[], text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_caller_assignment_scopes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_setting(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notification_policy_enabled(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_training_module_to_course() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_auto_assign_new_hire() FROM anon;

-- 2. HARDEN secure_search_users with multi-tenant organization boundary
CREATE OR REPLACE FUNCTION public.secure_search_users(
    p_search_query text,
    p_property_id uuid DEFAULT NULL::uuid,
    p_department_id uuid DEFAULT NULL::uuid,
    p_role text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    email text,
    full_name text,
    phone text,
    job_title text,
    staff_id text,
    avatar_url text,
    is_active boolean,
    hire_date date,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        p.id,
        p.email,
        p.full_name,
        p.phone,
        p.job_title,
        p.staff_id,
        p.avatar_url,
        p.is_active,
        p.hire_date,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.organization_memberships om ON om.user_id = p.id AND om.is_active = true
    WHERE
        -- Search query filter
        (p_search_query IS NULL OR p_search_query = '' OR 
            (p.full_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%' OR
             p.job_title ILIKE '%' || p_search_query || '%' OR
             p.staff_id ILIKE '%' || p_search_query || '%'))
        -- Active filter
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
        -- Property filter
        AND (p_property_id IS NULL OR om.hotel_id = p_property_id OR EXISTS (
            SELECT 1 FROM public.user_properties up 
            WHERE up.user_id = p.id AND up.property_id = p_property_id
        ))
        -- Department filter
        AND (p_department_id IS NULL OR om.department_id = p_department_id OR EXISTS (
            SELECT 1 FROM public.user_departments ud 
            WHERE ud.user_id = p.id AND ud.department_id = p_department_id
        ))
        -- Role filter
        AND (p_role IS NULL OR om.role::text = p_role OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = p.id AND ur.role::TEXT = p_role
        ))
        -- HARD MULTI-TENANT ISOLATION BOUNDARY:
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
$$;

-- 3. HARDEN secure_search_tasks with multi-tenant boundary
CREATE OR REPLACE FUNCTION public.secure_search_tasks(
    p_search_query text DEFAULT NULL::text,
    p_status text[] DEFAULT NULL::text[],
    p_priority text[] DEFAULT NULL::text[],
    p_assigned_to uuid DEFAULT NULL::uuid,
    p_created_by uuid DEFAULT NULL::uuid,
    p_property_id uuid DEFAULT NULL::uuid,
    p_department_id uuid DEFAULT NULL::uuid,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    status text,
    priority text,
    assigned_to_id uuid,
    created_by_id uuid,
    property_id uuid,
    department_id uuid,
    due_date timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_deleted boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status::TEXT,
        t.priority::TEXT,
        t.assigned_to_id,
        t.created_by_id,
        t.property_id,
        t.department_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.is_deleted
    FROM public.tasks t
    LEFT JOIN public.hotels h ON h.id = t.property_id
    WHERE t.is_deleted = FALSE
        AND (p_search_query IS NULL OR p_search_query = '' OR 
            (t.title ILIKE '%' || p_search_query || '%' OR
             t.description ILIKE '%' || p_search_query || '%'))
        AND (p_status IS NULL OR p_status = '{}' OR t.status::TEXT = ANY(p_status))
        AND (p_priority IS NULL OR p_priority = '{}' OR t.priority::TEXT = ANY(p_priority))
        AND (p_assigned_to IS NULL OR t.assigned_to_id = p_assigned_to)
        AND (p_created_by IS NULL OR t.created_by_id = p_created_by)
        AND (p_property_id IS NULL OR t.property_id = p_property_id)
        AND (p_department_id IS NULL OR t.department_id = p_department_id)
        -- HARD MULTI-TENANT BOUNDARY:
        AND (
            v_is_platform
            OR (
                h.organization_id = ANY(v_user_org_ids)
                AND public.org_is_operational(h.organization_id)
            )
            OR (
                t.assigned_to_id = v_user_id
                OR t.created_by_id = v_user_id
            )
        )
    ORDER BY t.created_at DESC
    LIMIT LEAST(p_limit, 500)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 4. HARDEN match_knowledge_chunks vector & keyword search with tenant isolation
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    p_query_embedding extensions.vector,
    p_query_text text DEFAULT NULL::text,
    p_match_count integer DEFAULT 8,
    p_min_similarity double precision DEFAULT 0.0,
    p_organization_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    id uuid,
    document_id uuid,
    article_id uuid,
    title text,
    section text,
    content text,
    similarity double precision,
    keyword_rank double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.article_id,
    d.title,
    kc.section,
    kc.content,
    CASE
      WHEN kc.embedding IS NULL OR p_query_embedding IS NULL THEN 0.0
      ELSE 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding)
    END AS similarity,
    CASE
      WHEN p_query_text IS NULL OR p_query_text = '' THEN 0.0
      ELSE ts_rank(
             to_tsvector('simple', kc.content),
             plainto_tsquery('simple', p_query_text)
           )::double precision
    END AS keyword_rank
  FROM public.knowledge_chunks kc
  LEFT JOIN public.documents d ON d.id = kc.document_id
  WHERE
    -- Tenant isolation filter
    (
      public.is_platform_super_admin()
      OR (p_organization_id IS NOT NULL AND kc.organization_id = p_organization_id AND public.org_visible(p_organization_id))
      OR (p_organization_id IS NULL AND (
            kc.organization_id = ANY(public.current_user_organization_ids()) 
            AND public.org_is_operational(kc.organization_id)
         ))
      OR (kc.organization_id IS NULL AND COALESCE(d.is_master_template, false) = true)
    )
    AND (
      (kc.embedding IS NOT NULL AND p_query_embedding IS NOT NULL
        AND 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding) >= p_min_similarity)
      OR
      (p_query_text IS NOT NULL AND p_query_text <> ''
        AND to_tsvector('simple', kc.content) @@ plainto_tsquery('simple', p_query_text))
    )
  ORDER BY
    (0.7 * CASE
             WHEN kc.embedding IS NULL OR p_query_embedding IS NULL THEN 0.0
             ELSE 1 - (kc.embedding OPERATOR(extensions.<=>) p_query_embedding)
           END)
    + (0.3 * CASE
               WHEN p_query_text IS NULL OR p_query_text = '' THEN 0.0
               ELSE least(
                      ts_rank(
                        to_tsvector('simple', kc.content),
                        plainto_tsquery('simple', p_query_text)
                      )::double precision,
                      1.0)
             END) DESC
  LIMIT greatest(p_match_count, 1);
$$;

-- 5. HARDEN employee document access functions
CREATE OR REPLACE FUNCTION public.can_manage_employee_document(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Self can always manage own documents
  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Platform super admins
  IF public.is_platform_super_admin() THEN
    RETURN true;
  END IF;

  -- Tenant HR / Org Admin: must share an operational organization with target user
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_memberships caller_m
    JOIN public.organization_memberships target_m 
      ON target_m.organization_id = caller_m.organization_id
    WHERE caller_m.user_id = v_uid
      AND target_m.user_id = p_target_user_id
      AND caller_m.is_active = true
      AND target_m.is_active = true
      AND caller_m.role IN ('organization_owner', 'organization_admin', 'hotel_admin')
      AND public.org_is_operational(caller_m.organization_id)
      AND (caller_m.hotel_id IS NULL OR caller_m.hotel_id = target_m.hotel_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_employee_document(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Self can always view own documents
  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  -- Platform super admins
  IF public.is_platform_super_admin() THEN
    RETURN true;
  END IF;

  -- Direct reporting manager within same operational org
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.organization_memberships caller_m ON caller_m.user_id = v_uid AND caller_m.is_active = true
    JOIN public.organization_memberships target_m ON target_m.user_id = p_target_user_id AND target_m.is_active = true
    WHERE p.id = p_target_user_id 
      AND p.reporting_to = v_uid
      AND caller_m.organization_id = target_m.organization_id
      AND public.org_is_operational(caller_m.organization_id)
  ) THEN
    RETURN true;
  END IF;

  -- Tenant HR / Admin
  RETURN public.can_manage_employee_document(p_target_user_id);
END;
$$;

-- 6. HARDEN storage policies
DROP POLICY IF EXISTS "announcement_attachments_authenticated_select" ON storage.objects;
CREATE POLICY "announcement_attachments_authenticated_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'announcement-attachments'
  AND (
    public.is_platform_operator()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
      AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE (a.id::text = (storage.foldername(name))[1] OR a.property_id::text = (storage.foldername(name))[1])
        AND public.org_visible(a.organization_id)
    )
  )
);

-- 7. CLEAN UP duplicate stacked policies on training_assignment_rules
DROP POLICY IF EXISTS "training_assignment_rules_sel" ON public.training_assignment_rules;
DROP POLICY IF EXISTS "training_assignment_rules_write" ON public.training_assignment_rules;

-- 8. HARDEN write policies on courses, documents, training_assignment_rules, unified_questions
DROP POLICY IF EXISTS "multitenant_courses_update" ON public.courses;
CREATE POLICY "multitenant_courses_update" ON public.courses
FOR UPDATE USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
) WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);

DROP POLICY IF EXISTS "multitenant_documents_update" ON public.documents;
CREATE POLICY "multitenant_documents_update" ON public.documents
FOR UPDATE USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
) WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);

DROP POLICY IF EXISTS "multitenant_tar_update" ON public.training_assignment_rules;
CREATE POLICY "multitenant_tar_update" ON public.training_assignment_rules
FOR UPDATE USING (
  public.is_platform_super_admin()
  OR (
    (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_admin(organization_id))
  )
) WITH CHECK (
  public.is_platform_super_admin()
  OR (
    (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_admin(organization_id))
  )
);

DROP POLICY IF EXISTS "multitenant_unified_questions_update" ON public.unified_questions;
CREATE POLICY "multitenant_unified_questions_update" ON public.unified_questions
FOR UPDATE USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
) WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL 
    AND (organization_id = ANY(public.current_user_organization_ids()) OR public.has_active_platform_session(organization_id))
    AND public.org_is_operational(organization_id)
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);
