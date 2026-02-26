-- ============================================================================
-- Fix Documents Schema and Foreign Keys
-- Adds missing columns expected by the frontend and ensures FK naming
-- ============================================================================

-- Add missing columns to documents table
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Ensure foreign key constraint names are standard for PostgREST hits
-- This helps when joining with !constraint_name in Supabase select
DO $$ 
BEGIN
    -- Fix created_by FK
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_created_by_fkey') THEN
        -- Already exists, no action needed
    ELSE
        -- Try to add it or rename if it has a different default name
        BEGIN
            ALTER TABLE documents 
            ADD CONSTRAINT documents_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add documents_created_by_fkey constraint';
        END;
    END IF;

    -- Fix owner_id FK
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_owner_id_fkey') THEN
        -- Already exists
    ELSE
        BEGIN
            ALTER TABLE documents 
            ADD CONSTRAINT documents_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add documents_owner_id_fkey constraint';
        END;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE is_deleted = TRUE;

-- Add comments
COMMENT ON COLUMN documents.deleted_at IS 'Timestamp when the document was soft-deleted';
COMMENT ON COLUMN documents.file_size IS 'Size of the document file in bytes';
COMMENT ON COLUMN documents.file_type IS 'Mime type or category of the file (e.g. pdf, image, doc)';;
