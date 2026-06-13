-- Add media types to training content block enum
-- Date: 2026-02-06

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'audio' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'audio';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'interactive' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'interactive';
    END IF;
END $$;
