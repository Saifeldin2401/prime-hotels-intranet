-- Create approval_delegations table for tracking delegated approvals
CREATE TABLE IF NOT EXISTS public.approval_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL,
    approval_type TEXT NOT NULL,
    delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired', 'revoked'
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view delegations they created or received"
ON public.approval_delegations FOR SELECT
TO authenticated
USING (delegator_id = auth.uid() OR delegate_id = auth.uid());

CREATE POLICY "Users can create delegations for their approvals"
ON public.approval_delegations FOR INSERT
TO authenticated
WITH CHECK (delegator_id = auth.uid());

CREATE POLICY "Users can update their own delegations"
ON public.approval_delegations FOR UPDATE
TO authenticated
USING (delegator_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_approval_delegations_delegator ON public.approval_delegations(delegator_id);
CREATE INDEX idx_approval_delegations_delegate ON public.approval_delegations(delegate_id);
CREATE INDEX idx_approval_delegations_status ON public.approval_delegations(status) WHERE status = 'active';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_approval_delegations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_approval_delegations_updated_at
    BEFORE UPDATE ON public.approval_delegations
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_delegations_updated_at();;
