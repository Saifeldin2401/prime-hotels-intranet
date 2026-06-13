-- Temporary approvers table
CREATE TABLE temporary_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  delegate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('property', 'department', 'all')),
  scope_id UUID, -- property_id or department_id if scoped
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_at > start_at)
);

-- Escalation rules table
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'leave_request', 'document_approval', etc.
  threshold_hours INTEGER NOT NULL DEFAULT 48,
  next_role app_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Approval requests table (generic approval tracking)
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'document', 'leave_request', etc.
  entity_id UUID NOT NULL,
  current_approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Approval history table (track who approved/rejected)
CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  was_delegate BOOLEAN DEFAULT false,
  original_approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE temporary_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- Temporary approvers: Users can view their delegations
CREATE POLICY "temporary_approvers_select"
  ON temporary_approvers FOR SELECT
  TO authenticated
  USING (
    delegator_id = auth.uid() OR
    delegate_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin')
  );

-- Temporary approvers: Users can create their own delegations
CREATE POLICY "temporary_approvers_insert_own"
  ON temporary_approvers FOR INSERT
  TO authenticated
  WITH CHECK (delegator_id = auth.uid());

-- Escalation rules: Only regional admin can view/modify
CREATE POLICY "escalation_rules_admin_only"
  ON escalation_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'regional_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'regional_admin'));

-- Approval requests: Approvers can view their pending requests
CREATE POLICY "approval_requests_select"
  ON approval_requests FOR SELECT
  TO authenticated
  USING (
    current_approver_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    EXISTS (
      SELECT 1 FROM temporary_approvers ta
      WHERE ta.delegate_id = auth.uid()
      AND ta.start_at <= now()
      AND ta.end_at >= now()
      AND (
        ta.scope_type = 'all' OR
        (ta.scope_type = 'property' AND ta.scope_id IN (
          SELECT property_id FROM user_properties WHERE user_id = current_approver_id
        )) OR
        (ta.scope_type = 'department' AND ta.scope_id IN (
          SELECT department_id FROM user_departments WHERE user_id = current_approver_id
        ))
      )
    )
  );

-- Approval history: Approvers and admins can view
CREATE POLICY "approval_history_select"
  ON approval_history FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    EXISTS (
      SELECT 1 FROM approval_requests ar
      WHERE ar.id = approval_history.approval_request_id
      AND (
        ar.current_approver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_properties up1
          JOIN user_properties up2 ON up1.property_id = up2.property_id
          JOIN approval_requests ar2 ON ar2.entity_id::text LIKE '%' || up2.user_id::text || '%'
          WHERE up1.user_id = auth.uid()
        )
      )
    )
  );

