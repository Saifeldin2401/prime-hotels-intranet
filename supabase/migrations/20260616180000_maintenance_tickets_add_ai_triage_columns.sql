-- The maintenance auto-triage feature (create flow in useMaintenanceTickets /
-- useQuickCreate + the auto-triage-ticket edge function) writes these AI columns,
-- but they did not exist on the table, so every triage write failed with PGRST204.
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS ai_triage_status text,
  ADD COLUMN IF NOT EXISTS ai_triage_notes text,
  ADD COLUMN IF NOT EXISTS ai_notes text,
  ADD COLUMN IF NOT EXISTS ai_triaged_at timestamptz;
