-- Create status_history table for audit trail
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_status_history_entity ON public.status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_changed_at ON public.status_history(changed_at DESC);
CREATE INDEX idx_status_history_changed_by ON public.status_history(changed_by);

-- Enable RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view status history for entities they can access"
ON public.status_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert status history"
ON public.status_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history (entity_type, entity_id, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to relevant tables
DROP TRIGGER IF EXISTS log_task_status ON public.tasks;
CREATE TRIGGER log_task_status
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_maintenance_ticket_status ON public.maintenance_tickets;
CREATE TRIGGER log_maintenance_ticket_status
  AFTER UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_leave_request_status ON public.leave_requests;
CREATE TRIGGER log_leave_request_status
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_job_posting_status ON public.job_postings;
CREATE TRIGGER log_job_posting_status
  AFTER UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION log_status_change();;
