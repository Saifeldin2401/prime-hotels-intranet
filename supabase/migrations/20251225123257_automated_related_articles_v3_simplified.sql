-- ============================================================================
-- Automated Related Articles System - Simplified (No Tags Dependency)
-- ============================================================================

-- 1. RELATED ARTICLES TABLE
CREATE TABLE IF NOT EXISTS related_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    same_category BOOLEAN DEFAULT FALSE,
    same_department BOOLEAN DEFAULT FALSE,
    same_content_type BOOLEAN DEFAULT FALSE,
    behavioral_score DECIMAL(5,2) DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4) DEFAULT 0,
    computed_at TIMESTAMP DEFAULT NOW(),
    last_clicked_at TIMESTAMP,
    UNIQUE(source_document_id, related_document_id),
    CHECK (source_document_id != related_document_id),
    CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_related_articles_source_v3 ON related_articles(source_document_id, relevance_score DESC);

-- 2. BEHAVIORAL TRACKING TABLE
CREATE TABLE IF NOT EXISTS related_article_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    clicked_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    clicked_at TIMESTAMP DEFAULT NOW(),
    position_in_list INTEGER,
    device_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_source_v3 ON related_article_clicks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_clicks_time_v3 ON related_article_clicks(clicked_at DESC);

-- 3. SCORING FUNCTION (Simplified)
CREATE OR REPLACE FUNCTION compute_article_relationships(target_doc_id UUID)
RETURNS TABLE(
    related_id UUID,
    score DECIMAL(5,2),
    same_cat BOOLEAN,
    same_dept BOOLEAN,
    same_type BOOLEAN
) AS $$
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
        LIMIT 100
    LOOP
        category_score := 0;
        dept_score := 0;
        type_score := 0;
        behavior_score := 0;
        
        -- 1. CATEGORY MATCHING (40% weight - increased since tags are gone)
        IF target_doc.category_id IS NOT NULL 
           AND candidate.category_id = target_doc.category_id THEN
            category_score := 40;
        END IF;
        
        -- 2. DEPARTMENT MATCHING (30% weight)
        IF target_doc.department_id IS NOT NULL 
           AND candidate.department_id = target_doc.department_id THEN
            dept_score := 30;
        END IF;
        
        -- 3. CONTENT TYPE MATCHING (20% weight)
        IF candidate.content_type = target_doc.content_type THEN
            type_score := 20;
        END IF;
        
        -- 4. BEHAVIORAL SCORE (10% weight)
        SELECT COUNT(DISTINCT user_id) * 2 INTO behavior_score
        FROM related_article_clicks
        WHERE source_document_id = target_doc_id
          AND clicked_document_id = candidate.id
        LIMIT 5;
        
        behavior_score := LEAST(behavior_score, 10);
        
        final_score := category_score + dept_score + type_score + behavior_score;
        
        IF final_score > 0 THEN
            RETURN QUERY SELECT 
                candidate.id,
                final_score,
                (category_score > 0),
                (dept_score > 0),
                (type_score > 0);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. REFRESH RELATIONSHIPS FUNCTION
CREATE OR REPLACE FUNCTION refresh_related_articles(target_doc_id UUID)
RETURNS INTEGER AS $$
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
            same_category,
            same_department,
            same_content_type,
            computed_at
        ) VALUES (
            target_doc_id,
            relationship.related_id,
            relationship.score,
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

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION trigger_refresh_related_on_document_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_related_articles(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_related_refresh ON documents;
CREATE TRIGGER documents_related_refresh
AFTER INSERT OR UPDATE OF title, description, category_id, department_id, content_type, status
ON documents
FOR EACH ROW
WHEN (NEW.is_deleted = FALSE AND NEW.status = 'PUBLISHED')
EXECUTE FUNCTION trigger_refresh_related_on_document_change();

-- 6. TRACKING FUNCTIONS
CREATE OR REPLACE FUNCTION track_related_article_click(
    p_source_doc_id UUID,
    p_clicked_doc_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_position INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
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
    
    UPDATE related_articles
    SET 
        click_count = click_count + 1,
        last_clicked_at = NOW(),
        click_through_rate = (click_count + 1)::DECIMAL / GREATEST(impression_count, 1)
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = p_clicked_doc_id;
      
    UPDATE related_articles
    SET relevance_score = LEAST(
        relevance_score + (click_through_rate * 5),
        100
    )
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = p_clicked_doc_id
      AND click_count > 3;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_related_article_impression(
    p_source_doc_id UUID,
    p_related_doc_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
    UPDATE related_articles
    SET impression_count = impression_count + 1,
        click_through_rate = click_count::DECIMAL / GREATEST(impression_count + 1, 1)
    WHERE source_document_id = p_source_doc_id
      AND related_document_id = ANY(p_related_doc_ids);
END;
$$ LANGUAGE plpgsql;

-- 7. RLS
ALTER TABLE related_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_article_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view related articles" ON related_articles;
CREATE POLICY "Anyone can view related articles"
ON related_articles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can track clicks" ON related_article_clicks;
CREATE POLICY "Authenticated users can track clicks"
ON related_article_clicks FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own clicks" ON related_article_clicks;
CREATE POLICY "Users can view own clicks"
ON related_article_clicks FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);
;
