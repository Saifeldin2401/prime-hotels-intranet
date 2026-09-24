-- Knowledge base search upgrade:
--   1. documents.search_vector previously indexed title/tags/folder/description/
--      document_number only -- the article BODY was never searchable, so a search
--      for a phrase that only appears in a procedure's text returned nothing.
--      Add content at weight D (folded in with document_number).
--   2. Backfill search_vector for existing rows (the trigger only fires on
--      INSERT/UPDATE going forward).
--   3. Add a SECURITY INVOKER ranked-search RPC so the frontend can rank by
--      relevance (ts_rank_cd) instead of ilike substring matching. INVOKER (not
--      DEFINER) means it runs under the caller's own role, so RLS on `documents`
--      is enforced exactly as it is for the existing direct-table queries --
--      no duplicated/parallel authorization logic to keep in sync.

CREATE OR REPLACE FUNCTION public.update_document_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tag_names TEXT;
    v_folder_name TEXT;
BEGIN
    SELECT string_agg(dt.name, ' ')
    INTO v_tag_names
    FROM document_tag_assignments dta
    JOIN document_tags dt ON dta.tag_id = dt.id
    WHERE dta.document_id = NEW.id;

    SELECT name
    INTO v_folder_name
    FROM document_folders
    WHERE id = NEW.folder_id;

    -- Weight levels: A (title), B (tags, folder), C (description), D (body content, document_number)
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_tag_names, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_folder_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', left(COALESCE(NEW.content, ''), 200000)), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.document_number, '')), 'D');

    RETURN NEW;
END;
$function$;

-- Backfill existing rows directly (avoids re-triggering notification/audit
-- side effects or bumping updated_at via a dummy UPDATE).
UPDATE public.documents d
SET search_vector =
    setweight(to_tsvector('english', COALESCE(d.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(
        (SELECT string_agg(dt.name, ' ')
         FROM document_tag_assignments dta
         JOIN document_tags dt ON dta.tag_id = dt.id
         WHERE dta.document_id = d.id), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(
        (SELECT name FROM document_folders WHERE id = d.folder_id), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(d.description, '')), 'C') ||
    setweight(to_tsvector('english', left(COALESCE(d.content, ''), 200000)), 'D') ||
    setweight(to_tsvector('english', COALESCE(d.document_number, '')), 'D');

CREATE OR REPLACE FUNCTION public.search_knowledge_articles(
    p_query text DEFAULT NULL,
    p_content_type text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_department_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL,
    p_requires_acknowledgment boolean DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, rank real, total_count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
    SELECT
        d.id,
        CASE WHEN p_query IS NOT NULL AND btrim(p_query) <> ''
            THEN ts_rank_cd(d.search_vector, websearch_to_tsquery('english', p_query), 32)
            ELSE 0
        END AS rank,
        count(*) OVER() AS total_count
    FROM public.documents d
    WHERE d.is_deleted = false
        AND (p_query IS NULL OR btrim(p_query) = '' OR d.search_vector @@ websearch_to_tsquery('english', p_query))
        AND (p_content_type IS NULL OR lower(d.content_type) = lower(p_content_type))
        AND (p_status IS NULL OR d.status::text = p_status)
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_property_id IS NULL OR d.property_id IS NULL OR d.property_id = p_property_id)
        AND (p_requires_acknowledgment IS NULL OR d.requires_acknowledgment = p_requires_acknowledgment)
    ORDER BY
        rank DESC,
        d.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.search_knowledge_articles IS
    'RLS-respecting (SECURITY INVOKER) ranked full-text search over documents, '
    'used by the Knowledge Base search UI instead of ilike substring matching.';

REVOKE EXECUTE ON FUNCTION public.search_knowledge_articles(text, text, text, uuid, uuid, boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_knowledge_articles(text, text, text, uuid, uuid, boolean, integer, integer) TO authenticated;
