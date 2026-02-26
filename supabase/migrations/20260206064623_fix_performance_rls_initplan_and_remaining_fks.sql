-- Performance: fix remaining unindexed foreign keys and reduce auth RLS initplan overhead

-- ============================================================================
-- Remaining unindexed FK fixes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sop_feedback_user_id ON public.sop_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON public.user_skills(skill_id);

-- ============================================================================
-- auth_rls_initplan fixes
-- Wrap auth.uid() / auth.jwt() calls in (select ...) in RLS policies so they are
-- evaluated once per statement, not once per row.
--
-- This applies only to policies in public schema.
-- ============================================================================

DO $pol$
DECLARE
  r RECORD;
  role_list TEXT;
  cmd TEXT;
  using_expr TEXT;
  check_expr TEXT;
  new_using TEXT;
  new_check TEXT;
BEGIN
  FOR r IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.roles,
      p.cmd,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
    FROM pg_policies p
    JOIN pg_policy pol ON pol.polname = p.policyname
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.schemaname = 'public'
      AND (
        (pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%auth.uid()%' AND pg_get_expr(pol.polqual, pol.polrelid) NOT ILIKE '%select auth.uid()%' )
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%auth.uid()%' AND pg_get_expr(pol.polwithcheck, pol.polrelid) NOT ILIKE '%select auth.uid()%' )
        OR
        (pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%auth.jwt()%' AND pg_get_expr(pol.polqual, pol.polrelid) NOT ILIKE '%select auth.jwt()%' )
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%auth.jwt()%' AND pg_get_expr(pol.polwithcheck, pol.polrelid) NOT ILIKE '%select auth.jwt()%' )
      )
  LOOP
    -- roles is text[] like {authenticated,anon,public}
    role_list := array_to_string(
      ARRAY(
        SELECT quote_ident(x)
        FROM unnest(r.roles) AS x
      ),
      ', '
    );

    cmd := r.cmd;
    using_expr := r.using_expr;
    check_expr := r.check_expr;

    -- Rewrite expressions
    new_using := using_expr;
    new_check := check_expr;

    IF new_using IS NOT NULL THEN
      new_using := replace(new_using, 'auth.uid()', '(select auth.uid())');
      new_using := replace(new_using, '(select (select auth.uid()))', '(select auth.uid())');
      new_using := replace(new_using, 'auth.jwt()', '(select auth.jwt())');
      new_using := replace(new_using, '(select (select auth.jwt()))', '(select auth.jwt())');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, '(select (select auth.uid()))', '(select auth.uid())');
      new_check := replace(new_check, 'auth.jwt()', '(select auth.jwt())');
      new_check := replace(new_check, '(select (select auth.jwt()))', '(select auth.jwt())');
    END IF;

    -- Drop and recreate policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    IF cmd = 'ALL' THEN
      IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using, new_check
        );
      ELSIF new_using IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR ALL TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using
        );
      ELSIF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR ALL TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_check
        );
      END IF;
    ELSE
      IF cmd = 'SELECT' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using
        );
      ELSIF cmd = 'INSERT' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_check
        );
      ELSIF cmd = 'UPDATE' THEN
        IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
            r.policyname, r.schemaname, r.tablename, role_list, new_using, new_check
          );
        ELSIF new_using IS NOT NULL THEN
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s)',
            r.policyname, r.schemaname, r.tablename, role_list, new_using
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR UPDATE TO %s WITH CHECK (%s)',
            r.policyname, r.schemaname, r.tablename, role_list, new_check
          );
        END IF;
      ELSIF cmd = 'DELETE' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename, role_list, new_using
        );
      END IF;
    END IF;
  END LOOP;
END;
$pol$;
;
