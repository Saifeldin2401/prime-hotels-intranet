do $$
declare
  r record;
  role_list text;
  using_expr text;
  check_expr text;
begin
  for r in
    select distinct a.tablename, a.policyname, a.roles, a.qual, a.with_check
    from pg_policies a
    join pg_policies s
      on s.schemaname = a.schemaname
     and s.tablename = a.tablename
     and s.permissive = a.permissive
    where a.schemaname = 'public'
      and a.permissive = 'PERMISSIVE'
      and a.cmd = 'ALL'
      and s.cmd = 'SELECT'
      and (
        a.roles && s.roles
        or a.roles @> array['public']::name[]
        or s.roles @> array['public']::name[]
      )
      and a.tablename not in ('announcement_reads','profiles','notifications')
  loop
    role_list := array_to_string(r.roles, ', ');
    role_list := coalesce(nullif(role_list, ''), 'public');
    using_expr := coalesce(r.qual, 'true');
    check_expr := coalesce(r.with_check, using_expr);

    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
    execute format('create policy %I on public.%I for insert to %s with check (%s);', r.policyname || '_insert', r.tablename, role_list, check_expr);
    execute format('create policy %I on public.%I for update to %s using (%s) with check (%s);', r.policyname || '_update', r.tablename, role_list, using_expr, check_expr);
    execute format('create policy %I on public.%I for delete to %s using (%s);', r.policyname || '_delete', r.tablename, role_list, using_expr);
  end loop;
end $$;

-- announcement_reads: merge manage + insert, keep select
 drop policy if exists announcement_reads_manage on public.announcement_reads;
 drop policy if exists announcement_reads_insert_users on public.announcement_reads;

 create policy announcement_reads_insert_users
   on public.announcement_reads
   for insert to authenticated
   with check ((user_id = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::app_role));

 create policy announcement_reads_manage_update
   on public.announcement_reads
   for update to authenticated
   using ((user_id = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::app_role))
   with check ((user_id = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::app_role));

 create policy announcement_reads_manage_delete
   on public.announcement_reads
   for delete to authenticated
   using ((user_id = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::app_role));

-- profiles: split manage policy and consolidate update
 drop policy if exists profiles_manage_policy on public.profiles;
 drop policy if exists profiles_update_policy on public.profiles;

 create policy profiles_manage_policy_insert
   on public.profiles
   for insert to authenticated
   with check ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));

 create policy profiles_manage_policy_delete
   on public.profiles
   for delete to authenticated
   using ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));

 create policy profiles_update_policy
   on public.profiles
   for update to authenticated
   using ((id = auth.uid()) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role))
   with check ((id = auth.uid()) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role));

-- notifications: drop ALL policy, expand select/update to include admins, add delete
 drop policy if exists notifications_manage_admin on public.notifications;

 alter policy notifications_select_own
   on public.notifications
   using ((user_id = auth.uid()) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role));

 alter policy notifications_update_own
   on public.notifications
   using ((user_id = auth.uid()) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role))
   with check ((user_id = auth.uid()) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role));

 create policy notifications_delete_admin
   on public.notifications
   for delete to authenticated
   using ((has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role)));
;
