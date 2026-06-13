-- Admin delegation table for temporary permission/role delegation
CREATE TABLE IF NOT EXISTS admin_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id uuid NOT NULL REFERENCES profiles(id),
  delegate_id uuid NOT NULL REFERENCES profiles(id),
  delegation_type text NOT NULL CHECK (delegation_type IN ('full_access', 'specific_permissions', 'approval_authority')),
  permissions text[] DEFAULT '{}',
  reason text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  auto_expired boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  CONSTRAINT delegation_date_range CHECK (ends_at > starts_at),
  CONSTRAINT no_self_delegation CHECK (delegator_id != delegate_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON admin_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegate ON admin_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON admin_delegations(is_active, ends_at);

-- RLS
ALTER TABLE admin_delegations ENABLE ROW LEVEL SECURITY;

-- Users can see delegations they created or received
CREATE POLICY "Users can view own delegations"
  ON admin_delegations FOR SELECT
  USING (
    auth.uid() = delegator_id
    OR auth.uid() = delegate_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin')
    )
  );

-- Managers can create delegations
CREATE POLICY "Managers can create delegations"
  ON admin_delegations FOR INSERT
  WITH CHECK (
    auth.uid() = delegator_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager')
    )
  );

-- Delegators and admins can update (revoke)
CREATE POLICY "Delegators and admins can update delegations"
  ON admin_delegations FOR UPDATE
  USING (
    auth.uid() = delegator_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin')
    )
  );

-- Auto-expiry function
CREATE OR REPLACE FUNCTION expire_delegations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_delegations
  SET is_active = false, auto_expired = true, updated_at = now()
  WHERE is_active = true AND ends_at < now();
END;
$$;

COMMENT ON TABLE admin_delegations IS 'Temporary delegation of administrative permissions between users';
COMMENT ON FUNCTION expire_delegations() IS 'Auto-expires delegations past their end date';;
