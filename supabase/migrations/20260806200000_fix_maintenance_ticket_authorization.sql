-- complete_maintenance_ticket only checked completer_id = auth.uid() (self-consistency, not
-- real authorization) -- any authenticated user could mark ANY maintenance ticket at ANY
-- property completed and set its labor_hours/material_cost/notes. Now requires the caller be
-- either the ticket's assigned technician or hold a manager/admin-tier role.
--
-- assign_maintenance_ticket separately allowed bare 'staff' (the default role most employees
-- hold) with no property scoping, so effectively any employee could reassign any ticket at any
-- property. Tightened to manager-tier roles scoped to the ticket's own property.

DROP FUNCTION IF EXISTS public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb);
CREATE OR REPLACE FUNCTION public.complete_maintenance_ticket(
  ticket_id uuid,
  completer_id uuid,
  labor_hours numeric DEFAULT NULL::numeric,
  material_cost numeric DEFAULT NULL::numeric,
  notes text DEFAULT NULL::text,
  notification_payload jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_ticket maintenance_tickets%rowtype;
  v_assigned_to uuid;
  v_property_id uuid;
begin
  if completer_id != auth.uid() then
    raise exception 'Unauthorized: Completer ID mismatch';
  end if;

  select assigned_to_id, property_id into v_assigned_to, v_property_id
  from maintenance_tickets where id = complete_maintenance_ticket.ticket_id;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if v_assigned_to is distinct from auth.uid()
     and not (
       has_property_access(auth.uid(), v_property_id)
       and exists (
         select 1 from user_roles
         where user_id = auth.uid()
           and role in ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
       )
     ) then
    raise exception 'Unauthorized: only the assigned technician or a manager/admin at this property may complete this ticket';
  end if;

  update maintenance_tickets
  set status = 'completed',
      labor_hours = complete_maintenance_ticket.labor_hours,
      material_cost = complete_maintenance_ticket.material_cost,
      notes = complete_maintenance_ticket.notes,
      completed_at = now(),
      updated_at = now()
  where id = ticket_id
  returning * into v_ticket;

  if notification_payload is not null and v_ticket.reported_by_id is not null and v_ticket.reported_by_id != completer_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      v_ticket.reported_by_id,
      public.safe_notification_type(notification_payload->>'type', 'maintenance_resolved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$function$;

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
SET search_path TO 'public'
AS $function$
declare
  v_ticket maintenance_tickets%rowtype;
  v_new_status maintenance_tickets.status%type;
  v_property_id uuid;
begin
  if p_assigner_id != auth.uid() then
    raise exception 'Unauthorized: Assigner ID mismatch';
  end if;

  select property_id into v_property_id from maintenance_tickets where id = p_ticket_id;
  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if not (
    has_property_access(auth.uid(), v_property_id)
    and exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
    )
  ) then
    raise exception 'Unauthorized: Insufficient permissions to assign tickets at this property';
  end if;

  if p_assigned_to_id is not null then
    v_new_status := 'in_progress';
  else
    v_new_status := 'open';
  end if;

  update maintenance_tickets
  set assigned_to_id = p_assigned_to_id,
      status = v_new_status,
      updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if p_notification_payload is not null and p_assigned_to_id is not null and p_assigned_to_id != p_assigner_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      p_assigned_to_id,
      public.safe_notification_type(p_notification_payload->>'type', 'maintenance_assigned'::public.notification_type),
      p_notification_payload->>'title',
      p_notification_payload->>'message',
      p_notification_payload->>'link',
      coalesce(p_notification_payload->'metadata', p_notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$function$;

-- Both DROP FUNCTION calls above reset default privileges (which include anon) -- restore the
-- original authenticated-only grants.
REVOKE EXECUTE ON FUNCTION public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_maintenance_ticket(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_maintenance_ticket(uuid, uuid, uuid, jsonb) TO authenticated;
