do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_question_versions'
      and policyname='knowledge_question_versions_admin_owner_select'
  ) then
    create policy knowledge_question_versions_admin_owner_select
      on public.knowledge_question_versions
      for select
      to authenticated
      using (
        has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
        or has_role_optimized('regional_hr'::app_role)
        or has_role_optimized('property_manager'::app_role)
        or has_role_optimized('property_hr'::app_role)
        or exists (
          select 1
          from public.knowledge_questions q
          where q.id = knowledge_question_versions.question_id
            and q.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_question_versions'
      and policyname='knowledge_question_versions_admin_owner_insert'
  ) then
    create policy knowledge_question_versions_admin_owner_insert
      on public.knowledge_question_versions
      for insert
      to authenticated
      with check (
        has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
        or has_role_optimized('regional_hr'::app_role)
        or has_role_optimized('property_manager'::app_role)
        or has_role_optimized('property_hr'::app_role)
        or exists (
          select 1
          from public.knowledge_questions q
          where q.id = knowledge_question_versions.question_id
            and q.created_by = auth.uid()
        )
      );
  end if;
end $$;;
