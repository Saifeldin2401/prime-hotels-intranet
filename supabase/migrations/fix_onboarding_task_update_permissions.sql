-- Standardize onboarding task update permissions
-- Allows: assigned user, process owner (hiree), and management roles

drop policy if exists "Users can update their own tasks" on public.onboarding_tasks;

create policy "Users can update relevant onboarding tasks"
  on public.onboarding_tasks for update
  using (
    assigned_to_id = auth.uid() OR
    exists (
        select 1 from public.onboarding_process p
        where p.id = process_id and (p.user_id = auth.uid() OR p.mentor_id = auth.uid())
    ) OR
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() 
      and r.role in ('regional_admin', 'property_manager', 'department_head')
    )
  );
