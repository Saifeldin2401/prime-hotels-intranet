-- Fix notification column consistency (2026-02-04)
-- Standardize on 'metadata' column instead of 'data' in RPC functions
-- The service layer uses 'metadata', so RPC functions should too

-- 1. Update approve_leave_request to use metadata
CREATE OR REPLACE FUNCTION approve_leave_request(
  request_id UUID,
  approver_id UUID,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request leave_requests%ROWTYPE;
BEGIN
  -- Strict Check: Approver must use their own ID (Security)
  IF approver_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Approver ID mismatch';
  END IF;

  -- 1. Update Request
  UPDATE leave_requests
  SET status = 'approved',
      approved_by_id = approver_id,
      updated_at = NOW()
  WHERE id = request_id AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found or not pending';
  END IF;

  -- 2. Insert Notification (if provided) - using 'metadata' for consistency
  IF notification_payload IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      (notification_payload->>'user_id')::UUID,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      COALESCE(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  END IF;

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update reject_leave_request to use metadata
CREATE OR REPLACE FUNCTION reject_leave_request(
  request_id UUID,
  rejector_id UUID,
  rejection_reason TEXT,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request leave_requests%ROWTYPE;
BEGIN
  IF rejector_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Rejector ID mismatch';
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

  -- Using 'metadata' for consistency
  IF notification_payload IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      (notification_payload->>'user_id')::UUID,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      COALESCE(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  END IF;

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update create_task_atomic to use metadata
CREATE OR REPLACE FUNCTION create_task_atomic(
  task_data JSONB,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_created_by UUID;
BEGIN
  v_created_by := (task_data->>'created_by_id')::UUID;
  
  -- Security Check
  IF v_created_by != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Creator ID mismatch';
  END IF;

  INSERT INTO tasks (
    title, description, status, priority, 
    assigned_to_id, created_by_id, 
    property_id, department_id, 
    due_date
  )
  VALUES (
    (task_data->>'title'),
    (task_data->>'description'),
    (task_data->>'status')::task_status,
    (task_data->>'priority')::priority_level,
    (task_data->>'assigned_to_id')::UUID,
    v_created_by,
    (task_data->>'property_id')::UUID,
    (task_data->>'department_id')::UUID,
    (task_data->>'due_date')::TIMESTAMPTZ
  )
  RETURNING * INTO v_task;

  -- Using 'metadata' for consistency
  IF notification_payload IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      (notification_payload->>'user_id')::UUID,
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      COALESCE(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  END IF;

  RETURN to_jsonb(v_task);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
