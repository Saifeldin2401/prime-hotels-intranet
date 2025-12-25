-- ============================================================================
-- Automated Related Articles System - Database Migration
-- ============================================================================
-- This migration creates the infrastructure for intelligent, self-maintaining
-- related article recommendations with multi-factor scoring and behavioral tracking.

-- ============================================================================
-- 1. RELATED ARTICLES TABLE (Pre-computed Relationships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS related_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Scoring breakdown
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    shared_tags_count INTEGER DEFAULT 0,
    same_category BOOLEAN DEFAULT FALSE,
    same_department BOOLEAN DEFAULT FALSE,
    same_content_type BOOLEAN DEFAULT FALSE,
    behavioral_score DECIMAL(5,2) DEFAULT 0,
    
    -- Performance tracking
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Metadata
    computed_at TIMESTAMP DEFAULT NOW(),
    last_clicked_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(source_document_id, related_document_id),
    CHECK (source_document_id != related_document_id),
    CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- Indexes for performance
CREATE INDEX idx_related_articles_source ON related_articles(source_document_id, relevance_score DESC);
CREATE INDEX idx_related_articles_score ON related_articles(relevance_score DESC);
CREATE INDEX idx_related_articles_computed ON related_articles(computed_at);

-- ============================================================================
-- 2. BEHAVIORAL TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS related_article_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    clicked_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    clicked_at TIMESTAMP DEFAULT NOW(),
    
    -- Context
    position_in_list INTEGER, -- Where in the related articles list was this?
    device_type TEXT,
    
    -- Indexes
    INDEX idx_clicks_source (source_document_id),
    INDEX idx_clicks_clicked (clicked_document_id),
    INDEX idx_clicks_user (user_id),
    INDEX idx_clicks_time (clicked_at DESC)
);

-- ============================================================================
-- 3. SCORING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_article_relationships(target_doc_id UUID)
RETURNS TABLE(
    related_id UUID,
    score DECIMAL(5,2),
    shared_tags INTEGER,
    same_cat BOOLEAN,
    same_dept BOOLEAN,
    same_type BOOLEAN
) AS $$
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
        -- Count shared tags via document_tags junction table
        SELECT COUNT(*) INTO shared_tag_count
        FROM document_tags dt1
        JOIN document_tags dt2 ON dt1.tag_id = dt2.tag_id
        WHERE dt1.document_id = target_doc_id
          AND dt2.document_id = candidate.id;
        
        IF shared_tag_count > 0 THEN
            -- Each shared tag adds points, max 40
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
        -- Users who viewed source also viewed this candidate
        SELECT COUNT(DISTINCT user_id) * 2 INTO behavior_score
        FROM related_article_clicks
        WHERE source_document_id = target_doc_id
          AND clicked_document_id = candidate.id
        LIMIT 5; -- Cap at 10 points
        
        behavior_score := LEAST(behavior_score, 10);
        
        -- Calculate final score
        final_score := tag_score + category_score + dept_score + type_score + behavior_score;
        
        -- Only return if score > 0
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. REFRESH RELATIONSHIPS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_related_articles(target_doc_id UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGERS FOR AUTO-RECOMPUTATION
-- ============================================================================

-- Trigger on document updates
CREATE OR REPLACE FUNCTION trigger_refresh_related_on_document_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recompute relationships for this document
    PERFORM refresh_related_articles(NEW.id);
    
    -- Also recompute for documents that might be related to this one
    -- (e.g., if tags/category changed, other docs pointing to this need update)
    -- This is expensive, so we'll do it async via a queue in production
    -- For now, we'll just refresh the current document
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_related_refresh
AFTER INSERT OR UPDATE OF title, description, category_id, department_id, content_type, status
ON documents
FOR EACH ROW
WHEN (NEW.is_deleted = FALSE AND NEW.status = 'published')
EXECUTE FUNCTION trigger_refresh_related_on_document_change();

-- Trigger on tag changes
CREATE OR REPLACE FUNCTION trigger_refresh_related_on_tag_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recompute relationships when tags are added/removed
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM refresh_related_articles(NEW.document_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM refresh_related_articles(OLD.document_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_tags_related_refresh
AFTER INSERT OR UPDATE OR DELETE
ON document_tags
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_related_on_tag_change();

-- ============================================================================
-- 6. CLICK TRACKING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION track_related_article_click(
    p_source_doc_id UUID,
    p_clicked_doc_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_position INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert click event
    INSERT INTO related_article_clicks (
        source_document_id,
        clicked_document_id,
        user_id,
        position_in_list,
        clicked_at
    ) VALUES (
        p_source_doc_id,
        p_clicked_doc_id,
        p_user_id,
        p_position,
        NOW()
    );
    
    -- Update click count and CTR in related_articles
    UPDATE related_articles
    SET 
        click_count = click_count + 1,
        last_clicked_at = NOW(),
        click_through_rate = (click_count + 1)::DECIMAL / GREATEST(impression_count, 1)
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = p_clicked_doc_id;
      
    -- Boost relevance score based on clicks (feedback loop)
    UPDATE related_articles
    SET relevance_score = LEAST(
        relevance_score + (click_through_rate * 5), -- Up to 5 point boost
        100
    )
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = p_clicked_doc_id
      AND click_count > 3; -- Only boost after 3+ clicks
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. IMPRESSION TRACKING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION track_related_article_impression(
    p_source_doc_id UUID,
    p_related_doc_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
    -- Update impression count for each displayed related article
    UPDATE related_articles
    SET impression_count = impression_count + 1,
        click_through_rate = click_count::DECIMAL / GREATEST(impression_count + 1, 1)
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = ANY(p_related_doc_ids);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. BACKFILL EXISTING ARTICLES
-- ============================================================================

-- This will be run once after migration to compute initial relationships
-- Run this manually or via a scheduled job after deploying the migration

-- Example: SELECT refresh_related_articles(id) FROM documents WHERE is_deleted = FALSE AND status = 'published';

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE related_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_article_clicks ENABLE ROW LEVEL SECURITY;

-- Everyone can read related articles
CREATE POLICY "Anyone can view related articles"
ON related_articles FOR SELECT
USING (true);

-- Only authenticated users can track clicks
CREATE POLICY "Authenticated users can track clicks"
ON related_article_clicks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view their own click history
CREATE POLICY "Users can view own clicks"
ON related_article_clicks FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE related_articles IS 'Pre-computed related article relationships with multi-factor scoring';
COMMENT ON TABLE related_article_clicks IS 'Behavioral tracking for related article click-through analytics';
COMMENT ON FUNCTION compute_article_relationships IS 'Calculates relevance scores for related articles using tags, category, department, content type, and behavioral data';
COMMENT ON FUNCTION refresh_related_articles IS 'Recomputes and stores top 10 related articles for a given document';
COMMENT ON FUNCTION track_related_article_click IS 'Records a click event and updates CTR metrics';
