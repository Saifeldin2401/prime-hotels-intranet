-- Fix temporary_approvers schema drift and restore delegation compatibility
-- Aligns table with delegator_id/delegate_id/scope_* fields used across approvals

CREATE TABLE IF NOT EXISTS public.temporary_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'all' CHECK (scope_type IN ('property', 'department', 'all')),
  scope_id UUID,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'delegator_id'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN delegator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'delegate_id'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN delegate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'scope_type'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'all' CHECK (scope_type IN ('property', 'department', 'all'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'scope_id'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN scope_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN start_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'end_at'
  ) THEN
    ALTER TABLE public.temporary_approvers ADD COLUMN end_at TIMESTAMPTZ;
  END IF;
END $$;

-- Backfill from alternate schema if present
UPDATE public.temporary_approvers
SET
  delegator_id = COALESCE(delegator_id, approver_id),
  delegate_id = COALESCE(delegate_id, temporary_approver_id),
  start_at = COALESCE(start_at, start_date),
  end_at = COALESCE(end_at, end_date),
  scope_type = COALESCE(scope_type, 'all')
WHERE
  (delegator_id IS NULL OR delegate_id IS NULL OR start_at IS NULL OR end_at IS NULL)
  AND (
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temporary_approvers' AND column_name = 'approver_id')
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temporary_approvers' AND column_name = 'temporary_approver_id')
  );

-- Ensure valid date range constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'temporary_approvers' AND constraint_name = 'temporary_approvers_valid_range'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD CONSTRAINT temporary_approvers_valid_range CHECK (end_at > start_at);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_temporary_approvers_delegator ON public.temporary_approvers(delegator_id);
CREATE INDEX IF NOT EXISTS idx_temporary_approvers_delegate ON public.temporary_approvers(delegate_id);

-- RLS helper policies for delegation (non-recursive, auth.uid only)
ALTER TABLE public.temporary_approvers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temporary_approvers_select_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_select_delegation"
  ON public.temporary_approvers FOR SELECT
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR delegate_id = auth.uid()
  );

DROP POLICY IF EXISTS "temporary_approvers_insert_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_insert_delegation"
  ON public.temporary_approvers FOR INSERT
  TO authenticated
  WITH CHECK (delegator_id = auth.uid());
