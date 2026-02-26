do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='training_assignment_rules' and policyname='training_assignment_rules_select') then
    drop policy "training_assignment_rules_select" on public.training_assignment_rules;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='training_assignment_rules' and policyname='training_assignment_rules_insert') then
    drop policy "training_assignment_rules_insert" on public.training_assignment_rules;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='training_assignment_rules' and policyname='training_assignment_rules_update') then
    drop policy "training_assignment_rules_update" on public.training_assignment_rules;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='training_assignment_rules' and policyname='training_assignment_rules_delete') then
    drop policy "training_assignment_rules_delete" on public.training_assignment_rules;
  end if;

  create policy "training_assignment_rules_select" on public.training_assignment_rules
    for select
    to public
    using ((select auth.uid()) in (
      select ur.user_id
      from public.user_roles ur
      where ur.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])
    ));

  create policy "training_assignment_rules_insert" on public.training_assignment_rules
    for insert
    to public
    with check ((select auth.uid()) in (
      select ur.user_id
      from public.user_roles ur
      where ur.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])
    ));

  create policy "training_assignment_rules_update" on public.training_assignment_rules
    for update
    to public
    using ((select auth.uid()) in (
      select ur.user_id
      from public.user_roles ur
      where ur.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])
    ))
    with check ((select auth.uid()) in (
      select ur.user_id
      from public.user_roles ur
      where ur.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])
    ));

  create policy "training_assignment_rules_delete" on public.training_assignment_rules
    for delete
    to public
    using ((select auth.uid()) in (
      select ur.user_id
      from public.user_roles ur
      where ur.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role])
    ));
end $$;
;
