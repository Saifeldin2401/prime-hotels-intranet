-- ============================================================================
-- MIGRATION: enterprise_system_expansion
-- Expands Finance, Housekeeping, Commercial, and Operations with true enterprise
-- schema columns, GL coding, room inspection audit records, corporate rate tiering,
-- and incident root cause tracking.
-- ============================================================================

-- 1. FINANCE EXPANSION: GL Account Codes & 3-Way PO Matching
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS gl_code text DEFAULT 'GL-4100',
  ADD COLUMN IF NOT EXISTS variance_target_pct numeric DEFAULT 0.0;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS gl_code text DEFAULT 'GL-4100',
  ADD COLUMN IF NOT EXISTS po_matching_status text DEFAULT 'direct';

-- 2. HOUSEKEEPING EXPANSION: Digital Room Quality Inspection Audits
CREATE TABLE IF NOT EXISTS public.room_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  inspector_id uuid NOT NULL REFERENCES public.profiles(id),
  passed boolean NOT NULL DEFAULT true,
  checklist_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.room_inspections IS 'Supervisor room inspection quality audit records.';

CREATE INDEX IF NOT EXISTS idx_room_inspections_room_id ON public.room_inspections(room_id);
CREATE INDEX IF NOT EXISTS idx_room_inspections_property_id ON public.room_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_room_inspections_inspector_id ON public.room_inspections(inspector_id);

ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_inspections_select') THEN
    CREATE POLICY room_inspections_select ON public.room_inspections FOR SELECT TO authenticated
      USING (has_property_access((SELECT auth.uid()), property_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_inspections_insert') THEN
    CREATE POLICY room_inspections_insert ON public.room_inspections FOR INSERT TO authenticated
      WITH CHECK (has_property_access((SELECT auth.uid()), property_id) AND inspector_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 3. COMMERCIAL EXPANSION: Corporate Rate Agreements & Room Night Targets
ALTER TABLE public.crm_contracts
  ADD COLUMN IF NOT EXISTS rate_type text DEFAULT 'LRA',
  ADD COLUMN IF NOT EXISTS annual_room_nights_goal integer DEFAULT 300,
  ADD COLUMN IF NOT EXISTS blackout_dates_apply boolean DEFAULT false;

-- 4. OPERATIONS EXPANSION: Root Cause & Incident Financial Damage Tracking
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS action_plan text,
  ADD COLUMN IF NOT EXISTS estimated_damage_sar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_claimed boolean DEFAULT false;
