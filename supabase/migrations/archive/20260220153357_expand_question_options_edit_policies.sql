do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_question_options'
      and policyname='knowledge_question_options_admin_owner_insert'
  ) then
    create policy knowledge_question_options_admin_owner_insert
      on public.knowledge_question_options
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
          where q.id = knowledge_question_options.question_id
            and q.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_question_options'
      and policyname='knowledge_question_options_admin_owner_update'
  ) then
    create policy knowledge_question_options_admin_owner_update
      on public.knowledge_question_options
      for update
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
          where q.id = knowledge_question_options.question_id
            and q.created_by = auth.uid()
        )
      )
      with check (
        has_role_optimized('corporate_admin'::app_role)
        or has_role_optimized('regional_admin'::app_role)
        or has_role_optimized('regional_hr'::app_role)
        or has_role_optimized('property_manager'::app_role)
        or has_role_optimized('property_hr'::app_role)
        or exists (
          select 1
          from public.knowledge_questions q
          where q.id = knowledge_question_options.question_id
            and q.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='knowledge_question_options'
      and policyname='knowledge_question_options_admin_owner_delete'
  ) then
    create policy knowledge_question_options_admin_owner_delete
      on public.knowledge_question_options
      for delete
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
          where q.id = knowledge_question_options.question_id
            and q.created_by = auth.uid()
        )
      );
  end if;
end $$;;
