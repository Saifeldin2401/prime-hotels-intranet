-- ============================================================================
-- §3 / §13 — the old HOS "companies" tier was removed, but `brands.company_id`
-- survived as a NOT NULL column with no foreign key and no code/policy/function
-- references. It blocked brand creation during tenant onboarding
-- ("Create Brand" step). Make it nullable — full column removal is deferred to
-- the dead-code sweep (also remove src/hooks/useCompanies.ts + /admin/companies).
-- ============================================================================

ALTER TABLE public.brands ALTER COLUMN company_id DROP NOT NULL;

COMMENT ON COLUMN public.brands.company_id IS
  'DEPRECATED legacy column (companies table removed). Nullable; drop in dead-code sweep. Use organization_id.';
