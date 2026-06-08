-- Fix remaining performance warnings: auth_rls_initplan and multiple_permissive_policies

-- ============================================================================
-- Fix auth_rls_initplan: Rewrite policies to wrap auth functions in (select ...)
-- This makes auth.uid() and auth.jwt() evaluate once per statement, not per row
-- ============================================================================

DO $fix_auth$
DECLARE
  pol RECORD;
  role_list TEXT;
  using_expr TEXT;
  check_expr TEXT;
  new_using TEXT;
  new_check TEXT;
  rel_oid OID;
BEGIN
  FOR pol IN
    SELECT
      schemaname,
      tablename,
      policyname,
      roles,
      cmd
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    -- Get the relation OID
    SELECT c.oid INTO rel_oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = pol.schemaname
      AND c.relname = pol.tablename;
    
    -- Skip if no relation found
    CONTINUE WHEN rel_oid IS NULL;
    
    -- Get policy expressions from pg_policy
    SELECT 
      pg_get_expr(pol2.polqual, pol2.polrelid),
      pg_get_expr(pol2.polwithcheck, pol2.polrelid)
    INTO using_expr, check_expr
    FROM pg_policy pol2
    WHERE pol2.polname = pol.policyname
      AND pol2.polrelid = rel_oid;
    
    -- Skip if no auth functions found or already wrapped
    CONTINUE WHEN using_expr IS NULL AND check_expr IS NULL;
    CONTINUE WHEN (using_expr IS NULL OR using_expr !~* 'auth\.(uid|jwt)') 
                AND (check_expr IS NULL OR check_expr !~* 'auth\.(uid|jwt)');
    CONTINUE WHEN (using_expr IS NOT NULL AND (
                  using_expr ILIKE '%(select auth.%' OR
                  using_expr ILIKE '%select auth.uid%' OR
                  using_expr ILIKE '%select auth.jwt%'
                ))
                OR (check_expr IS NOT NULL AND (
                  check_expr ILIKE '%(select auth.%' OR
                  check_expr ILIKE '%select auth.uid%' OR
                  check_expr ILIKE '%select auth.jwt%'
                ));
    
    -- Build role list
    role_list := array_to_string(
      ARRAY(SELECT quote_ident(x) FROM unnest(pol.roles) AS x),
      ', '
    );
    
    -- Wrap auth functions
    new_using := using_expr;
    new_check := check_expr;
    
    IF new_using IS NOT NULL AND new_using ~* 'auth\.(uid|jwt)' THEN
      new_using := regexp_replace(new_using, '\yauth\.uid\s*\(', '(select auth.uid())', 'gi');
      new_using := regexp_replace(new_using, '\yauth\.jwt\s*\(', '(select auth.jwt())', 'gi');
    END IF;
    
    IF new_check IS NOT NULL AND new_check ~* 'auth\.(uid|jwt)' THEN
      new_check := regexp_replace(new_check, '\yauth\.uid\s*\(', '(select auth.uid())', 'gi');
      new_check := regexp_replace(new_check, '\yauth\.jwt\s*\(', '(select auth.jwt())', 'gi');
    END IF;
    
    -- Drop and recreate
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    
    -- Recreate based on command type
    CASE pol.cmd
      WHEN 'ALL' THEN
        IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_using, new_check);
        ELSIF new_using IS NOT NULL THEN
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_using);
        ELSIF new_check IS NOT NULL THEN
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO %s WITH CHECK (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_check);
        END IF;
      WHEN 'SELECT' THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
          pol.policyname, pol.schemaname, pol.tablename, role_list, new_using);
      WHEN 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
          pol.policyname, pol.schemaname, pol.tablename, role_list, new_check);
      WHEN 'UPDATE' THEN
        IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_using, new_check);
        ELSIF new_using IS NOT NULL THEN
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_using);
        ELSE
          EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s WITH CHECK (%s)',
            pol.policyname, pol.schemaname, pol.tablename, role_list, new_check);
        END IF;
      WHEN 'DELETE' THEN
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
          pol.policyname, pol.schemaname, pol.tablename, role_list, new_using);
    END CASE;
  END LOOP;
