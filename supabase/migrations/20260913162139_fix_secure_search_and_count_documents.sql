
CREATE OR REPLACE FUNCTION public.secure_count_documents(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_visibility text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_file_type text[] DEFAULT NULL::text[], p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_confidentiality_level text DEFAULT NULL::text, p_include_deleted boolean DEFAULT false, p_include_archived boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    SELECT COUNT(*) INTO v_count
    FROM documents d
    WHERE 
        (p_search_query IS NULL OR p_search_query = '' OR 
            (d.title ILIKE '%' || p_search_query || '%' OR
             d.description ILIKE '%' || p_search_query || '%'))
        AND (p_property_id IS NULL OR d.property_id = p_property_id)
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
        AND (
            v_is_admin OR
            d.created_by = v_user_id OR
            d.owner_id = v_user_id OR
            (
                d.status = 'PUBLISHED' AND 
                (
                    d.visibility = 'all_properties' OR
                    (d.visibility = 'property' AND public.has_property_access(v_user_id, d.property_id)) OR
                    (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM organization_memberships om
                        WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
                    )) OR
                    (d.visibility = 'role' AND EXISTS (
                        SELECT 1 FROM user_roles ur 
                        WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT
                    ))
                )
            )
        );

    RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.secure_search_documents(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_visibility text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_file_type text[] DEFAULT NULL::text[], p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_confidentiality_level text DEFAULT NULL::text, p_include_deleted boolean DEFAULT false, p_include_archived boolean DEFAULT false, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, content text, file_url text, status text, visibility text, property_id uuid, department_id uuid, folder_id uuid, file_type text, file_size bigint, file_extension text, confidentiality_level text, is_deleted boolean, is_archived boolean, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, view_count integer, download_count integer, content_type text, author jsonb)
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
           d.property_id, d.department_id, d.folder_id, d.file_type, d.file_size, d.file_extension,
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
                    OR (d.visibility = 'role' AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT))
               ))
        )
    ORDER BY
        CASE v_sort_column WHEN 'title' THEN d.title ELSE NULL END ASC NULLS LAST,
        CASE v_sort_column WHEN 'created_at' THEN d.created_at::TEXT WHEN 'updated_at' THEN d.updated_at::TEXT ELSE NULL END::TIMESTAMPTZ DESC NULLS LAST
    LIMIT LEAST(p_limit, 500) OFFSET GREATEST(p_offset, 0);
END;
$function$;
