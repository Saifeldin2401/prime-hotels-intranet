do $$
begin
  -- trigger_rules policy
  if exists (select 1 from pg_policies where schemaname='public' and tablename='trigger_rules' and policyname='Admins can manage trigger rules') then
    drop policy "Admins can manage trigger rules" on public.trigger_rules;
  end if;
  create policy "Admins can manage trigger rules" on public.trigger_rules
    for all
    to authenticated
    using (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])
      )
    )
    with check (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])
      )
    );

  -- workflow_steps policy
  if exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_steps' and policyname='Admins can manage workflow steps') then
    drop policy "Admins can manage workflow steps" on public.workflow_steps;
  end if;
  create policy "Admins can manage workflow steps" on public.workflow_steps
    for all
    to authenticated
    using (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])
      )
    )
    with check (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'regional_hr'::app_role,'property_manager'::app_role,'property_hr'::app_role])
      )
    );

  -- workflow_definitions manage policies
  if exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_definitions' and policyname='workflow_definitions_admin_manage_insert') then
    drop policy "workflow_definitions_admin_manage_insert" on public.workflow_definitions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_definitions' and policyname='workflow_definitions_admin_manage_update') then
    drop policy "workflow_definitions_admin_manage_update" on public.workflow_definitions;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_definitions' and policyname='workflow_definitions_admin_manage_delete') then
    drop policy "workflow_definitions_admin_manage_delete" on public.workflow_definitions;
  end if;

  create policy "workflow_definitions_admin_manage_insert" on public.workflow_definitions
    for insert
    to authenticated
    with check (
      'corporate_admin'::app_role = any (get_my_roles())
      or 'regional_admin'::app_role = any (get_my_roles())
    );

  create policy "workflow_definitions_admin_manage_update" on public.workflow_definitions
    for update
    to authenticated
    using (
      'corporate_admin'::app_role = any (get_my_roles())
      or 'regional_admin'::app_role = any (get_my_roles())
    )
    with check (
      'corporate_admin'::app_role = any (get_my_roles())
      or 'regional_admin'::app_role = any (get_my_roles())
    );

  create policy "workflow_definitions_admin_manage_delete" on public.workflow_definitions
    for delete
    to authenticated
    using (
      'corporate_admin'::app_role = any (get_my_roles())
      or 'regional_admin'::app_role = any (get_my_roles())
    );

  -- task_templates policies
  if exists (select 1 from pg_policies where schemaname='public' and tablename='task_templates' and policyname='Staff can view templates') then
    drop policy "Staff can view templates" on public.task_templates;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='task_templates' and policyname='task_templates_insert') then
    drop policy "task_templates_insert" on public.task_templates;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='task_templates' and policyname='task_templates_update') then
    drop policy "task_templates_update" on public.task_templates;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='task_templates' and policyname='task_templates_delete') then
    drop policy "task_templates_delete" on public.task_templates;
  end if;

  create policy "Staff can view templates" on public.task_templates
    for select
    to public
    using (
      has_role((select auth.uid()), 'corporate_admin'::app_role)
      or has_role((select auth.uid()), 'regional_admin'::app_role)
      or has_property_access((select auth.uid()), property_id)
    );

  create policy "task_templates_insert" on public.task_templates
    for insert
    to public
    with check (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])
      )
    );

  create policy "task_templates_update" on public.task_templates
    for update
    to public
    using (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])
      )
    )
    with check (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])
      )
    );

  create policy "task_templates_delete" on public.task_templates
    for delete
    to public
    using (
      exists (
        select 1 from public.user_roles
        where user_roles.user_id = (select auth.uid())
          and user_roles.role = any (array['corporate_admin'::app_role,'regional_admin'::app_role,'property_manager'::app_role,'department_head'::app_role])
      )
    );
end $$;
;
