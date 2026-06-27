-- Maintainability: collapse groups of multiple PERMISSIVE SELECT policies that
-- share the same table + roles into a single policy. Permissive policies are
-- OR'd by Postgres, so USING = (p1 OR p2 OR ...) is access-IDENTICAL — this is a
-- pure simplification, not a permission change. Scope limited to SELECT/authenticated
-- groups (the unambiguously safe case); ALL-vs-specific overlaps are left untouched.
DO $do$
DECLARE
  g RECORD;
  pol RECORD;
  merged TEXT;
  newname TEXT;
BEGIN
  FOR g IN
    SELECT c.oid AS reloid, c.relname AS rel
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND p.polpermissive AND p.polcmd='r'
      AND p.polroles::text = (SELECT array_agg(oid)::text FROM pg_roles WHERE rolname='authenticated')
    GROUP BY c.oid, c.relname, p.polroles
    HAVING count(*) > 1
  LOOP
    merged := NULL;
    FOR pol IN
      SELECT p.polname, pg_get_expr(p.polqual, p.polrelid) AS q
      FROM pg_policy p
      WHERE p.polrelid = g.reloid AND p.polpermissive AND p.polcmd='r'
        AND p.polroles::text = (SELECT array_agg(oid)::text FROM pg_roles WHERE rolname='authenticated')
    LOOP
      IF pol.q IS NOT NULL THEN
        merged := CASE WHEN merged IS NULL THEN '(' || pol.q || ')' ELSE merged || ' OR (' || pol.q || ')' END;
      END IF;
      EXECUTE format('DROP POLICY %I ON public.%I', pol.polname, g.rel);
    END LOOP;

    IF merged IS NOT NULL THEN
      newname := g.rel || '_select_consolidated';
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', newname, g.rel, merged);
    END IF;
  END LOOP;
END $do$;
