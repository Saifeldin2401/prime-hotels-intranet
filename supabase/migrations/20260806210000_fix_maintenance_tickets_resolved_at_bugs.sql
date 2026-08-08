-- Discovered while testing the authorization fix in the prior migration: maintenance_tickets
-- has never had a "resolved_at" column (the real columns are completed_at and
-- actual_completion_date), but TWO separate functions referenced it:
--
-- 1. apply_maintenance_sla() (BEFORE INSERT/UPDATE OF priority, due_at trigger) also compared
--    maintenance_sla_policies.priority (text) to maintenance_tickets.priority
--    (maintenance_priority enum) with no cast -- Postgres has no implicit operator for that, so
--    EVERY insert into maintenance_tickets with due_at IS NULL (virtually all new tickets) threw
--    "operator does not exist: text = maintenance_priority". No maintenance ticket could ever be
--    created.
--
-- 2. update_maintenance_tickets_updated_at() (BEFORE UPDATE trigger, fires on every update) set
--    new.resolved_at whenever status transitioned to 'completed' -- a column that doesn't exist,
--    so "record NEW has no field resolved_at" fired on every attempt to complete a ticket,
--    through any code path (not just the RPC fixed in the prior migration).
--
-- Verified live: after this fix, a full insert -> complete round trip via
-- complete_maintenance_ticket() succeeds and returns completed_at/actual_completion_date
-- populated correctly.

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

CREATE OR REPLACE FUNCTION public.update_maintenance_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();

  if old.status != 'completed' and new.status = 'completed' then
    new.actual_completion_date = now();
  end if;

  return new;
end;
$function$;
