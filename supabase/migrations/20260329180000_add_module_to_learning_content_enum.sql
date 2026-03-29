-- Migration: Add 'module' to learning_content_type enum
-- Created: 2026-03-29
-- Purpose: Fix 400 error when assigning training modules

-- Add 'module' value to learning_content_type enum if not exists
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
