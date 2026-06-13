-- Performance: fix auth_rls_initplan by wrapping auth.*() and current_setting(...) in (select ...)

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

    -- Only touch policies that still contain auth.*() or current_setting(...)
    IF (using_expr IS NULL OR (
          using_expr NOT ILIKE '%auth.uid()%' AND
          using_expr NOT ILIKE '%auth.jwt()%' AND
          using_expr NOT ILIKE '%auth.role()%' AND
          using_expr NOT ILIKE '%current_setting(%'
        ))
       AND (check_expr IS NULL OR (
          check_expr NOT ILIKE '%auth.uid()%' AND
          check_expr NOT ILIKE '%auth.jwt()%' AND
          check_expr NOT ILIKE '%auth.role()%' AND
          check_expr NOT ILIKE '%current_setting(%'
        )) THEN
      CONTINUE;
    END IF;

    -- Skip if already wrapped
    IF (using_expr IS NOT NULL AND (
          using_expr ILIKE '%(select auth.uid())%' OR
          using_expr ILIKE '%(select auth.jwt())%' OR
          using_expr ILIKE '%(select auth.role())%' OR
          using_expr ILIKE '%(select current_setting(%'
        ))
       OR (check_expr IS NOT NULL AND (
          check_expr ILIKE '%(select auth.uid())%' OR
          check_expr ILIKE '%(select auth.jwt())%' OR
          check_expr ILIKE '%(select auth.role())%' OR
          check_expr ILIKE '%(select current_setting(%'
        )) THEN
      CONTINUE;
    END IF;

    new_using := using_expr;
    new_check := check_expr;

    IF new_using IS NOT NULL THEN
      new_using := regexp_replace(new_using, '\\yauth\\.uid\\s*\\(\\s*\\)', '(select auth.uid())', 'gi');
      new_using := regexp_replace(new_using, '\\yauth\\.role\\s*\\(\\s*\\)', '(select auth.role())', 'gi');
      new_using := regexp_replace(new_using, '\\yauth\\.jwt\\s*\\(\\s*\\)', '(select auth.jwt())', 'gi');
      new_using := regexp_replace(new_using, '\\ycurrent_setting\\s*\\(([^\\)]*)\\)', '(select current_setting(\\1))', 'gi');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\\yauth\\.uid\\s*\\(\\s*\\)', '(select auth.uid())', 'gi');
      new_check := regexp_replace(new_check, '\\yauth\\.role\\s*\\(\\s*\\)', '(select auth.role())', 'gi');
      new_check := regexp_replace(new_check, '\\yauth\\.jwt\\s*\\(\\s*\\)', '(select auth.jwt())', 'gi');
      new_check := regexp_replace(new_check, '\\ycurrent_setting\\s*\\(([^\\)]*)\\)', '(select current_setting(\\1))', 'gi');
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
;
