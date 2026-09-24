-- ============================================================================
-- MIGRATION: fix_enterprise_erp_wide_open_rls
-- The "enterprise ERP expansion" module (journal_entries, journal_entry_lines,
-- tax_returns, fiscal_period_closes, housekeeping_dispatch,
-- preventive_maintenance_schedules, vip_guest_preferences, eosb_calculations,
-- saudization_nitaqat_snapshots, goods_received_notes, supplier_scorecards)
-- shipped with a single blanket policy per table:
--   FOR SELECT TO authenticated USING (true)
--   FOR ALL TO authenticated USING (true)
-- meaning ANY logged-in user, regardless of role or property, could read AND
-- write GL journal entries, ZATCA tax filings, fiscal period closes, and --
-- most seriously -- employee EOSB (end-of-service/termination payout)
-- records. This completely bypassed the has_property_access()/role-scoping
-- model every other module in this app uses (verified against invoices,
-- budgets, purchase_orders, vip_guests, housekeeping_tasks -- all of which
-- consistently gate on has_property_access(auth.uid(), property_id) plus an
-- ownership/assignment OR-branch).
--
-- Rebuilding RLS per-table to match:
--  - Finance GL/tax (journal_entries, journal_entry_lines, tax_returns,
--    fiscal_period_closes): write restricted to property_manager/
--    regional_admin (GM-level+) with property scoping; read open to anyone
--    with property access (matches invoices/budgets read visibility).
--  - eosb_calculations (HR/payroll-sensitive, no property_id -- employee is
--    the scope): read/write restricted to is_hr_or_admin(), plus the
--    employee can read their own record.
--  - saudization_nitaqat_snapshots (compliance, has property_id): write
--    restricted to is_hr_or_admin(); read open to property access or HR/admin.
--  - housekeeping_dispatch, preventive_maintenance_schedules: property-scoped,
--    mirrors housekeeping_tasks exactly (assignee ownership branch included).
--  - vip_guest_preferences (no property_id by design -- a guest profile can
--    span properties in the group): read open to authenticated staff (front
--    desk anywhere needs it, matches vip_guests' broad visibility intent);
--    write restricted to property_manager/regional_admin.
--  - goods_received_notes (property_id): mirrors purchase_orders exactly.
--  - supplier_scorecards (no property_id, supplier-scoped like suppliers):
--    mirrors suppliers exactly (write = property_manager role, read = true).
--
-- Applied live via Supabase MCP apply_migration on 2026-08-02.
-- ============================================================================

-- journal_entries
DROP POLICY "Authenticated users can read journal_entries" ON public.journal_entries;
DROP POLICY "Authenticated users can manage journal_entries" ON public.journal_entries;
CREATE POLICY journal_entries_select ON public.journal_entries FOR SELECT TO authenticated
  USING (property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY journal_entries_insert ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role))
    AND created_by = (SELECT auth.uid()));
CREATE POLICY journal_entries_update ON public.journal_entries FOR UPDATE TO authenticated
  USING ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)));
CREATE POLICY journal_entries_delete ON public.journal_entries FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- journal_entry_lines (inherits access from parent journal_entries)
DROP POLICY "Authenticated users can read journal_entry_lines" ON public.journal_entry_lines;
DROP POLICY "Authenticated users can manage journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY journal_entry_lines_select ON public.journal_entry_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id
    AND (je.property_id IS NULL OR has_property_access((SELECT auth.uid()), je.property_id))));
CREATE POLICY journal_entry_lines_insert ON public.journal_entry_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id
    AND (je.property_id IS NULL OR has_property_access((SELECT auth.uid()), je.property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role))));
CREATE POLICY journal_entry_lines_update ON public.journal_entry_lines FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id
    AND (je.property_id IS NULL OR has_property_access((SELECT auth.uid()), je.property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role))));
CREATE POLICY journal_entry_lines_delete ON public.journal_entry_lines FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id
    AND has_role((SELECT auth.uid()), 'regional_admin'::app_role)));

-- tax_returns
DROP POLICY "Authenticated users can read tax_returns" ON public.tax_returns;
DROP POLICY "Authenticated users can manage tax_returns" ON public.tax_returns;
CREATE POLICY tax_returns_select ON public.tax_returns FOR SELECT TO authenticated
  USING (property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY tax_returns_insert ON public.tax_returns FOR INSERT TO authenticated
  WITH CHECK ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)));
CREATE POLICY tax_returns_update ON public.tax_returns FOR UPDATE TO authenticated
  USING ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)));
CREATE POLICY tax_returns_delete ON public.tax_returns FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- fiscal_period_closes
DROP POLICY "Authenticated users can read fiscal_period_closes" ON public.fiscal_period_closes;
DROP POLICY "Authenticated users can manage fiscal_period_closes" ON public.fiscal_period_closes;
CREATE POLICY fiscal_period_closes_select ON public.fiscal_period_closes FOR SELECT TO authenticated
  USING (property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY fiscal_period_closes_insert ON public.fiscal_period_closes FOR INSERT TO authenticated
  WITH CHECK ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role))
    AND closed_by = (SELECT auth.uid()));
CREATE POLICY fiscal_period_closes_update ON public.fiscal_period_closes FOR UPDATE TO authenticated
  USING ((property_id IS NULL OR has_property_access((SELECT auth.uid()), property_id))
    AND (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)));
