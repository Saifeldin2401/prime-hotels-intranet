-- Rename the FDW table created by the Supabase Dashboard to remove spaces
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.foreign_tables 
        WHERE foreign_table_schema = 'public' AND foreign_table_name = 'slack users'
    ) THEN
        ALTER FOREIGN TABLE public."slack users" RENAME TO slack_users;
    END IF;
END $$;
