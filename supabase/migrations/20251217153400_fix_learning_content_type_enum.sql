-- Migration: Fix Learning Content Type Enum for Training Modules
-- Add 'module' to learning_content_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'module' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'learning_content_type')
    ) THEN
        ALTER TYPE learning_content_type ADD VALUE 'module';
    END IF;
END $$;

-- Add optional FK reference to training_modules for module content
ALTER TABLE learning_progress 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;

-- Create index for faster module progress lookups
CREATE INDEX IF NOT EXISTS idx_learning_progress_module 
ON learning_progress(training_module_id) 
WHERE training_module_id IS NOT NULL;

-- Trigger to auto-populate training_module_id
CREATE OR REPLACE FUNCTION sync_learning_progress_module_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content_type = 'module' THEN
        NEW.training_module_id := NEW.content_id;
    ELSE
        NEW.training_module_id := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learning_progress_sync_module ON learning_progress;
CREATE TRIGGER learning_progress_sync_module
    BEFORE INSERT OR UPDATE ON learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION sync_learning_progress_module_id();

-- Backfill existing module progress records
UPDATE learning_progress
SET training_module_id = content_id::uuid
WHERE content_type = 'module' 
AND training_module_id IS NULL
AND content_id IS NOT NULL;

-- Index for learning_assignments module content
CREATE INDEX IF NOT EXISTS idx_learning_assignments_module_content
ON learning_assignments(content_id)
WHERE content_type = 'module';

-- Soft delete columns
ALTER TABLE learning_assignments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE learning_quizzes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Indexes for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_learning_assignments_active ON learning_assignments(id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_learning_progress_active ON learning_progress(id) WHERE is_deleted = FALSE;;
