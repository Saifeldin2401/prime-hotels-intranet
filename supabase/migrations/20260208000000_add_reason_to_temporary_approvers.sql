-- Add reason column to temporary_approvers table
-- This allows users to provide a reason when delegating approvals

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'reason'
  ) THEN
    ALTER TABLE public.temporary_approvers 
    ADD COLUMN reason TEXT;
    
    COMMENT ON COLUMN public.temporary_approvers.reason IS 'Optional reason provided by the delegator for the delegation';
  END IF;
END $$;

