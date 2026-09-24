-- ============================================================================
-- MIGRATION: add_company_brand_hierarchy
-- Adds the Company -> Brand -> Property org tier (HOS P1 foundation).
-- Purely additive: new tables + nullable FK columns on properties. Nothing
-- existing is altered or restricted; all 9 current properties are backfilled
-- under one default company so no existing access breaks. RLS policies on
-- properties/departments/etc are NOT touched in this migration (that broader
-- scope retrofit is a separate follow-up phase, done after this foundation
-- lands and other concurrent table-consolidation work completes).
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21; this file
-- closes the repo/live migration drift for this specific change (see
-- docs/prd/00_system_grounding_report.md §0 for the broader drift context).
-- ============================================================================

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.companies IS 'Top of the org hierarchy: Company -> Brand -> Property. Added for multi-company HOS support; a single default company backfills all existing properties.';

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

COMMENT ON TABLE public.brands IS 'Optional brand tier under a company (e.g. multiple hotel brands under one operating company). A property may belong to a brand or sit directly under a company.';

CREATE INDEX idx_brands_company_id ON public.brands(company_id);

ALTER TABLE public.properties
  ADD COLUMN company_id uuid REFERENCES public.companies(id),
  ADD COLUMN brand_id uuid REFERENCES public.brands(id);

CREATE INDEX idx_properties_company_id ON public.properties(company_id);
CREATE INDEX idx_properties_brand_id ON public.properties(brand_id);

-- Backfill: one default company owns every existing property (additive-only,
-- preserves current single-company behavior exactly).
INSERT INTO public.companies (name, name_ar, code)
VALUES ('Prime Hotels Group', 'مجموعة برايم للفنادق', 'PHG');

UPDATE public.properties
SET company_id = (SELECT id FROM public.companies WHERE code = 'PHG');

-- RLS: mirror the existing properties_select_public / properties_modify_admin
-- pattern exactly, one level up the hierarchy (corporate_admin, not regional_admin,
-- since company/brand definition is a corporate-level action).
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select_public ON public.companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY companies_modify_admin ON public.companies
  FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

CREATE POLICY brands_select_public ON public.brands
  FOR SELECT TO authenticated USING (true);

CREATE POLICY brands_modify_admin ON public.brands
  FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER brands_set_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
