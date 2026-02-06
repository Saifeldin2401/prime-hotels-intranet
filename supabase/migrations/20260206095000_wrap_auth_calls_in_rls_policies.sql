-- Performance: wrap auth.*() calls in RLS policies with (select ...) to avoid per-row evaluation

DO $pol$
DECLARE
  r RECORD;
  rel_oid OID;
  role_list TEXT;
  cmd_var TEXT;
  using_expr TEXT;
  check_expr TEXT;
  new_using TEXT;
  new_check TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, roles, cmd AS policy_cmd
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    SELECT c.oid INTO rel_oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.schemaname
      AND c.relname = r.tablename;

    CONTINUE WHEN rel_oid IS NULL;

    SELECT
      pg_get_expr(p.polqual, p.polrelid),
      pg_get_expr(p.polwithcheck, p.polrelid)
    INTO using_expr, check_expr
    FROM pg_policy p
    WHERE p.polname = r.policyname
      AND p.polrelid = rel_oid;

    CONTINUE WHEN using_expr IS NULL AND check_expr IS NULL;

    -- Only rewrite if any auth calls remain unwrapped
    IF (using_expr IS NULL OR (
          using_expr NOT ILIKE '%auth.uid()%' AND
          using_expr NOT ILIKE '%auth.role()%' AND
          using_expr NOT ILIKE '%auth.jwt()%'
        ))
       AND (check_expr IS NULL OR (
          check_expr NOT ILIKE '%auth.uid()%' AND
          check_expr NOT ILIKE '%auth.role()%' AND
          check_expr NOT ILIKE '%auth.jwt()%'
        )) THEN
      CONTINUE;
    END IF;

    -- Rewrite via plain replace (reliable)
    new_using := using_expr;
    new_check := check_expr;

    IF new_using IS NOT NULL THEN
      new_using := replace(new_using, 'auth.uid()', '(select auth.uid())');
      new_using := replace(new_using, 'auth.role()', '(select auth.role())');
      new_using := replace(new_using, 'auth.jwt()', '(select auth.jwt())');
      -- normalize double wrapping
      new_using := replace(new_using, '(select (select auth.uid()))', '(select auth.uid())');
      new_using := replace(new_using, '(select (select auth.role()))', '(select auth.role())');
      new_using := replace(new_using, '(select (select auth.jwt()))', '(select auth.jwt())');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, 'auth.role()', '(select auth.role())');
      new_check := replace(new_check, 'auth.jwt()', '(select auth.jwt())');
      -- normalize double wrapping
      new_check := replace(new_check, '(select (select auth.uid()))', '(select auth.uid())');
      new_check := replace(new_check, '(select (select auth.role()))', '(select auth.role())');
      new_check := replace(new_check, '(select (select auth.jwt()))', '(select auth.jwt())');
    END IF;

    -- If nothing changed, skip
    IF new_using IS NOT DISTINCT FROM using_expr AND new_check IS NOT DISTINCT FROM check_expr THEN
      CONTINUE;
    END IF;

    role_list := array_to_string(
      ARRAY(SELECT quote_ident(x) FROM unnest(r.roles) AS x),
      ', '
    );

    cmd_var := r.policy_cmd;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    IF cmd_var = 'ALL' THEN
      IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using, new_check);
      ELSIF new_using IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using);
      ELSIF new_check IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_check);
      END IF;
    ELSIF cmd_var = 'SELECT' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename, role_list, coalesce(new_using, 'true'));
    ELSIF cmd_var = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, role_list, coalesce(new_check, 'true'));
    ELSIF cmd_var = 'UPDATE' THEN
      IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using, new_check);
      ELSIF new_using IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using);
      ELSE
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, coalesce(new_check, 'true'));
      END IF;
    ELSIF cmd_var = 'DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename, role_list, coalesce(new_using, 'true'));
    END IF;
  END LOOP;
END;
$pol$;
