-- Drop the old function first to allow signature change
DROP FUNCTION IF EXISTS public.assign_maintenance_ticket(uuid, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.assign_maintenance_ticket(
  p_ticket_id uuid, 
  p_assigner_id uuid, 
  p_assigned_to_id uuid, 
  p_notification_payload jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket maintenance_tickets%ROWTYPE;
  v_new_status maintenance_tickets.status%TYPE; 
BEGIN
  -- 1. Identity Check
  IF p_assigner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Assigner ID mismatch';
  END IF;

  -- 2. Role Check (Must be a manager/admin or maintenance staff)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'maintenance')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to assign tickets';
  END IF;

  -- Determine status
  IF p_assigned_to_id IS NOT NULL THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'open';
  END IF;

  -- Update using unambiguous parameter names
  UPDATE maintenance_tickets
  SET assigned_to_id = p_assigned_to_id, 
      status = v_new_status,
      updated_at = NOW()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance ticket not found';
  END IF;

  IF p_notification_payload IS NOT NULL AND p_assigned_to_id IS NOT NULL AND p_assigned_to_id != p_assigner_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      p_assigned_to_id,
      (p_notification_payload->>'type')::text,
      (p_notification_payload->>'title')::text,
      (p_notification_payload->>'message')::text,
      (p_notification_payload->>'link')::text,
      (p_notification_payload->'data')
    );
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$function$;;
