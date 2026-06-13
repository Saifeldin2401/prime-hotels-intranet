-- Fix Security Vulnerability in create_task_atomic (2025-12-16)
-- Ensures users can only create tasks for properties they have access to.

CREATE OR REPLACE FUNCTION create_task_atomic(
  task_data JSONB,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_created_by UUID;
  v_assigned_to UUID;
  v_property_id UUID;
BEGIN
  v_created_by := (task_data->>'created_by_id')::UUID;
  v_assigned_to := (task_data->>'assigned_to_id')::UUID;
  v_property_id := (task_data->>'property_id')::UUID;
  
  -- 1. Identity Check
  IF v_created_by != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Creator ID mismatch';
  END IF;

  -- 2. Property Access Check (Security Fix)
  IF NOT has_property_access(v_created_by, v_property_id) THEN
    RAISE EXCEPTION 'Unauthorized: You do not have access to this property';
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
    v_assigned_to,
    v_created_by,
    v_property_id,
    (task_data->>'department_id')::UUID,
    (task_data->>'due_date')::TIMESTAMPTZ
  )
  RETURNING * INTO v_task;

  -- Only notify if assigned_to is present and NOT the creator
  IF notification_payload IS NOT NULL AND v_assigned_to IS NOT NULL AND v_assigned_to != v_created_by THEN
     INSERT INTO notifications (user_id, type, title, message, link, data)
     VALUES (
      v_assigned_to, -- Derived from task
      (notification_payload->>'type')::text,
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      (notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_task);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
