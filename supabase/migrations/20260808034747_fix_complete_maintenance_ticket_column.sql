-- complete_maintenance_ticket set a column "resolved_at" that has never existed on
-- maintenance_tickets (the real column is completed_at) -- every call to this RPC has always
-- failed with "column resolved_at does not exist". Completing a maintenance ticket has never
-- worked. Discovered while testing the authorization fix above.
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

REVOKE EXECUTE ON FUNCTION public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb) TO authenticated;
