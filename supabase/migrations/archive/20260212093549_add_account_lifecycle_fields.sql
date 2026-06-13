-- Account lifecycle fields for admin controls
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'locked')),
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS suspend_reason text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS force_password_reset boolean NOT NULL DEFAULT false;

-- Index for quick filtering by account status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Comment for documentation
COMMENT ON COLUMN profiles.account_status IS 'Account lifecycle status: active, suspended, or locked';
COMMENT ON COLUMN profiles.suspended_at IS 'When the account was suspended';
COMMENT ON COLUMN profiles.suspended_by IS 'Admin who suspended the account';
COMMENT ON COLUMN profiles.suspend_reason IS 'Reason for suspension';
COMMENT ON COLUMN profiles.last_login_at IS 'Last login timestamp';
COMMENT ON COLUMN profiles.force_password_reset IS 'Force user to reset password on next login';;
