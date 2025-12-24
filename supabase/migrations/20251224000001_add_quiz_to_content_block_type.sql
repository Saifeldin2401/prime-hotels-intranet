DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'quiz'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'quiz';
    END IF;
END $$;
