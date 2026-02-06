-- Performance: fix auth_rls_initplan and drop exact-duplicate permissive policies safely

-- ============================================================================
-- Fix auth_rls_initplan
-- Wrap auth.*() and current_setting() calls in (select ...) in policy expressions
-- so they are evaluated once per statement, not per row.
-- ============================================================================

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

    IF (using_expr IS NULL OR (
          using_expr NOT ILIKE '%auth.uid()%' AND
          using_expr NOT ILIKE '%auth.jwt()%' AND
          using_expr NOT ILIKE '%auth.role()%'
        ))
       AND (check_expr IS NULL OR (
          check_expr NOT ILIKE '%auth.uid()%' AND
          check_expr NOT ILIKE '%auth.jwt()%' AND
          check_expr NOT ILIKE '%auth.role()%'
        )) THEN
      CONTINUE;
    END IF;

    IF (using_expr IS NOT NULL AND (
          using_expr ILIKE '%(select auth.uid())%' OR
          using_expr ILIKE '%(select auth.jwt())%' OR
          using_expr ILIKE '%(select auth.role())%'
        ))
       OR (check_expr IS NOT NULL AND (
          check_expr ILIKE '%(select auth.uid())%' OR
          check_expr ILIKE '%(select auth.jwt())%' OR
          check_expr ILIKE '%(select auth.role())%'
        )) THEN
      CONTINUE;
    END IF;

    new_using := using_expr;
    new_check := check_expr;

    IF new_using IS NOT NULL THEN
      new_using := regexp_replace(new_using, '\\yauth\\.uid\\s*\\(\\s*\\)', '(select auth.uid())', 'gi');
      new_using := regexp_replace(new_using, '\\yauth\\.role\\s*\\(\\s*\\)', '(select auth.role())', 'gi');
      new_using := regexp_replace(new_using, '\\yauth\\.jwt\\s*\\(\\s*\\)', '(select auth.jwt())', 'gi');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\\yauth\\.uid\\s*\\(\\s*\\)', '(select auth.uid())', 'gi');
      new_check := regexp_replace(new_check, '\\yauth\\.role\\s*\\(\\s*\\)', '(select auth.role())', 'gi');
      new_check := regexp_replace(new_check, '\\yauth\\.jwt\\s*\\(\\s*\\)', '(select auth.jwt())', 'gi');
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

-- ============================================================================
-- Drop exact duplicate permissive policies (same table, roles, cmd, USING, WITH CHECK)
-- Keeps one policy and drops the rest. This is behavior-preserving.
-- ============================================================================

DO $dup$
DECLARE
  g RECORD;
  keep_policy TEXT;
  drop_policy TEXT;
BEGIN
  FOR g IN
    WITH pols AS (
      SELECT
        p.schemaname,
        p.tablename,
        p.policyname,
        p.roles,
        p.cmd,
        coalesce(p.qual, '') as qual,
        coalesce(p.with_check, '') as with_check
      FROM pg_policies p
      WHERE p.schemaname = 'public'
    ), grp AS (
      SELECT
        schemaname,
        tablename,
        roles,
        cmd,
        qual,
        with_check,
        array_agg(policyname order by policyname) as policy_names,
        count(*) as cnt
      FROM pols
      GROUP BY 1,2,3,4,5,6
      HAVING count(*) > 1
    )
    SELECT * FROM grp
  LOOP
    keep_policy := g.policy_names[1];

    FOREACH drop_policy IN ARRAY g.policy_names[2:array_length(g.policy_names,1)]
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', drop_policy, g.schemaname, g.tablename);
    END LOOP;
  END LOOP;
END;
$dup$;
