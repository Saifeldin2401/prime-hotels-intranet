ALTER TABLE public.learning_assignments
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_on_due BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER[] DEFAULT '{}'::INTEGER[];

ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;;
