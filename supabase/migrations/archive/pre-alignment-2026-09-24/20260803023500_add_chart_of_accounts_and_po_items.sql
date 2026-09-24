-- ============================================================================
-- MIGRATION: add_chart_of_accounts_and_po_items
-- Adds database-backed Chart of Accounts and Purchase Order Line Items
-- ============================================================================

-- 1. Chart of Accounts Table
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  account_name_ar text,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chart_of_accounts IS 'Master Chart of Accounts for financial classification and GL mapping.';

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY chart_of_accounts_select ON public.chart_of_accounts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY chart_of_accounts_modify ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'corporate_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'corporate_admin'::app_role));

-- Seed Default Hospitality Chart of Accounts
INSERT INTO public.chart_of_accounts (account_code, account_name, account_name_ar, account_type, category) VALUES
  ('GL-1000', 'Cash & Bank Equivalents', 'النقد وما في حكمه', 'asset', 'Current Assets'),
  ('GL-1200', 'Accounts Receivable', 'حسابات المدينين', 'asset', 'Current Assets'),
  ('GL-1400', 'Food & Beverage Inventory', 'مخزون الأغذية والمشروبات', 'asset', 'Inventory'),
  ('GL-2000', 'Accounts Payable', 'حسابات الدائنين', 'liability', 'Current Liabilities'),
  ('GL-2200', 'Accrued Salaries & Benefits', 'مستحقات الرواتب والبدلات', 'liability', 'Current Liabilities'),
  ('GL-4100', 'Food & Beverage Revenue / Expense', 'مصاريف وإيرادات الأغذية والمشروبات', 'expense', 'Operations'),
  ('GL-5200', 'Utilities & Energy', 'المنافع والمهام العامة', 'expense', 'Utilities'),
  ('GL-6100', 'Payroll & Benefits', 'الرواتب والمزايا', 'expense', 'Human Resources'),
  ('GL-7300', 'Maintenance & Repairs', 'الصيانة والإصلاحات', 'expense', 'Facilities'),
  ('GL-8100', 'Marketing & Sales', 'التسويق والمبيعات', 'expense', 'Sales & Marketing'),
  ('GL-9100', 'General Administration', 'الإدارة العامة', 'expense', 'Administrative')
ON CONFLICT (account_code) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  account_name_ar = EXCLUDED.account_name_ar,
  account_type = EXCLUDED.account_type,
  category = EXCLUDED.category;

-- 2. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_description text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.purchase_order_items IS 'Line-item breakdown for purchase orders.';

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(purchase_order_id);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY po_items_select ON public.purchase_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND (has_property_access((SELECT auth.uid()), po.property_id) OR po.created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY po_items_insert ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND (has_property_access((SELECT auth.uid()), po.property_id) OR po.created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY po_items_update ON public.purchase_order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND (has_property_access((SELECT auth.uid()), po.property_id) OR po.created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY po_items_delete ON public.purchase_order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND (has_property_access((SELECT auth.uid()), po.property_id) OR po.created_by = (SELECT auth.uid()))
    )
  );

CREATE TRIGGER set_po_items_updated_at BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
