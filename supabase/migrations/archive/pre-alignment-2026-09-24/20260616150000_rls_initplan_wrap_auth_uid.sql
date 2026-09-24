-- Performance (auth_rls_initplan): wrap bare auth.uid() in a scalar subselect so
-- it is evaluated once per query instead of once per row. Only touches policies
-- that still contained a bare auth.uid(); already-wrapped occurrences are preserved.
CREATE OR REPLACE FUNCTION pg_temp._wrap_auth_uid(expr text) RETURNS text
LANGUAGE sql AS $f$
  SELECT CASE WHEN expr IS NULL THEN NULL ELSE
    replace(
      replace(
        replace(expr, '( SELECT auth.uid() AS uid)', 'UIDWRAPTOKEN'),
        'auth.uid()', '( SELECT auth.uid() AS uid)'),
      'UIDWRAPTOKEN', '( SELECT auth.uid() AS uid)')
  END
$f$;

DO $do$
DECLARE
  r RECORD;
  v_using TEXT;
  v_check TEXT;
  v_sql TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS nsp, c.relname AS rel, p.polname AS pol,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),'')) LIKE '%auth.uid()%'
      AND ((length(COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),''))
            - length(replace(COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),''),'auth.uid()','')))
           / length('auth.uid()'))
        > ((length(COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),''))
            - length(replace(COALESCE(pg_get_expr(p.polqual,p.polrelid),'')||COALESCE(pg_get_expr(p.polwithcheck,p.polrelid),''),'( SELECT auth.uid()','')))
           / length('( SELECT auth.uid()'))
  LOOP
    v_using := pg_temp._wrap_auth_uid(r.using_expr);
    v_check := pg_temp._wrap_auth_uid(r.check_expr);

    v_sql := format('ALTER POLICY %I ON %I.%I', r.pol, r.nsp, r.rel);
    IF v_using IS NOT NULL THEN v_sql := v_sql || format(' USING (%s)', v_using); END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || format(' WITH CHECK (%s)', v_check); END IF;

    EXECUTE v_sql;
  END LOOP;
END $do$;
