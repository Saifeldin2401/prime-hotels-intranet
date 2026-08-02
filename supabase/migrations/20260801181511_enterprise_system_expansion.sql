-- ====================================================================
-- ALTUS Connect: Enterprise ERP & Operations Module Expansion Migration
-- Description: Adds tables for Finance ERP (GL Journal Entries, ZATCA Tax Returns, Month-End Closes),
--              Operations Command (Housekeeping Dispatch, Preventive Maintenance, VIP Preferences),
--              HR & KSA Labor ERP (EOSB Calculations, Nitaqat Saudization, Overtime Matrix),
--              Supply Chain ERP (GRNs, Inventory Reorder Triggers, Supplier Scorecards).
-- Date: 2026-08-01
-- ====================================================================

-- 1. FINANCE ERP: Journal Entries & Lines
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number TEXT UNIQUE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    posting_status TEXT NOT NULL DEFAULT 'posted' CHECK (posting_status IN ('draft', 'posted', 'reversed')),
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    gl_account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT
);

-- 2. FINANCE ERP: ZATCA Phase 2 Tax Returns
CREATE TABLE IF NOT EXISTS public.tax_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    period_name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    taxable_sales_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_collected_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_purchases_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_paid_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_vat_due_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    zatca_submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (zatca_submission_status IN ('draft', 'submitted', 'accepted', 'query')),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FINANCE ERP: Fiscal Period Closes
CREATE TABLE IF NOT EXISTS public.fiscal_period_closes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    fiscal_month INT NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing_in_progress', 'locked')),
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE (property_id, fiscal_year, fiscal_month)
);

-- 4. OPERATIONS COMMAND: Housekeeping Dispatch
CREATE TABLE IF NOT EXISTS public.housekeeping_dispatch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    attendant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority_score INT NOT NULL DEFAULT 1,
    estimated_minutes INT NOT NULL DEFAULT 30,
    dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'in_progress', 'completed', 'bypassed')),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. OPERATIONS COMMAND: Preventive Maintenance Schedules
CREATE TABLE IF NOT EXISTS public.preventive_maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    location TEXT NOT NULL,
    frequency_days INT NOT NULL DEFAULT 30,
    last_serviced_at DATE,
    next_due_date DATE NOT NULL,
    assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'overdue', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. OPERATIONS COMMAND: VIP Guest Preferences Matrix
CREATE TABLE IF NOT EXISTS public.vip_guest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    vip_tier TEXT NOT NULL CHECK (vip_tier IN ('v1', 'v2', 'v3', 'royal', 'diplomatic')),
    preferred_room_features TEXT[] DEFAULT '{}',
    dietary_requirements TEXT,
    pillow_preference TEXT,
    lifetime_spend_sar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    special_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. HR ERP: KSA Labor Law End-of-Service Benefits (EOSB)
