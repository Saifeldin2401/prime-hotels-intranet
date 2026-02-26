alter function public.get_task_stats(user_id_param uuid, property_id_param uuid, department_id_param uuid)
  set search_path = public, pg_temp;

alter function public.get_dashboard_stats(user_uuid uuid)
  set search_path = public, pg_temp;

drop policy if exists "Full access to question options_delete" on public.knowledge_question_options;
drop policy if exists "Full access to question options_insert" on public.knowledge_question_options;
drop policy if exists "Full access to question options_update" on public.knowledge_question_options;

drop policy if exists "HR can view versions" on public.knowledge_question_versions;

alter policy knowledge_question_options_admin_owner_delete on public.knowledge_question_options
  using (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('regional_hr'::app_role)
    or has_role_optimized('property_manager'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or exists (
      select 1
      from knowledge_questions q
      where q.id = knowledge_question_options.question_id
        and q.created_by = (select auth.uid())
    )
  );

alter policy knowledge_question_options_admin_owner_insert on public.knowledge_question_options
  with check (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('regional_hr'::app_role)
    or has_role_optimized('property_manager'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or exists (
      select 1
      from knowledge_questions q
      where q.id = knowledge_question_options.question_id
        and q.created_by = (select auth.uid())
    )
  );

alter policy knowledge_question_options_admin_owner_update on public.knowledge_question_options
  using (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('regional_hr'::app_role)
    or has_role_optimized('property_manager'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or exists (
      select 1
      from knowledge_questions q
      where q.id = knowledge_question_options.question_id
        and q.created_by = (select auth.uid())
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
      from knowledge_questions q
      where q.id = knowledge_question_options.question_id
        and q.created_by = (select auth.uid())
    )
  );

alter policy knowledge_question_versions_admin_owner_insert on public.knowledge_question_versions
  with check (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('regional_hr'::app_role)
    or has_role_optimized('property_manager'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or exists (
      select 1
      from knowledge_questions q
      where q.id = knowledge_question_versions.question_id
        and q.created_by = (select auth.uid())
    )
  );

alter policy knowledge_question_versions_admin_owner_select on public.knowledge_question_versions
  using (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('regional_hr'::app_role)
    or has_role_optimized('property_manager'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or exists (
      select 1
      from knowledge_questions q
      where q.id = knowledge_question_versions.question_id
        and q.created_by = (select auth.uid())
    )
  );;
