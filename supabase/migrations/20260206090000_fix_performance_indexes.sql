-- Performance: add missing foreign key indexes and drop duplicate indexes (public schema)

-- ============================================================================
-- Add missing FK indexes
-- ============================================================================

DO $idx$
DECLARE
  r RECORD;
  idx_name TEXT;
  cols_sql TEXT;
BEGIN
  FOR r IN
    WITH fkeys AS (
      SELECT
        c.oid AS constraint_oid,
        c.conrelid AS table_oid,
        c.conname AS constraint_name,
        c.conkey AS key_cols
      FROM pg_constraint c
      JOIN pg_namespace ns ON ns.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
    ), fkey_cols AS (
      SELECT
        f.constraint_oid,
        f.table_oid,
        f.constraint_name,
        a.attname AS col_name,
        a.attnum AS attnum,
        ord.ordinality AS col_pos
      FROM fkeys f
      JOIN unnest(f.key_cols) WITH ORDINALITY AS ord(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = f.table_oid AND a.attnum = ord.attnum
    ), fkey_grouped AS (
      SELECT
        constraint_oid,
        table_oid,
        constraint_name,
        array_agg(attnum::int ORDER BY col_pos) AS attnums,
        array_agg(col_name ORDER BY col_pos) AS col_names
      FROM fkey_cols
      GROUP BY 1, 2, 3
    ), indexed AS (
      SELECT
        i.indrelid AS table_oid,
        i.indkey::int[] AS indkey
      FROM pg_index i
      WHERE i.indisvalid AND i.indisready
    ), missing AS (
      SELECT
        fg.table_oid,
        fg.constraint_name,
        fg.attnums,
        fg.col_names
      FROM fkey_grouped fg
      WHERE NOT EXISTS (
        SELECT 1
        FROM indexed ix
        WHERE ix.table_oid = fg.table_oid
          AND ix.indkey[1:array_length(fg.attnums, 1)] = fg.attnums
      )
    )
    SELECT
      missing.constraint_name,
      missing.col_names,
      missing.table_oid::regclass::text AS table_name
    FROM missing
    ORDER BY table_name, constraint_name
  LOOP
    cols_sql := array_to_string(ARRAY(
      SELECT quote_ident(c) FROM unnest(r.col_names) AS c
    ), ', ');

    -- Stable, deterministic index name (avoid >63 chars)
    idx_name := 'idx_' || replace(split_part(r.table_name, '.', 2), '"', '') || '_' || left(md5(r.table_name || cols_sql), 12);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', idx_name, r.table_name, cols_sql);
  END LOOP;
END;
$idx$;

-- ============================================================================
-- Drop duplicate indexes safely
-- Strategy:
-- - Never drop PRIMARY KEY indexes.
-- - If a duplicate group contains any UNIQUE index, keep the UNIQUE one and drop the non-unique duplicates.
-- - Otherwise, keep the lexicographically first index name and drop the rest.
-- ============================================================================

DO $dup$
DECLARE
  g RECORD;
  keep_name TEXT;
  drop_name TEXT;
BEGIN
  FOR g IN
    WITH idx AS (
      SELECT
        i.indexrelid,
        i.indrelid AS table_oid,
        i.indkey::int[] AS indkey,
        coalesce(pg_get_expr(i.indpred, i.indrelid), '') AS predicate,
        i.indisunique,
        i.indisprimary,
        i.indisvalid,
        c.relname AS index_name,
        t.relname AS table_name,
        n.nspname AS schema_name
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND i.indisvalid
    ), groups AS (
      SELECT
        schema_name,
        table_name,
        indkey,
        predicate,
        array_agg(jsonb_build_object(
          'index_name', index_name,
          'is_unique', indisunique,
          'is_primary', indisprimary
        ) ORDER BY index_name) AS indexes
      FROM idx
      WHERE NOT indisprimary
      GROUP BY 1, 2, 3, 4
      HAVING count(*) > 1
    )
    SELECT * FROM groups
  LOOP
    -- Choose keep index
    SELECT (x->>'index_name')
    INTO keep_name
    FROM unnest(g.indexes) AS x
    WHERE (x->>'is_unique')::boolean = true
    ORDER BY (x->>'index_name')
    LIMIT 1;

    IF keep_name IS NULL THEN
      SELECT (x->>'index_name')
      INTO keep_name
      FROM unnest(g.indexes) AS x
      ORDER BY (x->>'index_name')
      LIMIT 1;
    END IF;

    -- Drop others
    FOR drop_name IN
      SELECT (x->>'index_name')
      FROM unnest(g.indexes) AS x
      WHERE (x->>'index_name') <> keep_name
    LOOP
      EXECUTE format('DROP INDEX IF EXISTS %I.%I', g.schema_name, drop_name);
    END LOOP;
  END LOOP;
END;
$dup$;
