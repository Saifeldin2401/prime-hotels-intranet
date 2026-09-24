-- This BEFORE UPDATE trigger fires on every maintenance_tickets update and set a column
-- "resolved_at" that has never existed (real column: actual_completion_date, or completed_at
-- for the timestamp used elsewhere) -- so ANY transition of a ticket's status to 'completed',
-- through any code path whatsoever, has always failed with "record NEW has no field
-- resolved_at". No maintenance ticket has ever been completable in this app.
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
