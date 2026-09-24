
DO $$
DECLARE
  pol record;
  roles_sql text;
  cmd_name text;
BEGIN
  FOR pol IN
    SELECT a.schemaname, a.tablename, a.policyname, a.roles, a.qual, a.with_check, a.permissive
    FROM pg_policies a
    JOIN pg_policies s
      ON a.schemaname = s.schemaname AND a.tablename = s.tablename
      AND a.roles = s.roles AND a.cmd = 'ALL' AND s.cmd = 'SELECT'
      AND a.policyname <> s.policyname AND a.qual = s.qual
    WHERE a.schemaname = 'public'
  LOOP
    roles_sql := array_to_string(pol.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE']
    LOOP
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
        pol.policyname || '_' || lower(cmd_name),
        pol.schemaname,
        pol.tablename,
        CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        cmd_name,
        roles_sql,
        CASE WHEN cmd_name IN ('UPDATE','DELETE') AND pol.qual IS NOT NULL THEN format(' USING (%s)', pol.qual) ELSE '' END,
        CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN
          CASE WHEN pol.with_check IS NOT NULL THEN format(' WITH CHECK (%s)', pol.with_check)
               WHEN pol.qual IS NOT NULL THEN format(' WITH CHECK (%s)', pol.qual)
               ELSE '' END
        ELSE '' END
      );
    END LOOP;
  END LOOP;
END $$;
