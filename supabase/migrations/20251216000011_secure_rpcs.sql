-- Secure Atomic Operations (2025-12-16)
-- Adds role-based checks to critical RPCs to prevent unauthorized access

-- 1. Secure approve_leave_request
CREATE OR REPLACE FUNCTION approve_leave_request(
  request_id UUID,
  approver_id UUID,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request leave_requests%ROWTYPE;
BEGIN
  -- 1. Identity Check
  IF approver_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Approver ID mismatch';
  END IF;

  -- 2. Role Check (Must be a manager/admin)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to approve requests';
  END IF;

  UPDATE leave_requests
  SET status = 'approved',
      approved_by_id = approver_id,
      updated_at = NOW()
  WHERE id = request_id AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found or not pending';
  END IF;

  IF notification_payload IS NOT NULL AND v_request.requester_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      v_request.requester_id,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      (notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Secure reject_leave_request
CREATE OR REPLACE FUNCTION reject_leave_request(
  request_id UUID,
  rejector_id UUID,
  rejection_reason TEXT,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request leave_requests%ROWTYPE;
BEGIN
  -- 1. Identity Check
  IF rejector_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Rejector ID mismatch';
  END IF;

  -- 2. Role Check (Must be a manager/admin)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to reject requests';
  END IF;

  UPDATE leave_requests
  SET status = 'rejected',
      rejected_by_id = rejector_id,
      rejection_reason = rejection_reason,
      updated_at = NOW()
  WHERE id = request_id AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found or not pending';
  END IF;

  IF notification_payload IS NOT NULL AND v_request.requester_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      v_request.requester_id,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      (notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Secure assign_maintenance_ticket
-- Only managers can assign tickets to others
CREATE OR REPLACE FUNCTION assign_maintenance_ticket(
  ticket_id UUID,
  assigner_id UUID,
  assigned_to_id UUID,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_ticket maintenance_tickets%ROWTYPE;
  v_new_status maintenance_tickets.status%TYPE; 
BEGIN
  -- 1. Identity Check
  IF assigner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Assigner ID mismatch';
  END IF;

  -- 2. Role Check (Must be a manager/admin)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to assign tickets';
  END IF;

  -- Determine status
  IF assigned_to_id IS NOT NULL THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'open';
  END IF;

  UPDATE maintenance_tickets
  SET assigned_to = assigned_to_id, 
      status = v_new_status,
      updated_at = NOW()
  WHERE id = ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance ticket not found';
  END IF;

  IF notification_payload IS NOT NULL AND assigned_to_id IS NOT NULL AND assigned_to_id != assigner_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      assigned_to_id,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      (notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
