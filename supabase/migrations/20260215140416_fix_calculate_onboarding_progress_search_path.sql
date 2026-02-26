-- Fix SECURITY DEFINER function search_path and schema-qualify enum casts.
-- Without this, Postgres may fail to resolve `entity_status` when search_path is empty.

create or replace function public.calculate_onboarding_progress()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_process_id uuid;
  v_total_tasks integer;
  v_completed_tasks integer;
  v_progress_percent integer;
begin
  -- Get the process id (handle both INSERT/UPDATE and DELETE if needed)
  if (TG_OP = 'DELETE') then
    v_process_id := old.process_id;
  else
    v_process_id := new.process_id;
  end if;

  -- 1. Count total tasks for this process
  select count(*) into v_total_tasks
  from public.onboarding_tasks
  where process_id = v_process_id;

  -- 2. Count completed tasks
  select count(*) into v_completed_tasks
  from public.onboarding_tasks
  where process_id = v_process_id
  and status = 'completed';

  -- 3. Calculate percentage
  if v_total_tasks > 0 then
    v_progress_percent := (v_completed_tasks * 100) / v_total_tasks;
  else
    v_progress_percent := 0;
  end if;

  -- 4. Update the onboarding_process table
  update public.onboarding_process
  set
    progress_percent = v_progress_percent,
    status = case
      when v_progress_percent = 100 then 'completed'::public.entity_status
      when v_progress_percent > 0 then 'in_progress'::public.entity_status
      else 'pending'::public.entity_status
    end,
    updated_at = now()
  where id = v_process_id;

  return null;
end;
$function$;;
