-- Fix RLS violation for related_articles system - Minimal Fix
BEGIN;

-- Drop functions to redefine
DROP FUNCTION IF EXISTS public.compute_article_relationships(target_doc_id UUID) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_related_articles(target_doc_id UUID) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_refresh_related_on_document_change() CASCADE;

-- 1. Redefine compute_article_relationships (removed document_tags dependency for safety)
CREATE OR REPLACE FUNCTION public.compute_article_relationships(target_doc_id UUID)
RETURNS TABLE(
    related_id UUID,
    score DECIMAL(5,2),
    shared_tags INTEGER,
    same_cat BOOLEAN,
    same_dept BOOLEAN,
    same_type BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_doc RECORD;
    candidate RECORD;
    final_score DECIMAL(5,2);
    category_score DECIMAL(5,2);
    dept_score DECIMAL(5,2);
    type_score DECIMAL(5,2);
    behavior_score DECIMAL(5,2);
BEGIN
    SELECT * INTO target_doc
    FROM documents
    WHERE id = target_doc_id AND is_deleted = FALSE AND status = 'PUBLISHED';
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    FOR candidate IN
        SELECT d.*
        FROM documents d
        WHERE d.id != target_doc_id
          AND d.is_deleted = FALSE
          AND d.status = 'PUBLISHED'
        LIMIT 50
    LOOP
        category_score := CASE WHEN target_doc.category_id IS NOT NULL AND candidate.category_id = target_doc.category_id THEN 40 ELSE 0 END;
        dept_score := CASE WHEN target_doc.department_id IS NOT NULL AND candidate.department_id = target_doc.department_id THEN 30 ELSE 0 END;
        type_score := CASE WHEN candidate.content_type = target_doc.content_type THEN 20 ELSE 0 END;
        
        SELECT COUNT(DISTINCT user_id) * 2 INTO behavior_score
        FROM related_article_clicks
        WHERE source_document_id = target_doc_id
          AND clicked_document_id = candidate.id
        LIMIT 5;
        
        final_score := category_score + dept_score + type_score + COALESCE(behavior_score, 0);
        
        IF final_score > 0 THEN
            RETURN QUERY SELECT 
                candidate.id,
                final_score,
                0, -- No shared tags count for now
                (category_score > 0),
                (dept_score > 0),
                (type_score > 0);
        END IF;
    END LOOP;
END;
$$;

-- 2. Redefine refresh_related_articles with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.refresh_related_articles(target_doc_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    relationship RECORD;
    inserted_count INTEGER := 0;
BEGIN
    DELETE FROM related_articles WHERE source_document_id = target_doc_id;
    
    FOR relationship IN
        SELECT * FROM compute_article_relationships(target_doc_id)
        ORDER BY score DESC
        LIMIT 10
    LOOP
        INSERT INTO related_articles (
            source_document_id,
            related_document_id,
            relevance_score,
            shared_tags_count,
            same_category,
            same_department,
            same_content_type,
            computed_at
        ) VALUES (
            target_doc_id,
            relationship.related_id,
            relationship.score,
            relationship.shared_tags,
            relationship.same_cat,
            relationship.same_dept,
            relationship.same_type,
            NOW()
        );
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$;

-- 3. Redefine trigger function
CREATE OR REPLACE FUNCTION public.trigger_refresh_related_on_document_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM refresh_related_articles(NEW.id);
    RETURN NEW;
END;
$$;

-- 4. Re-attach trigger
CREATE TRIGGER documents_related_refresh
AFTER INSERT OR UPDATE OF title, description, category_id, department_id, content_type, status
ON documents
FOR EACH ROW
WHEN (NEW.is_deleted = FALSE AND NEW.status = 'PUBLISHED')
EXECUTE FUNCTION trigger_refresh_related_on_document_change();

-- 5. Add Policy for authenticated users to view
-- (Already exists usually, but ensure it doesn't block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'related_articles' AND policyname = 'Anyone can view related articles') THEN
        CREATE POLICY "Anyone can view related articles" ON public.related_articles FOR SELECT USING (true);
    END IF;
END $$;

COMMIT;;
