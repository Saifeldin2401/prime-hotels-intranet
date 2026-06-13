-- Leave requests schema
-- This migration introduces a basic leave_requests table for HR workflows.

CREATE TYPE leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE leave_type AS ENUM (
  'annual',
  'sick',
  'unpaid',
  'maternity',
  'paternity',
  'personal',
  'other'
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type leave_type NOT NULL,
  reason TEXT,
  status leave_request_status NOT NULL DEFAULT 'pending',
  approved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Basic RLS setup
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1) Requester can see and manage their own requests (no status override).
CREATE POLICY "leave_requests_select_own" ON leave_requests
  FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "leave_requests_insert_own" ON leave_requests
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "leave_requests_update_own_pending" ON leave_requests
  FOR UPDATE
  USING (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (requester_id = auth.uid());

-- 2) Managers/HR can view and act on requests in their scope.
--    We reuse the app_role concept via a helper function get_user_roles(auth.uid()).
--    If such a function does not yet exist, this policy assumes you will add
--    an appropriate security function similar to other modules.

CREATE POLICY "leave_requests_select_managers" ON leave_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
    )
  );

CREATE POLICY "leave_requests_update_managers" ON leave_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
    )
  );

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_requests_updated_at
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION set_leave_requests_updated_at();
