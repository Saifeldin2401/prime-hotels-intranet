-- Add estimated_cost column to maintenance tickets
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,2);

DO $$
BEGIN
  ALTER TABLE public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_estimated_cost_non_negative
    CHECK (estimated_cost IS NULL OR estimated_cost >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.maintenance_tickets.estimated_cost IS 'Optional estimated cost provided at ticket creation.';
