-- ============================================================================
-- MIGRATION: add_procurement_module
-- Adds a Procurement MVP: suppliers, purchase requests (with approval),
-- purchase orders, receiving, basic inventory.
--
-- Applied live via Supabase MCP apply_migration on 2026-07-21.
-- ============================================================================

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.suppliers IS 'Corporate-wide supplier registry (not property-scoped).';

CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  item_description text NOT NULL,
  quantity numeric NOT NULL,
  estimated_cost numeric,
  justification text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','converted_to_po')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.purchase_requests IS 'Internal purchase requests, approved before becoming a PO.';

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid REFERENCES public.purchase_requests(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  po_number text NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_received','received','cancelled')),
  order_date date,
  expected_delivery_date date,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, po_number)
);
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders against a supplier, optionally originating from a purchase request.';

CREATE TABLE public.po_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  received_by uuid NOT NULL REFERENCES public.profiles(id),
  quantity_received numeric NOT NULL,
  condition_notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.po_receipts IS 'Goods-received records against a purchase order.';

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  item_name text NOT NULL,
  category text,
  unit text,
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  reorder_threshold numeric,
  last_updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, item_name)
);
COMMENT ON TABLE public.inventory_items IS 'Basic per-property inventory register.';

CREATE INDEX idx_suppliers_created_by ON public.suppliers(created_by);
CREATE INDEX idx_purchase_requests_property_id ON public.purchase_requests(property_id);
CREATE INDEX idx_purchase_requests_department_id ON public.purchase_requests(department_id);
CREATE INDEX idx_purchase_requests_requested_by ON public.purchase_requests(requested_by);
CREATE INDEX idx_purchase_requests_approved_by ON public.purchase_requests(approved_by);
CREATE INDEX idx_purchase_orders_purchase_request_id ON public.purchase_orders(purchase_request_id);
CREATE INDEX idx_purchase_orders_property_id ON public.purchase_orders(property_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX idx_po_receipts_purchase_order_id ON public.po_receipts(purchase_order_id);
CREATE INDEX idx_po_receipts_received_by ON public.po_receipts(received_by);
CREATE INDEX idx_inventory_items_property_id ON public.inventory_items(property_id);
CREATE INDEX idx_inventory_items_last_updated_by ON public.inventory_items(last_updated_by);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Suppliers: corporate-wide, readable by any authenticated staff (needed to pick
-- a supplier on a PO), writable by property-access-holding roles (matches how
-- other corporate-wide reference tables like job_titles are scoped in this app).
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY suppliers_modify ON public.suppliers FOR ALL TO authenticated
  USING (has_role((SELECT auth.uid()), 'property_manager'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'property_manager'::app_role));

CREATE POLICY purchase_requests_select ON public.purchase_requests FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR requested_by = (SELECT auth.uid()));
CREATE POLICY purchase_requests_insert ON public.purchase_requests FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND requested_by = (SELECT auth.uid()));
CREATE POLICY purchase_requests_update ON public.purchase_requests FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR requested_by = (SELECT auth.uid()));
CREATE POLICY purchase_requests_delete ON public.purchase_requests FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY purchase_orders_select ON public.purchase_orders FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY purchase_orders_insert ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY purchase_orders_update ON public.purchase_orders FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY purchase_orders_delete ON public.purchase_orders FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY po_receipts_select ON public.po_receipts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_id AND has_property_access((SELECT auth.uid()), po.property_id))
    OR received_by = (SELECT auth.uid())
  );
CREATE POLICY po_receipts_insert ON public.po_receipts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_id AND has_property_access((SELECT auth.uid()), po.property_id))
    AND received_by = (SELECT auth.uid())
  );

CREATE POLICY inventory_items_select ON public.inventory_items FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY inventory_items_insert ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY inventory_items_update ON public.inventory_items FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY inventory_items_delete ON public.inventory_items FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER purchase_requests_set_updated_at BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER purchase_orders_set_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
