
CREATE OR REPLACE FUNCTION public.secure_search_users(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_limit integer DEFAULT 50)
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
        -- Property (hotel) filter -- organization_memberships.hotel_id is the current
        -- source of truth; the dead user_properties fallback EXISTS is gone.
        AND (p_property_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships om2
            WHERE om2.user_id = p.id AND om2.is_active = true AND om2.hotel_id = p_property_id
        ))
        -- Department filter
        AND (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_memberships om3
            WHERE om3.user_id = p.id AND om3.is_active = true AND om3.department_id = p_department_id
        ))
        -- Role filter
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

CREATE OR REPLACE FUNCTION public.validate_document_access(p_document_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_doc RECORD;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    SELECT * INTO v_doc
    FROM documents
    WHERE id = p_document_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_is_admin THEN
        RETURN TRUE;
    END IF;

    IF v_doc.created_by = v_user_id OR v_doc.owner_id = v_user_id THEN
        RETURN TRUE;
    END IF;

    IF v_doc.status = 'PUBLISHED' THEN
        CASE v_doc.visibility
            WHEN 'all_properties' THEN
                RETURN TRUE;
            WHEN 'property' THEN
                RETURN public.has_property_access(v_user_id, v_doc.property_id);
            WHEN 'department' THEN
                RETURN EXISTS (
                    SELECT 1 FROM organization_memberships
                    WHERE user_id = v_user_id AND is_active = true AND department_id = v_doc.department_id
                );
            WHEN 'role' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = v_user_id AND role::TEXT = v_doc.role::TEXT
                );
            ELSE
                RETURN FALSE;
        END CASE;
    END IF;

    RETURN FALSE;
END;
$function$;
