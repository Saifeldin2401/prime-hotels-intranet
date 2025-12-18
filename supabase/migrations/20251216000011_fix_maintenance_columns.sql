-- Standardize Maintenance Ticket Columns (2025-12-16)

-- 1. Rename Columns to use _id suffix
ALTER TABLE maintenance_tickets 
RENAME COLUMN reported_by TO reported_by_id;

ALTER TABLE maintenance_tickets 
RENAME COLUMN assigned_to TO assigned_to_id;

-- 2. Rename Constraints for consistency
ALTER TABLE maintenance_tickets
RENAME CONSTRAINT maintenance_tickets_reported_by_fkey TO maintenance_tickets_reported_by_id_fkey;

ALTER TABLE maintenance_tickets
RENAME CONSTRAINT maintenance_tickets_assigned_to_fkey TO maintenance_tickets_assigned_to_id_fkey;

-- 3. Re-create Indexes with new names
DROP INDEX IF EXISTS idx_maintenance_reported_by;
DROP INDEX IF EXISTS idx_maintenance_assigned_to;
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_by_id ON public.maintenance_tickets (reported_by_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to_id ON public.maintenance_tickets (assigned_to_id);

-- 4. Update Atomic RPCs to use new column names

-- Assign Maintenance Ticket Atomic
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
  IF assigner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Assigner ID mismatch';
  END IF;

  IF assigned_to_id IS NOT NULL THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'open';
  END IF;

  UPDATE maintenance_tickets
  SET assigned_to_id = assign_maintenance_ticket.assigned_to_id, -- Corrected column name
      status = v_new_status,
      updated_at = NOW()
  WHERE id = ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance ticket not found';
  END IF;

  IF notification_payload IS NOT NULL AND assign_maintenance_ticket.assigned_to_id IS NOT NULL AND assign_maintenance_ticket.assigned_to_id != assigner_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      assign_maintenance_ticket.assigned_to_id,
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


-- Complete Maintenance Ticket Atomic
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

  -- Update to use reported_by_id
  IF notification_payload IS NOT NULL AND v_ticket.reported_by_id IS NOT NULL AND v_ticket.reported_by_id != completer_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      v_ticket.reported_by_id, 
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
