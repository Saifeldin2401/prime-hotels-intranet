
-- §3/§13: `companies` (the old HOS company tier) was dropped but brands.company_id
-- stayed NOT NULL with no FK — it blocked brand creation during tenant onboarding.
-- Make it nullable (non-destructive; full column removal deferred to the dead-code sweep).
ALTER TABLE public.brands ALTER COLUMN company_id DROP NOT NULL;
COMMENT ON COLUMN public.brands.company_id IS 'DEPRECATED legacy column (companies table removed). Nullable; drop in dead-code sweep. Use organization_id.';
