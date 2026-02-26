-- Ensure related_articles table has all expected columns
DO $$
BEGIN
    -- Core scoring columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'shared_tags_count') THEN
        ALTER TABLE related_articles ADD COLUMN shared_tags_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'same_category') THEN
        ALTER TABLE related_articles ADD COLUMN same_category BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'same_department') THEN
        ALTER TABLE related_articles ADD COLUMN same_department BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'same_content_type') THEN
        ALTER TABLE related_articles ADD COLUMN same_content_type BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'behavioral_score') THEN
        ALTER TABLE related_articles ADD COLUMN behavioral_score DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Stats columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'click_count') THEN
        ALTER TABLE related_articles ADD COLUMN click_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'impression_count') THEN
        ALTER TABLE related_articles ADD COLUMN impression_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'click_through_rate') THEN
        ALTER TABLE related_articles ADD COLUMN click_through_rate DECIMAL(5,4) DEFAULT 0;
    END IF;

    -- Metadata columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'computed_at') THEN
        ALTER TABLE related_articles ADD COLUMN computed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'related_articles' AND column_name = 'last_clicked_at') THEN
        ALTER TABLE related_articles ADD COLUMN last_clicked_at TIMESTAMPTZ;
    END IF;
END $$;;