CREATE TABLE IF NOT EXISTS public.eosb_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hire_date DATE NOT NULL,
    termination_date DATE NOT NULL,
    termination_reason TEXT NOT NULL CHECK (termination_reason IN ('resignation', 'contract_expiry', 'employer_termination', 'force_majeure')),
    years_of_service NUMERIC(4, 2) NOT NULL,
    basic_salary_sar NUMERIC(12, 2) NOT NULL,
    housing_allowance_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transport_allowance_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_eosb_sar NUMERIC(12, 2) NOT NULL,
    calculation_status TEXT NOT NULL DEFAULT 'draft' CHECK (calculation_status IN ('draft', 'approved', 'disbursed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. HR ERP: Nitaqat Saudization Snapshots
CREATE TABLE IF NOT EXISTS public.saudization_nitaqat_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    saudi_count INT NOT NULL DEFAULT 0,
    non_saudi_count INT NOT NULL DEFAULT 0,
    saudization_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    nitaqat_zone TEXT NOT NULL CHECK (nitaqat_zone IN ('red', 'yellow', 'low_green', 'mid_green', 'high_green', 'platinum')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SUPPLY CHAIN ERP: Goods Received Notes (GRN) 3-Way Matching
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number TEXT UNIQUE NOT NULL,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspection_status TEXT NOT NULL DEFAULT 'passed' CHECK (inspection_status IN ('pending', 'passed', 'partially_rejected', 'rejected')),
    matching_status TEXT NOT NULL DEFAULT 'matched' CHECK (matching_status IN ('unmatched', 'matched', 'variance_flagged')),
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SUPPLY CHAIN ERP: Supplier Scorecards
CREATE TABLE IF NOT EXISTS public.supplier_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    evaluation_period TEXT NOT NULL,
    delivery_timeliness_score NUMERIC(5, 2) NOT NULL CHECK (delivery_timeliness_score BETWEEN 0 AND 100),
    quality_score NUMERIC(5, 2) NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
    price_score NUMERIC(5, 2) NOT NULL CHECK (price_score BETWEEN 0 AND 100),
    overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all newly created tables
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_period_closes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eosb_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saudization_nitaqat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_scorecards ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Authenticated Users
CREATE POLICY "Authenticated users can read journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read journal_entry_lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage journal_entry_lines" ON public.journal_entry_lines FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read tax_returns" ON public.tax_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage tax_returns" ON public.tax_returns FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read fiscal_period_closes" ON public.fiscal_period_closes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage fiscal_period_closes" ON public.fiscal_period_closes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read housekeeping_dispatch" ON public.housekeeping_dispatch FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage housekeeping_dispatch" ON public.housekeeping_dispatch FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read preventive_maintenance_schedules" ON public.preventive_maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage preventive_maintenance_schedules" ON public.preventive_maintenance_schedules FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read vip_guest_preferences" ON public.vip_guest_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage vip_guest_preferences" ON public.vip_guest_preferences FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read eosb_calculations" ON public.eosb_calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage eosb_calculations" ON public.eosb_calculations FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read saudization_nitaqat_snapshots" ON public.saudization_nitaqat_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage saudization_nitaqat_snapshots" ON public.saudization_nitaqat_snapshots FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read goods_received_notes" ON public.goods_received_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage goods_received_notes" ON public.goods_received_notes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read supplier_scorecards" ON public.supplier_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage supplier_scorecards" ON public.supplier_scorecards FOR ALL TO authenticated USING (true);

-- Seed Sample Enterprise Records for Demonstration
INSERT INTO public.journal_entries (entry_number, description, posting_status, total_debit, total_credit)
VALUES
('JE-2026-001', 'Monthly Room Revenue GL Auto-Posting', 'posted', 450000.00, 450000.00),
('JE-2026-002', 'Procurement PO #PO-8842 Inventory Auto-Posting', 'posted', 85000.00, 85000.00)
ON CONFLICT (entry_number) DO NOTHING;

INSERT INTO public.tax_returns (period_name, period_start, period_end, taxable_sales_sar, vat_collected_sar, taxable_purchases_sar, vat_paid_sar, net_vat_due_sar, zatca_submission_status)
VALUES
('Q1 2026 ZATCA VAT Return', '2026-01-01', '2026-03-31', 1250000.00, 187500.00, 450000.00, 67500.00, 120000.00, 'accepted')
ON CONFLICT DO NOTHING;

INSERT INTO public.vip_guest_preferences (guest_name, vip_tier, preferred_room_features, dietary_requirements, pillow_preference, lifetime_spend_sar, special_notes)
VALUES
('H.E. Sheikh Al-Maktoum', 'royal', ARRAY['High Floor', 'Sea View', 'Executive Suite'], 'Gluten-Free, Halal Only', 'Feather Pillow', 285000.00, 'Requires butler service and private elevator protocol.'),
('Dr. Tariq Al-Mansoor', 'v1', ARRAY['Quiet Room', 'King Bed'], 'Low Sodium', 'Memory Foam', 64000.00, 'Late checkout pre-approved up to 4 PM.')
ON CONFLICT DO NOTHING;
