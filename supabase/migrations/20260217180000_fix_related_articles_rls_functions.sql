-- Fix RLS violation for related_articles system
-- Rationale: Trigger functions on 'documents' were failing because they tried to INSERT/DELETE 
-- from 'related_articles' without SECURITY DEFINER, respecting user-level RLS where no policy existed.

BEGIN;

-- 1. Redefine compute_article_relationships with SECURITY DEFINER
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
    tag_score DECIMAL(5,2);
    category_score DECIMAL(5,2);
    dept_score DECIMAL(5,2);
    type_score DECIMAL(5,2);
    behavior_score DECIMAL(5,2);
    shared_tag_count INTEGER;
BEGIN
    -- Get source document details
    SELECT * INTO target_doc
    FROM documents
    WHERE id = target_doc_id AND is_deleted = FALSE AND status = 'published';
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Find candidates (published, not deleted, not self)
    FOR candidate IN
        SELECT d.*
        FROM documents d
        WHERE d.id != target_doc_id
          AND d.is_deleted = FALSE
          AND d.status = 'published'
        LIMIT 100 -- Evaluate top 100 candidates
    LOOP
        -- Initialize scores
        tag_score := 0;
        category_score := 0;
        dept_score := 0;
        type_score := 0;
        behavior_score := 0;
        shared_tag_count := 0;
        
        -- 1. TAG MATCHING (40% weight)
        SELECT COUNT(*) INTO shared_tag_count
        FROM document_tags dt1
        JOIN document_tags dt2 ON dt1.tag_id = dt2.tag_id
        WHERE dt1.document_id = target_doc_id
          AND dt2.document_id = candidate.id;
        
        IF shared_tag_count > 0 THEN
            tag_score := LEAST(shared_tag_count * 10, 40);
        END IF;
        
        -- 2. CATEGORY MATCHING (25% weight)
        IF target_doc.category_id IS NOT NULL 
           AND candidate.category_id = target_doc.category_id THEN
            category_score := 25;
        END IF;
        
        -- 3. DEPARTMENT MATCHING (15% weight)
        IF target_doc.department_id IS NOT NULL 
           AND candidate.department_id = target_doc.department_id THEN
            dept_score := 15;
        END IF;
        
        -- 4. CONTENT TYPE MATCHING (10% weight)
        IF candidate.content_type = target_doc.content_type THEN
            type_score := 10;
        END IF;
        
        -- 5. BEHAVIORAL SCORE (10% weight)
        SELECT COUNT(DISTINCT user_id) * 2 INTO behavior_score
        FROM related_article_clicks
        WHERE source_document_id = target_doc_id
          AND clicked_document_id = candidate.id
        LIMIT 5;
        
        behavior_score := LEAST(behavior_score, 10);
        
        final_score := tag_score + category_score + dept_score + type_score + behavior_score;
        
        IF final_score > 0 THEN
            RETURN QUERY SELECT 
                candidate.id,
                final_score,
                shared_tag_count,
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
    -- Delete old relationships for this document
    DELETE FROM related_articles WHERE source_document_id = target_doc_id;
    
    -- Compute and insert new relationships
    FOR relationship IN
        SELECT * FROM compute_article_relationships(target_doc_id)
        ORDER BY score DESC
        LIMIT 10 -- Store top 10 related articles
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

-- 3. Redefine triggers with SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.trigger_refresh_related_on_tag_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM refresh_related_articles(NEW.document_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM refresh_related_articles(OLD.document_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Add missing Policies for management
CREATE POLICY "Admins can manage related articles 2026"
ON public.related_articles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
);

COMMIT;
