-- ============================================================================
-- MIGRATION: add_missing_erp_fk_indexes
-- 18 foreign-key columns across the enterprise ERP expansion tables had no
-- covering index -- every join/lookup on these FKs (e.g. loading a journal
-- entry's lines, a property's tax returns, a supplier's GRNs) forces a
-- sequential scan. Found via a systematic sweep for single-column FKs with
-- no leading-column index match.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by ON public.journal_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_property_id ON public.journal_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_property_id ON public.tax_returns(property_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_period_closes_closed_by ON public.fiscal_period_closes(closed_by);
CREATE INDEX IF NOT EXISTS idx_housekeeping_dispatch_attendant_id ON public.housekeeping_dispatch(attendant_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_dispatch_property_id ON public.housekeeping_dispatch(property_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_dispatch_room_id ON public.housekeeping_dispatch(room_id);
CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_schedules_assigned_technician_id ON public.preventive_maintenance_schedules(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_schedules_property_id ON public.preventive_maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_eosb_calculations_employee_id ON public.eosb_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudization_nitaqat_snapshots_department_id ON public.saudization_nitaqat_snapshots(department_id);
CREATE INDEX IF NOT EXISTS idx_saudization_nitaqat_snapshots_property_id ON public.saudization_nitaqat_snapshots(property_id);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_po_id ON public.goods_received_notes(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_property_id ON public.goods_received_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_received_by ON public.goods_received_notes(received_by);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_supplier_id ON public.goods_received_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_evaluator_id ON public.supplier_scorecards(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_supplier_id ON public.supplier_scorecards(supplier_id);
