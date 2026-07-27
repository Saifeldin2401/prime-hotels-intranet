-- ============================================================================
-- MIGRATION: add_commercial_crm_module
-- Adds a minimal Commercial/CRM MVP: accounts, leads, contracts. No email
-- sync or marketing automation -- manual pipeline tracking for a small
-- commercial team, matching the app's existing RLS conventions.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id),
  account_name text NOT NULL,
  industry text,
  contact_name text,
  contact_email text,
  contact_phone text,
  account_type text NOT NULL DEFAULT 'corporate' CHECK (account_type IN ('corporate','travel_agency','event_organizer','government','other')),
  status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('active','inactive','prospect')),
  notes text,
  owner_id uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.crm_accounts IS 'Corporate/commercial client accounts. property_id nullable: an account can be corporate-wide.';

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.crm_accounts(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  lead_name text NOT NULL,
  source text,
  estimated_value numeric,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','qualified','proposal','negotiation','won','lost')),
  expected_close_date date,
  owner_id uuid REFERENCES public.profiles(id),
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.crm_leads IS 'Sales opportunities/pipeline, optionally linked to an account.';

CREATE TABLE public.crm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  contract_name text NOT NULL,
  contract_value numeric,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','expired','terminated')),
  document_url text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.crm_contracts IS 'Signed agreements tied to a CRM account.';

CREATE INDEX idx_crm_accounts_property_id ON public.crm_accounts(property_id);
CREATE INDEX idx_crm_accounts_owner_id ON public.crm_accounts(owner_id);
CREATE INDEX idx_crm_accounts_created_by ON public.crm_accounts(created_by);
CREATE INDEX idx_crm_leads_account_id ON public.crm_leads(account_id);
CREATE INDEX idx_crm_leads_property_id ON public.crm_leads(property_id);
CREATE INDEX idx_crm_leads_owner_id ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_created_by ON public.crm_leads(created_by);
CREATE INDEX idx_crm_contracts_account_id ON public.crm_contracts(account_id);
CREATE INDEX idx_crm_contracts_property_id ON public.crm_contracts(property_id);
CREATE INDEX idx_crm_contracts_created_by ON public.crm_contracts(created_by);

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;

-- Commercial is a corporate/regional/property-management function -- not general staff.
CREATE POLICY crm_accounts_select ON public.crm_accounts FOR SELECT TO authenticated
  USING ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id)) OR owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_accounts_insert ON public.crm_accounts FOR INSERT TO authenticated
  WITH CHECK ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id)) AND created_by = (SELECT auth.uid()));
CREATE POLICY crm_accounts_update ON public.crm_accounts FOR UPDATE TO authenticated
  USING ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id)) OR owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_accounts_delete ON public.crm_accounts FOR DELETE TO authenticated
  USING (property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY crm_contracts_select ON public.crm_contracts FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_contracts_insert ON public.crm_contracts FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY crm_contracts_update ON public.crm_contracts FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY crm_contracts_delete ON public.crm_contracts FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER crm_accounts_set_updated_at BEFORE UPDATE ON public.crm_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER crm_leads_set_updated_at BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER crm_contracts_set_updated_at BEFORE UPDATE ON public.crm_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
