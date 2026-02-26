-- Drop policies that reference status columns
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT polname, relname FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname IN ('tasks','maintenance_tickets','leave_requests','job_postings')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.polname, r.relname);
    END LOOP;
END $$;;
