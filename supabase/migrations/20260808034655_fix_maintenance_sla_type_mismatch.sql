-- BEFORE INSERT OR UPDATE trigger on maintenance_tickets compared p.priority (text) to
-- NEW.priority (maintenance_priority enum) with no cast -- Postgres has no implicit operator
-- for enum = text, so EVERY insert into maintenance_tickets with due_at IS NULL (i.e. almost
-- every new ticket; due_at is normally auto-derived here, not supplied by the reporter) raised
-- "operator does not exist: text = maintenance_priority" and the whole insert failed. This has
-- been blocking all maintenance ticket creation.
CREATE OR REPLACE FUNCTION public.apply_maintenance_sla()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_sla_hours integer;
BEGIN
  IF NEW.due_at IS NULL THEN
    SELECT p.sla_hours INTO v_sla_hours
    FROM public.maintenance_sla_policies p
    WHERE p.is_active = true
      AND p.priority = NEW.priority::text
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_sla_hours IS NOT NULL THEN
      NEW.sla_hours := v_sla_hours;
      NEW.due_at := now() + make_interval(hours => v_sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
