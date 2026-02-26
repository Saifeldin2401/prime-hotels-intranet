-- User profile enhancements: employment details and KSA compliance
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'probation', 'intern')),
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS iqama_number text,
  ADD COLUMN IF NOT EXISTS iqama_expiry date,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Index for contract expiry tracking
CREATE INDEX IF NOT EXISTS idx_profiles_contract_end ON profiles(contract_end_date) WHERE contract_end_date IS NOT NULL;

-- Comments
COMMENT ON COLUMN profiles.employment_type IS 'Employment type: full_time, part_time, contract, probation, intern';
COMMENT ON COLUMN profiles.contract_end_date IS 'End date for contract/probation employees';
COMMENT ON COLUMN profiles.iqama_number IS 'Saudi Iqama (residence permit) number - PII';
COMMENT ON COLUMN profiles.iqama_expiry IS 'Iqama expiry date for compliance tracking';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact name';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';;
