
-- Fixes the auth_rls_initplan performance advisory (46 policies / 23 tables):
-- policies calling auth.uid()/auth.jwt() directly in USING/WITH CHECK force
-- per-row re-evaluation. Wrapping in (select ...) makes Postgres evaluate once
-- per statement instead. Purely mechanical text rewrite of the predicate -
-- same logical result, same roles, same command, same permissive/restrictive
-- type - nothing else about the policy changes.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_with_check text;
  roles_sql text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual ~ '(?<!\(select )auth\.(uid|jwt)\(\)')
        OR (with_check IS NOT NULL AND with_check ~ '(?<!\(select )auth\.(uid|jwt)\(\)')
      )
  LOOP
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '(?<!\(select )auth\.uid\(\)', '(select auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, '(?<!\(select )auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, '(?<!\(select )auth\.uid\(\)', '(select auth.uid())', 'g');
      new_with_check := regexp_replace(new_with_check, '(?<!\(select )auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;

    roles_sql := array_to_string(pol.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      pol.cmd,
      roles_sql,
      CASE WHEN new_qual IS NOT NULL THEN format(' USING (%s)', new_qual) ELSE '' END,
      CASE WHEN new_with_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_with_check) ELSE '' END
    );
  END LOOP;
END $$;
