-- Prime Connect is multi-tenant: new tenant-scoped records must be assigned
-- explicitly by the calling workflow, never silently to the historical seed
-- organization. Existing data is deliberately left untouched for a separately
-- audited data-classification pass.
DO $$
DECLARE
  column_record record;
BEGIN
  FOR column_record IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'organization_id'
      AND column_default LIKE '%e0000000-0000-0000-0000-000000000001%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
      column_record.table_name,
      column_record.column_name
    );
  END LOOP;
END $$;