CREATE POLICY fiscal_period_closes_delete ON public.fiscal_period_closes FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- housekeeping_dispatch (mirrors housekeeping_tasks)
DROP POLICY "Authenticated users can read housekeeping_dispatch" ON public.housekeeping_dispatch;
DROP POLICY "Authenticated users can manage housekeeping_dispatch" ON public.housekeeping_dispatch;
CREATE POLICY housekeeping_dispatch_select ON public.housekeeping_dispatch FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR attendant_id = (SELECT auth.uid()));
CREATE POLICY housekeeping_dispatch_insert ON public.housekeeping_dispatch FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY housekeeping_dispatch_update ON public.housekeeping_dispatch FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR attendant_id = (SELECT auth.uid()));
CREATE POLICY housekeeping_dispatch_delete ON public.housekeeping_dispatch FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

-- preventive_maintenance_schedules
DROP POLICY "Authenticated users can read preventive_maintenance_schedules" ON public.preventive_maintenance_schedules;
DROP POLICY "Authenticated users can manage preventive_maintenance_schedules" ON public.preventive_maintenance_schedules;
CREATE POLICY preventive_maintenance_schedules_select ON public.preventive_maintenance_schedules FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR assigned_technician_id = (SELECT auth.uid()));
CREATE POLICY preventive_maintenance_schedules_insert ON public.preventive_maintenance_schedules FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id));
CREATE POLICY preventive_maintenance_schedules_update ON public.preventive_maintenance_schedules FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR assigned_technician_id = (SELECT auth.uid()));
CREATE POLICY preventive_maintenance_schedules_delete ON public.preventive_maintenance_schedules FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

-- vip_guest_preferences (no property_id by design; read broad, write elevated)
DROP POLICY "Authenticated users can read vip_guest_preferences" ON public.vip_guest_preferences;
DROP POLICY "Authenticated users can manage vip_guest_preferences" ON public.vip_guest_preferences;
CREATE POLICY vip_guest_preferences_select ON public.vip_guest_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY vip_guest_preferences_insert ON public.vip_guest_preferences FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY vip_guest_preferences_update ON public.vip_guest_preferences FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'property_manager'::app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY vip_guest_preferences_delete ON public.vip_guest_preferences FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'regional_admin'::app_role));

-- eosb_calculations (HR/payroll-sensitive, no property_id -- employee-scoped)
DROP POLICY "Authenticated users can read eosb_calculations" ON public.eosb_calculations;
DROP POLICY "Authenticated users can manage eosb_calculations" ON public.eosb_calculations;
CREATE POLICY eosb_calculations_select ON public.eosb_calculations FOR SELECT TO authenticated
  USING (is_hr_or_admin((SELECT auth.uid())) OR employee_id = (SELECT auth.uid()));
CREATE POLICY eosb_calculations_insert ON public.eosb_calculations FOR INSERT TO authenticated
  WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY eosb_calculations_update ON public.eosb_calculations FOR UPDATE TO authenticated
  USING (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY eosb_calculations_delete ON public.eosb_calculations FOR DELETE TO authenticated
  USING (is_hr_or_admin((SELECT auth.uid())));

-- saudization_nitaqat_snapshots
DROP POLICY "Authenticated users can read saudization_nitaqat_snapshots" ON public.saudization_nitaqat_snapshots;
DROP POLICY "Authenticated users can manage saudization_nitaqat_snapshots" ON public.saudization_nitaqat_snapshots;
CREATE POLICY saudization_nitaqat_snapshots_select ON public.saudization_nitaqat_snapshots FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY saudization_nitaqat_snapshots_insert ON public.saudization_nitaqat_snapshots FOR INSERT TO authenticated
  WITH CHECK (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY saudization_nitaqat_snapshots_update ON public.saudization_nitaqat_snapshots FOR UPDATE TO authenticated
  USING (is_hr_or_admin((SELECT auth.uid())));
CREATE POLICY saudization_nitaqat_snapshots_delete ON public.saudization_nitaqat_snapshots FOR DELETE TO authenticated
  USING (is_hr_or_admin((SELECT auth.uid())));

-- goods_received_notes (mirrors purchase_orders)
DROP POLICY "Authenticated users can read goods_received_notes" ON public.goods_received_notes;
DROP POLICY "Authenticated users can manage goods_received_notes" ON public.goods_received_notes;
CREATE POLICY goods_received_notes_select ON public.goods_received_notes FOR SELECT TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR received_by = (SELECT auth.uid()));
CREATE POLICY goods_received_notes_insert ON public.goods_received_notes FOR INSERT TO authenticated
  WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND received_by = (SELECT auth.uid()));
CREATE POLICY goods_received_notes_update ON public.goods_received_notes FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id) OR received_by = (SELECT auth.uid()));
CREATE POLICY goods_received_notes_delete ON public.goods_received_notes FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), property_id));

-- supplier_scorecards (mirrors suppliers: write=property_manager, read=true)
DROP POLICY "Authenticated users can read supplier_scorecards" ON public.supplier_scorecards;
DROP POLICY "Authenticated users can manage supplier_scorecards" ON public.supplier_scorecards;
CREATE POLICY supplier_scorecards_select ON public.supplier_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY supplier_scorecards_insert ON public.supplier_scorecards FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND evaluator_id = (SELECT auth.uid()));
CREATE POLICY supplier_scorecards_update ON public.supplier_scorecards FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'property_manager'::app_role));
CREATE POLICY supplier_scorecards_delete ON public.supplier_scorecards FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'property_manager'::app_role));
