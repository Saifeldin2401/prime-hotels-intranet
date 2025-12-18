-- Atomic Operations for Maintenance Tickets (2025-12-16)

-- 1. Assign Maintenance Ticket Atomic
CREATE OR REPLACE FUNCTION assign_maintenance_ticket(
  ticket_id UUID,
  assigner_id UUID,
  assigned_to_id UUID,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_ticket maintenance_tickets%ROWTYPE;
  v_new_status maintenance_tickets.status%TYPE; -- Safely reference column type
BEGIN
  -- Security: Assigner must be authenticated (caller check usually, but good to have)
  IF assigner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Assigner ID mismatch';
  END IF;

  -- Determine status based on assignment
  IF assigned_to_id IS NOT NULL THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'open';
  END IF;

  -- Update Ticket
  UPDATE maintenance_tickets
  SET assigned_to = assigned_to_id, 
      status = v_new_status,
      updated_at = NOW()
  WHERE id = ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance ticket not found';
  END IF;

  -- Send Notification (only if assigned and payload provided)
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


-- 2. Complete Maintenance Ticket Atomic
CREATE OR REPLACE FUNCTION complete_maintenance_ticket(
  ticket_id UUID,
  completer_id UUID,
  labor_hours NUMERIC DEFAULT NULL,
  material_cost NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  notification_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_ticket maintenance_tickets%ROWTYPE;
BEGIN
  IF completer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Completer ID mismatch';
  END IF;

  -- Update Ticket
  UPDATE maintenance_tickets
  SET status = 'completed',
      labor_hours = complete_maintenance_ticket.labor_hours,
      material_cost = complete_maintenance_ticket.material_cost,
      notes = complete_maintenance_ticket.notes,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance ticket not found';
  END IF;

  -- Send Notification to Reporter (if different from completer)
  IF notification_payload IS NOT NULL AND v_ticket.reported_by IS NOT NULL AND v_ticket.reported_by != completer_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      v_ticket.reported_by, 
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
