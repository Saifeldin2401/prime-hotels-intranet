-- ============================================================================
-- Document Full-Text Search System
-- PostgreSQL tsvector-based full-text search for documents
-- ============================================================================

-- Enable pg_trgm extension for trigram search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
ON documents USING GIN(search_vector);

-- Create trigram index for fuzzy text search on title
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm 
ON documents USING GIN(title gin_trgm_ops);

-- Create trigram index for fuzzy text search on description
CREATE INDEX IF NOT EXISTS idx_documents_description_trgm 
ON documents USING GIN(description gin_trgm_ops) 
WHERE description IS NOT NULL;

-- Function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_tag_names TEXT;
    v_folder_name TEXT;
    v_document_number TEXT;
BEGIN
    -- Get tag names as a space-separated string
    SELECT string_agg(dt.name, ' ')
    INTO v_tag_names
    FROM document_tag_assignments dta
    JOIN document_tags dt ON dta.tag_id = dt.id
    WHERE dta.document_id = NEW.id;
    
    -- Get folder name
    SELECT name 
    INTO v_folder_name
    FROM document_folders 
    WHERE id = NEW.folder_id;
    
    -- Build search vector with weighted components
    -- Weight levels: A (title), B (tags, folder), C (description), D (document_number)
    NEW.search_vector := 
        -- Title gets highest weight (A)
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        
        -- Tags and folder get medium-high weight (B)
        setweight(to_tsvector('english', COALESCE(v_tag_names, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_folder_name, '')), 'B') ||
        
        -- Description gets medium weight (C)
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        
        -- Document number gets lower weight (D)
        setweight(to_tsvector('english', COALESCE(NEW.document_number, '')), 'D');
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-update search_vector before insert
DROP TRIGGER IF EXISTS document_search_vector_insert ON documents;
CREATE TRIGGER document_search_vector_insert
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Trigger to auto-update search_vector before update
DROP TRIGGER IF EXISTS document_search_vector_update ON documents;
CREATE TRIGGER document_search_vector_update
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Trigger to update search_vector when tags change
CREATE OR REPLACE FUNCTION update_document_search_vector_on_tag_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Update search vector for affected document
    IF TG_OP = 'DELETE' THEN
        UPDATE documents SET id = id WHERE id = OLD.document_id;
        RETURN OLD;
    ELSE
        UPDATE documents SET id = id WHERE id = NEW.document_id;
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS document_search_vector_tag_change ON document_tag_assignments;
CREATE TRIGGER document_search_vector_tag_change
    AFTER INSERT OR UPDATE OR DELETE ON document_tag_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector_on_tag_change();

-- Function to search documents with ranking
CREATE OR REPLACE FUNCTION search_documents(
    p_query TEXT,
    p_property_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    file_url TEXT,
    status document_status,
    property_id UUID,
    folder_id UUID,
    created_at TIMESTAMPTZ,
    rank REAL,
    headline TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_query_tsquery tsquery;
BEGIN
    -- Convert search query to tsquery
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
    AND (
        -- Apply property filter if provided
        p_property_id IS NULL OR d.property_id = p_property_id
    )
    AND (
        -- Apply folder filter if provided
        p_folder_id IS NULL OR d.folder_id = p_folder_id
    )
    -- Respect visibility
    AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        d.created_by = auth.uid() OR
        d.owner_id = auth.uid() OR
        (
            d.status = 'PUBLISHED' AND 
            (
                d.visibility = 'all_properties' OR
                (d.visibility = 'property' AND public.has_property_access(auth.uid(), d.property_id)) OR
                (d.visibility = 'department' AND EXISTS (
                    SELECT 1 FROM user_departments ud
                    WHERE ud.user_id = auth.uid() AND ud.department_id = d.department_id
                )) OR
                (d.visibility = 'role' AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = auth.uid() AND ur.role = d.role
                ))
            )
        )
    )
    ORDER BY rank DESC, d.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function for fuzzy text search (when full-text search doesn't match)
CREATE OR REPLACE FUNCTION fuzzy_search_documents(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    similarity REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
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
    WHERE d.title % p_query OR d.description % p_query
    AND d.is_archived = FALSE
    AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        d.created_by = auth.uid() OR
        d.owner_id = auth.uid() OR
        (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id))
    )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$;

-- Combined search function that tries full-text first, then fuzzy
CREATE OR REPLACE FUNCTION find_documents(
    p_query TEXT,
    p_property_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    file_url TEXT,
    status document_status,
    property_id UUID,
    folder_id UUID,
    created_at TIMESTAMPTZ,
    rank REAL,
    headline TEXT,
    match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Try full-text search first
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.description,
        s.file_url,
        s.status,
        s.property_id,
        s.folder_id,
        s.created_at,
        s.rank,
        s.headline,
        'fulltext'::TEXT AS match_type
    FROM search_documents(p_query, p_property_id, p_folder_id, p_limit, p_offset) s;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- If no results, try fuzzy search
    IF v_count = 0 THEN
        RETURN QUERY
        SELECT 
            f.id,
            f.title,
            f.description,
            d.file_url,
            d.status,
            d.property_id,
            d.folder_id,
            d.created_at,
            f.similarity AS rank,
            NULL::TEXT AS headline,
            'fuzzy'::TEXT AS match_type
        FROM fuzzy_search_documents(p_query, p_limit) f
        JOIN documents d ON f.id = d.id;
    END IF;
END;
$$;

-- Function to rebuild search index for all documents (maintenance)
CREATE OR REPLACE FUNCTION rebuild_document_search_index()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_count INTEGER := 0;
    v_doc RECORD;
BEGIN
    FOR v_doc IN SELECT id FROM documents WHERE is_archived = FALSE
    LOOP
        UPDATE documents SET id = id WHERE id = v_doc.id;
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Backfill existing documents
-- This updates all existing documents to populate search_vector
DO $$
BEGIN
    PERFORM rebuild_document_search_index();
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during backfill: %', SQLERRM;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN documents.search_vector IS 'PostgreSQL tsvector for full-text search';
COMMENT ON FUNCTION search_documents IS 'Full-text search documents with ranking and highlighting';
COMMENT ON FUNCTION fuzzy_search_documents IS 'Fuzzy text search using trigram similarity';
COMMENT ON FUNCTION find_documents IS 'Combined search that tries full-text first, then fuzzy matching';
COMMENT ON FUNCTION rebuild_document_search_index IS 'Maintenance function to rebuild all document search vectors';
