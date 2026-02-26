CREATE OR REPLACE FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- 2. Property Access Check
  IF v_property_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_properties WHERE user_id = v_created_by AND property_id = v_property_id
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_created_by AND role IN ('regional_admin', 'regional_hr')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not have access to this property';
  END IF;

  INSERT INTO public.tasks (
    title, 
    description, 
    status, 
    priority, 
    assigned_to_id, 
    created_by_id, 
    property_id, 
    department_id, 
    due_date
  )
  VALUES (
    (task_data->>'title'),
    (task_data->>'description'),
    (COALESCE(task_data->>'status', 'open'))::entity_status,
    (COALESCE(task_data->>'priority', 'medium')),
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
      v_assigned_to,
      (notification_payload->>'type')::notification_type,  -- Fixed: Cast to notification_type enum
      (notification_payload->>'title')::text,
      (notification_payload->>'message')::text,
      (notification_payload->>'link')::text,
      (notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_task);
END;
$function$;;
