DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT conname, relname FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE c.contype='c' AND t.relname IN ('tasks','maintenance_tickets','leave_requests','job_postings')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    END LOOP;
END $$;;
