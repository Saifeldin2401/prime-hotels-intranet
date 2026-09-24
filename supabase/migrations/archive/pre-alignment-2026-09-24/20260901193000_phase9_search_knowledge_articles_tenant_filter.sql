-- Phase 9 (AI grounding): search_knowledge_articles is SECURITY DEFINER over public.documents
-- with no tenant predicate -> it ranked/returned document ids across every organization.
-- rag.ts re-filters via a plain documents query (RLS applies there), but any other caller
-- would leak. Add the tenant predicate directly.
CREATE OR REPLACE FUNCTION public.search_knowledge_articles(
  p_query text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text,
  p_status text DEFAULT 'PUBLISHED'::text, p_department_id uuid DEFAULT NULL::uuid,
  p_property_id uuid DEFAULT NULL::uuid, p_requires_acknowledgment boolean DEFAULT NULL::boolean,
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
        AND (p_property_id IS NULL OR d.property_id IS NULL OR d.property_id = p_property_id)
        AND (p_requires_acknowledgment IS NULL OR d.requires_acknowledgment = p_requires_acknowledgment)
    ORDER BY rank DESC, d.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
$function$;
