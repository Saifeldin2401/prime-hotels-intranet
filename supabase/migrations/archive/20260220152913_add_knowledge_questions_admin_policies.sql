do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_questions'
      and policyname='knowledge_questions_admin_select'
  ) then
    create policy knowledge_questions_admin_select
      on public.knowledge_questions
      for select
      to authenticated
      using (
        has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
        or has_role_optimized('regional_hr'::app_role)
        or has_role_optimized('property_manager'::app_role)
        or has_role_optimized('property_hr'::app_role)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_questions'
      and policyname='knowledge_questions_admin_update'
  ) then
    create policy knowledge_questions_admin_update
      on public.knowledge_questions
      for update
      to authenticated
      using (
        has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
        or has_role_optimized('regional_hr'::app_role)
        or has_role_optimized('property_manager'::app_role)
        or has_role_optimized('property_hr'::app_role)
      );
  end if;
end $$;;
