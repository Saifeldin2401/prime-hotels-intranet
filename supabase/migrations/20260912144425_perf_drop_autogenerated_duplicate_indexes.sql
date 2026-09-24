
-- Fixes duplicate_index findings caused by an earlier "add missing FK index"
-- migration that didn't check for pre-existing manually-named indexes on the
-- same column. Drops only the auto-generated idx__<hash> index of a pair when
-- a differently-named index on the same table has a byte-identical definition
-- (normalized for the index name itself). Leaves ambiguous both-human-named
-- duplicate pairs untouched for manual review.
DO $$
DECLARE
  r record;
  norm_def text;
  dropped_count int := 0;
BEGIN
  FOR r IN
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname ~ '^idx__[0-9a-f]{12}$'
  LOOP
    norm_def := regexp_replace(r.indexdef, 'INDEX "?[a-zA-Z0-9_]+"? ON', 'INDEX ___ ON');

    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = r.tablename
        AND indexname <> r.indexname
        AND regexp_replace(indexdef, 'INDEX "?[a-zA-Z0-9_]+"? ON', 'INDEX ___ ON') = norm_def
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
      dropped_count := dropped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Dropped % auto-generated duplicate indexes', dropped_count;
END $$;
