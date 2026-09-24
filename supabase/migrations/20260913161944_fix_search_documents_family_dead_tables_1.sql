
-- search_documents / search_sops / fuzzy_search_documents all crashed whenever a
-- department-visibility document was evaluated for a non-owner/non-admin caller, because
-- they queried the dropped `user_departments` table directly. Department membership now
-- lives on organization_memberships.department_id.
CREATE OR REPLACE FUNCTION public.search_documents(p_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, file_url text, status document_status, property_id uuid, folder_id uuid, created_at timestamp with time zone, rank real, headline text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_query_tsquery tsquery;
    v_user_id uuid := auth.uid();
    v_is_admin boolean;
BEGIN
    v_is_admin := public.is_platform_super_admin();
    v_query_tsquery := plainto_tsquery('english', p_query);

    RETURN QUERY
    SELECT
        d.id, d.title, d.description, d.file_url, d.status, d.property_id, d.folder_id, d.created_at,
        ts_rank_cd(d.search_vector, v_query_tsquery, 32)::REAL AS rank,
        ts_headline('english', d.title || ' ' || COALESCE(d.description, ''), v_query_tsquery,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10') AS headline
    FROM documents d
    WHERE d.search_vector @@ v_query_tsquery
    AND d.is_archived = FALSE
    AND (v_is_admin OR COALESCE(d.is_master_template, false) OR public.org_visible(d.organization_id))
    AND (p_property_id IS NULL OR d.property_id = p_property_id)
    AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
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
                    SELECT 1 FROM public.organization_memberships om
                    WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
                )) OR
                (d.visibility = 'role' AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = v_user_id AND ur.role = d.role
                ))
            )
        )
    )
    ORDER BY rank DESC, d.created_at DESC
    LIMIT LEAST(p_limit, 500)
    OFFSET GREATEST(p_offset, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_sops(p_query text)
 RETURNS TABLE(id uuid, title text, description text, file_url text, status document_status, organization_id uuid, category_id uuid, department_id uuid, created_at timestamp with time zone, rank real, headline text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_query_tsquery tsquery;
  v_user_id uuid := auth.uid();
BEGIN
  v_query_tsquery := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    d.id, d.title, d.description, d.file_url, d.status, d.organization_id, d.category_id, d.department_id, d.created_at,
    ts_rank_cd(d.search_vector, v_query_tsquery, 32)::REAL AS rank,
    ts_headline('english', d.title || ' ' || COALESCE(d.description, ''), v_query_tsquery,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10') AS headline
  FROM public.documents d
  WHERE (d.content_type = 'sop' OR d.content_type IS NULL)
    AND (d.search_vector @@ v_query_tsquery OR d.title ILIKE '%' || p_query || '%')
    AND COALESCE(d.is_deleted, false) = false
    AND COALESCE(d.is_archived, false) = false
    AND (public.is_platform_operator() OR COALESCE(d.is_master_template, false) OR public.org_visible(d.organization_id))
    AND (
      public.is_platform_operator()
      OR d.created_by = v_user_id
      OR d.owner_id = v_user_id
      OR (
        d.status = 'PUBLISHED'
        AND (
          d.visibility = 'all_properties'
          OR (d.visibility = 'property' AND public.has_property_access(v_user_id, d.property_id))
          OR (d.visibility = 'department' AND EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
          ))
          OR public.is_tenant_content_editor(d.organization_id)
        )
      )
    )
  ORDER BY rank DESC, d.created_at DESC
  LIMIT 50;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, description text, similarity real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, extensions, pg_temp'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_is_admin boolean;
BEGIN
    v_is_admin := public.is_platform_super_admin();

    RETURN QUERY
    SELECT
        d.id, d.title, d.description,
        GREATEST(
            similarity(d.title, p_query),
            similarity(COALESCE(d.description, ''), p_query)
        )::REAL AS similarity
    FROM documents d
    WHERE (d.title % p_query OR d.description % p_query)
      AND d.is_archived = FALSE
      AND (v_is_admin OR COALESCE(d.is_master_template, false) OR public.org_visible(d.organization_id))
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
                      SELECT 1 FROM public.organization_memberships om
                      WHERE om.user_id = v_user_id AND om.is_active = true AND om.department_id = d.department_id
                  )) OR
                  (d.visibility = 'role' AND EXISTS (
                      SELECT 1 FROM user_roles ur
                      WHERE ur.user_id = v_user_id AND ur.role = d.role
                  ))
              )
          )
      )
    ORDER BY similarity DESC
    LIMIT LEAST(p_limit, 500);
END;
$function$;
