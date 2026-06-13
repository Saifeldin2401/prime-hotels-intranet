CREATE OR REPLACE FUNCTION public.assign_maintenance_ticket(ticket_id uuid, assigner_id uuid, assigned_to_id uuid, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'maintenance')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to assign tickets';
  END IF;

  -- Determine status
  IF assigned_to_id IS NOT NULL THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'open';
  END IF;

  -- CORRECTED: Use assigned_to_id column
  UPDATE maintenance_tickets
  SET assigned_to_id = assign_maintenance_ticket.assigned_to_id, 
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
$function$;
