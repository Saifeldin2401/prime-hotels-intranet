-- The maintenance auto-triage feature (create flow + auto-triage-ticket edge fn)
-- writes these AI columns, but they did not exist on the table, so every triage
-- write failed with PGRST204. Add them.
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS ai_triage_status text,
  ADD COLUMN IF NOT EXISTS ai_triage_notes text,
  ADD COLUMN IF NOT EXISTS ai_notes text,
  ADD COLUMN IF NOT EXISTS ai_triaged_at timestamptz;