END;
$fix_auth$;

-- ============================================================================
-- Fix multiple_permissive_policies: Consolidate overlapping policies
-- ============================================================================

DO $consolidate$
DECLARE
  grp RECORD;
  pol RECORD;
  policies TEXT[];
  pol_name TEXT;
  combined_using TEXT;
  combined_check TEXT;
  first_role_list TEXT;
  rel_oid OID;
  using_expr TEXT;
  check_expr TEXT;
BEGIN
  -- Find groups of multiple permissive policies for same table/role/cmd
  FOR grp IN
    SELECT
      schemaname,
      tablename,
      roles,
      cmd,
      array_agg(policyname ORDER BY policyname) as policy_names,
      count(*) as cnt
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename, roles, cmd
    HAVING count(*) > 1
  LOOP
    -- Get relation OID
    SELECT c.oid INTO rel_oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = grp.schemaname
      AND c.relname = grp.tablename;
    
    CONTINUE WHEN rel_oid IS NULL;
    
    -- Build combined expressions
    combined_using := NULL;
    combined_check := NULL;
    first_role_list := array_to_string(
      ARRAY(SELECT quote_ident(x) FROM unnest(grp.roles) AS x),
      ', '
    );
    
    -- Collect all expressions
    FOREACH pol_name IN ARRAY grp.policy_names
    LOOP
      -- Get expressions from pg_policy
      SELECT 
        pg_get_expr(pol2.polqual, pol2.polrelid),
        pg_get_expr(pol2.polwithcheck, pol2.polrelid)
      INTO using_expr, check_expr
      FROM pg_policy pol2
      WHERE pol2.polname = pol_name
        AND pol2.polrelid = rel_oid;
      
      IF using_expr IS NOT NULL THEN
        combined_using := coalesce(combined_using || ' OR ', '') || '(' || using_expr || ')';
      END IF;
      
      IF check_expr IS NOT NULL THEN
        combined_check := coalesce(combined_check || ' OR ', '') || '(' || check_expr || ')';
      END IF;
    END LOOP;
    
    -- Drop all old policies
    FOREACH pol_name IN ARRAY grp.policy_names
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_name, grp.schemaname, grp.tablename);
    END LOOP;
    
    -- Drop existing consolidated policy (idempotent safeguard)
    EXECUTE format('DROP POLICY IF EXISTS consolidated_%s_%s ON %I.%I',
      grp.tablename, lower(grp.cmd), grp.schemaname, grp.tablename);

    -- Create consolidated policy
    IF grp.cmd = 'ALL' THEN
      EXECUTE format('CREATE POLICY consolidated_%s_all ON %I.%I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
        grp.tablename, grp.schemaname, grp.tablename, first_role_list,
        coalesce(combined_using, 'true'),
        coalesce(combined_check, 'true'));
    ELSIF grp.cmd = 'SELECT' THEN
      EXECUTE format('CREATE POLICY consolidated_%s_select ON %I.%I FOR SELECT TO %s USING (%s)',
        grp.tablename, grp.schemaname, grp.tablename, first_role_list,
        coalesce(combined_using, 'true'));
    ELSIF grp.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY consolidated_%s_insert ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
        grp.tablename, grp.schemaname, grp.tablename, first_role_list,
        coalesce(combined_check, 'true'));
    ELSIF grp.cmd = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY consolidated_%s_update ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        grp.tablename, grp.schemaname, grp.tablename, first_role_list,
        coalesce(combined_using, 'true'),
        coalesce(combined_check, 'true'));
    ELSIF grp.cmd = 'DELETE' THEN
      EXECUTE format('CREATE POLICY consolidated_%s_delete ON %I.%I FOR DELETE TO %s USING (%s)',
        grp.tablename, grp.schemaname, grp.tablename, first_role_list,
        coalesce(combined_using, 'true'));
    END IF;
  END LOOP;
END;
$consolidate$;
;
