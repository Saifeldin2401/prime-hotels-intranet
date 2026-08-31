-- ============================================================================
-- Migration: 20260901242000_production_security_hardening_audit.sql
-- Production Security Hardening & Isolation Audit Fixes
-- 1. Harden search_documents & fuzzy_search_documents with strict org_visible() tenant gate
-- 2. Harden status_history SELECT policy with tenant scoping
-- 3. Harden ai_usage_log INSERT policy with caller user_id constraint
-- ============================================================================

-- 1. Harden search_documents with tenant isolation gate
CREATE OR REPLACE FUNCTION public.search_documents(
    p_query text, 
    p_property_id uuid DEFAULT NULL::uuid, 
    p_folder_id uuid DEFAULT NULL::uuid, 
    p_limit integer DEFAULT 20, 
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid, 
    title text, 
    description text, 
    file_url text, 
    status document_status, 
    property_id uuid, 
    folder_id uuid, 
    created_at timestamp with time zone, 
    rank real, 
    headline text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, pg_temp'
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
        d.id,
        d.title,
        d.description,
        d.file_url,
        d.status,
        d.property_id,
        d.folder_id,
        d.created_at,
        ts_rank_cd(d.search_vector, v_query_tsquery, 32)::REAL AS rank,
        ts_headline('english', d.title || ' ' || COALESCE(d.description, ''), v_query_tsquery, 
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10') AS headline
    FROM documents d
    WHERE d.search_vector @@ v_query_tsquery
    AND d.is_archived = FALSE
    -- HARD MULTI-TENANT ISOLATION GATE
    AND (v_is_admin OR COALESCE(d.is_master_template, false) OR public.org_visible(d.organization_id))
    AND (
        p_property_id IS NULL OR d.property_id = p_property_id
    )
    AND (
        p_folder_id IS NULL OR d.folder_id = p_folder_id
    )
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
                    SELECT 1 FROM user_departments ud
                    WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
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

-- 2. Harden fuzzy_search_documents with tenant isolation gate
CREATE OR REPLACE FUNCTION public.fuzzy_search_documents(
    p_query text, 
    p_limit integer DEFAULT 20
)
RETURNS TABLE(
    id uuid, 
    title text, 
    description text, 
    similarity real
)
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
        d.id,
        d.title,
        d.description,
        GREATEST(
            similarity(d.title, p_query),
            similarity(COALESCE(d.description, ''), p_query)
        )::REAL AS similarity
    FROM documents d
    WHERE (d.title % p_query OR d.description % p_query)
      AND d.is_archived = FALSE
      -- HARD MULTI-TENANT ISOLATION GATE
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
                      SELECT 1 FROM user_departments ud
                      WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
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

-- 3. Harden status_history SELECT policy with tenant & user scoping
DROP POLICY IF EXISTS "Users can view status history for entities they can access" ON public.status_history;
CREATE POLICY "status_history_select_scoped" ON public.status_history
FOR SELECT TO authenticated
USING (
    changed_by = (SELECT auth.uid())
    OR public.is_platform_operator((SELECT auth.uid()))
    OR (
        -- Can view if the actor is in the same operational organization
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id IN (
                  SELECT om2.organization_id FROM public.organization_memberships om2
                  WHERE om2.user_id = status_history.changed_by
              )
              AND public.org_is_operational(om.organization_id)
        )
    )
);

-- 4. Harden ai_usage_log INSERT policy
DROP POLICY IF EXISTS "ai_usage_log_insert" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_insert" ON public.ai_usage_log
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_platform_operator((SELECT auth.uid()))
);
