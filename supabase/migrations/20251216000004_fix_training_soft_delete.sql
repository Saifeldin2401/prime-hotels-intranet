/*
* Add soft delete and audit to training tables
* 
* Tables affected:
* - training_modules
* - training_assignments
* - training_quizzes
* - training_content_blocks
* - training_progress
*/

DO $$ 
DECLARE 
    tables TEXT[] := ARRAY[
        'training_modules', 
        'training_assignments', 
        'training_quizzes', 
        'training_content_blocks',
        'training_progress'
    ];
    tbl TEXT;
BEGIN 
    FOREACH tbl IN ARRAY tables LOOP 
        -- Add is_deleted column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = tbl 
            AND column_name = 'is_deleted'
        ) THEN 
            EXECUTE format('ALTER TABLE %I ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE', tbl);
        END IF;

        -- Create index on is_deleted
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_is_deleted ON %I(is_deleted)', tbl, tbl);

        -- Add audit trigger
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', tbl);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_audit_event()', tbl);
    END LOOP; 
END $$;
