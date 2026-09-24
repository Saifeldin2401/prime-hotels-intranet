
-- Follow-up pass using case/whitespace-tolerant detection (Postgres normalizes
-- an already-wrapped "(select auth.uid())" to "( SELECT auth.uid() AS uid)" on
-- storage, which the first pass's regex didn't recognize as already-fixed).
-- Catches genuinely-unwrapped policies the first pass's stricter regex missed
-- (e.g. wizard_user_progress) without touching already-wrapped ones.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_with_check text;
  roles_sql text;
  fixed_count int := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual is not null and qual ~* 'auth\.(uid|jwt)\(\)' and qual !~* 'select\s+auth\.(uid|jwt)\(\)')
        or (with_check is not null and with_check ~* 'auth\.(uid|jwt)\(\)' and with_check !~* 'select\s+auth\.(uid|jwt)\(\)')
      )
  LOOP
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_qual := regexp_replace(new_qual, '(?<!select )auth\.jwt\(\)', '(select auth.jwt())', 'gi');
    END IF;
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_with_check := regexp_replace(new_with_check, '(?<!select )auth\.jwt\(\)', '(select auth.jwt())', 'gi');
    END IF;

    roles_sql := array_to_string(pol.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      pol.policyname, pol.schemaname, pol.tablename,
      CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      pol.cmd, roles_sql,
      CASE WHEN new_qual IS NOT NULL THEN format(' USING (%s)', new_qual) ELSE '' END,
      CASE WHEN new_with_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_with_check) ELSE '' END
    );
    fixed_count := fixed_count + 1;
  END LOOP;
  RAISE NOTICE 'Wrapped % additional policies', fixed_count;
END $$;
