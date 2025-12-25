-- Function to calculate and update onboarding progress
create or replace function public.calculate_onboarding_progress()
returns trigger as $$
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
      when v_progress_percent = 100 then 'completed'::entity_status
      when v_progress_percent > 0 then 'in_progress'::entity_status
      else 'pending'::entity_status
    end,
    updated_at = now()
  where id = v_process_id;

  return null;
end;
$$ language plpgsql security definer;

-- Trigger to calculate progress on task status changes
drop trigger if exists trg_update_onboarding_progress on public.onboarding_tasks;
create trigger trg_update_onboarding_progress
after insert or update of status or delete on public.onboarding_tasks
for each row
execute function public.calculate_onboarding_progress();
