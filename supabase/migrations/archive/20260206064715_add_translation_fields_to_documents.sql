-- Migration: Add translation fields to documents table
-- This enables bilingual support for all document types (SOPs, Policies, etc.)

DO $$ 
BEGIN
    -- 1. Add bilingual content fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title_ar') THEN
        ALTER TABLE documents ADD COLUMN title_ar TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'description_ar') THEN
        ALTER TABLE documents ADD COLUMN description_ar TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'content_ar') THEN
        ALTER TABLE documents ADD COLUMN content_ar TEXT;
    END IF;

    -- 2. Add translation metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'translation_status') THEN
        -- Create type if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'translation_status') THEN
            CREATE TYPE translation_status AS ENUM ('pending', 'automated', 'reviewed');
        END IF;
        
        ALTER TABLE documents ADD COLUMN translation_status translation_status DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_translated_at') THEN
        ALTER TABLE documents ADD COLUMN last_translated_at TIMESTAMPTZ;
    END IF;

    -- 3. Copy existing translations from sop_documents to documents for consistency (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sop_documents') THEN
        UPDATE documents d
        SET 
            title_ar = s.title_ar,
            description_ar = s.description_ar,
            translation_status = 'reviewed' -- Assuming existing manual translations are reviewed
        FROM sop_documents s
        WHERE d.id = s.id
        AND (d.title_ar IS NULL OR d.description_ar IS NULL);
    END IF;

END $$;
;
