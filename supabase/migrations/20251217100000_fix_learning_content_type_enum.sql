-- Migration: Fix Learning Content Type Enum for Training Modules
-- This migration adds 'module' to the learning_content_type enum
-- to properly support training module assignments alongside quizzes

-- ============================================================================
-- FIX 1: Add 'module' to learning_content_type enum
-- ============================================================================

-- Check and add 'module' if it doesn't exist
DO $$ 
BEGIN
    -- Add 'module' to the enum if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'module' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'learning_content_type')
    ) THEN
        ALTER TYPE learning_content_type ADD VALUE 'module';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: Update learning_progress to support training_module references
-- ============================================================================

-- Add optional FK reference to training_modules for module content
-- This allows direct joins when content_type = 'module'
ALTER TABLE learning_progress 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;

-- Create index for faster module progress lookups
CREATE INDEX IF NOT EXISTS idx_learning_progress_module 
ON learning_progress(training_module_id) 
WHERE training_module_id IS NOT NULL;

-- ============================================================================
-- FIX 3: Add trigger to auto-populate training_module_id
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_learning_progress_module_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If content_type is 'module', set training_module_id from content_id
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

-- ============================================================================
-- FIX 4: Backfill existing module progress records
-- ============================================================================

UPDATE learning_progress
SET training_module_id = content_id::uuid
WHERE content_type = 'module' 
AND training_module_id IS NULL
AND content_id IS NOT NULL;

-- ============================================================================
-- FIX 5: Ensure learning_assignments has proper indexes for modules
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_learning_assignments_module_content
ON learning_assignments(content_id)
WHERE content_type = 'module';

-- ============================================================================
-- FIX 6: Add is_deleted to learning tables if missing
-- ============================================================================

ALTER TABLE learning_assignments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE learning_quizzes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_learning_assignments_active ON learning_assignments(id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_learning_progress_active ON learning_progress(id) WHERE is_deleted = FALSE;
