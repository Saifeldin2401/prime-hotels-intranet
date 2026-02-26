-- Migration: Add Soft Delete to Core Tables
-- Description: Adds is_deleted column and RLS handling for safe deletion

-- List of tables to update
-- profiles, properties, departments, tasks, maintenance_tickets, job_postings
-- documents, sop_documents, learning_quizzes

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'properties', 'departments', 'profiles', 
        'tasks', 'maintenance_tickets', 'job_postings',
        'documents', 'sop_documents', 'learning_quizzes',
        'learning_assignments', 'leave_requests', 'employee_promotions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Add is_deleted column
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE', tbl);
        
        -- Add index for performance
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_is_deleted ON %I(is_deleted) WHERE is_deleted = FALSE', tbl, tbl);
    END LOOP;
END $$;

-- Attach audit trigger to these tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'properties', 'departments', 'profiles', 
        'tasks', 'maintenance_tickets', 'job_postings',
        'documents', 'sop_documents', 'learning_quizzes',
        'leave_requests'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_audit_event()', tbl, tbl);
    END LOOP;
END $$;;
