-- Audit logs table (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'approve', 'reject'
  entity_type TEXT NOT NULL, -- 'document', 'training', 'leave_request', etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PII access logs table
CREATE TABLE pii_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  fields_accessed TEXT[] NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_access_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: Only regional admin can view (append-only, no update/delete policies)
CREATE POLICY "audit_logs_select_admin_only"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'regional_admin'));

-- Audit logs: Anyone can insert (for logging)
CREATE POLICY "audit_logs_insert_all"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PII access logs: Only regional HR can view
CREATE POLICY "pii_access_logs_select_hr_only"
  ON pii_access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'regional_hr'));

-- PII access logs: Anyone can insert (for logging)
CREATE POLICY "pii_access_logs_insert_all"
  ON pii_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::inet,
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

-- Function to log PII access
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_target_user_id UUID,
  p_fields_accessed TEXT[],
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pii_access_logs (
    actor_id,
    target_user_id,
    fields_accessed,
    reason
  )
  VALUES (
    auth.uid(),
    p_target_user_id,
    p_fields_accessed,
    p_reason
  );
END;
$$;

