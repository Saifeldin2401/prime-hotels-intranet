-- ============================================================================
-- MIGRATION: add_finance_module
-- Adds Budgets (planning, no approval needed) and Invoices/AP (approval-
-- workflow-integrated, matching expense_claims' established pattern of
-- routing through the existing requests/request_steps engine rather than a
-- bespoke status column).
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  fiscal_year integer NOT NULL,
  period_type text NOT NULL DEFAULT 'annual' CHECK (period_type IN ('annual','quarterly','monthly')),
  period_label text,
  category text NOT NULL,
  allocated_amount numeric NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, department_id, fiscal_year, period_type, period_label, category)
);
COMMENT ON TABLE public.budgets IS 'Budget allocations per property/department/category/period. Pure planning data, no approval workflow.';

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  department_id uuid REFERENCES public.departments(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  invoice_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','paid')),
  workflow_request_id uuid,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, invoice_number)
);
COMMENT ON TABLE public.invoices IS 'Vendor invoices / accounts payable, routed through the shared requests/request_steps approval engine (mirrors expense_claims).';

CREATE INDEX idx_budgets_property_id ON public.budgets(property_id);
CREATE INDEX idx_budgets_department_id ON public.budgets(department_id);
CREATE INDEX idx_budgets_created_by ON public.budgets(created_by);
CREATE INDEX idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX idx_invoices_department_id ON public.invoices(department_id);
CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_purchase_order_id ON public.invoices(purchase_order_id);
CREATE INDEX idx_invoices_submitted_by ON public.invoices(submitted_by);
CREATE INDEX idx_invoices_workflow_request_id ON public.invoices(workflow_request_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_select ON public.budgets FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR created_by = (SELECT auth.uid()));
CREATE POLICY budgets_insert ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY budgets_update ON public.budgets FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY budgets_delete ON public.budgets FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR submitted_by = (SELECT auth.uid()));
CREATE POLICY invoices_insert ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND submitted_by = (SELECT auth.uid()));
CREATE POLICY invoices_update ON public.invoices FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR submitted_by = (SELECT auth.uid()));
CREATE POLICY invoices_delete ON public.invoices FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

CREATE TRIGGER budgets_set_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approver lookup: property_manager at the property, falling back up the chain.
-- Mirrors find_hr_assignee()'s established fallback pattern.
CREATE OR REPLACE FUNCTION public.find_finance_approver(property_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_approver_id uuid;
begin
  select up.user_id into v_approver_id
  from public.user_properties up
  join public.user_roles ur on ur.user_id = up.user_id
  where up.property_id = find_finance_approver.property_id
    and ur.role = 'property_manager'::public.app_role
  limit 1;

  if v_approver_id is null then
    select ur.user_id into v_approver_id
    from public.user_roles ur
    where ur.role = 'regional_admin'::public.app_role
    limit 1;
  end if;

  if v_approver_id is null then
    select ur.user_id into v_approver_id
    from public.user_roles ur
    where ur.role = 'corporate_admin'::public.app_role
    limit 1;
  end if;

  return v_approver_id;
end;
$function$;

-- Only fires when an invoice is actually submitted for approval (draft -> pending_approval),
-- not on every insert -- avoids the always-create-a-request-on-insert pattern that would be
-- awkward for draft invoices still being prepared.
CREATE OR REPLACE FUNCTION public.create_request_for_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_approver_id uuid;
  v_approver_role public.app_role;
  v_request_id uuid;
begin
  if new.status = 'pending_approval' and (old.status is distinct from 'pending_approval') and new.workflow_request_id is null then
    v_approver_id := public.find_finance_approver(new.property_id);

    select ur.role into v_approver_role
    from public.user_roles ur
    where ur.user_id = v_approver_id
    order by case ur.role
      when 'property_manager' then 1
      when 'regional_admin' then 2
      when 'corporate_admin' then 3
      else 100
    end
    limit 1;

    insert into public.requests (
      entity_type, entity_id, requester_id, current_assignee_id,
      status, submitted_at, metadata, property_id, department_id
    )
    values (
      'invoice',
      new.id,
      new.submitted_by,
      v_approver_id,
      'pending_supervisor_approval',
      now(),
      jsonb_build_object('invoice_number', new.invoice_number, 'amount', new.amount, 'supplier_id', new.supplier_id),
      new.property_id,
      new.department_id
    )
    returning id into v_request_id;

    if v_approver_id is not null then
      insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status, created_by
      )
      values (
        v_request_id, 1, v_approver_id, coalesce(v_approver_role, 'corporate_admin'::public.app_role),
        'pending', new.submitted_by
      );
    end if;

    update public.invoices set workflow_request_id = v_request_id where id = new.id;
  end if;

  return new;
end;
$function$;

CREATE TRIGGER trg_create_request_for_invoice
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.create_request_for_invoice();
