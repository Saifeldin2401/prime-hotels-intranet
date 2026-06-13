-- Merge audit_logs select policies
alter policy audit_logs_strict_select
  on public.audit_logs
  using (
    (EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role = ANY (ARRAY[
          'corporate_admin'::app_role,
          'regional_admin'::app_role,
          'regional_hr'::app_role,
          'property_manager'::app_role,
          'property_hr'::app_role
        ])
    ))
    OR (EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    ))
    OR auth_has_role((select auth.uid()), 'regional_admin'::text)
  );

drop policy if exists consolidated_audit_logs_select on public.audit_logs;

-- Replace auth.uid() calls with (select auth.uid()) to avoid per-row initplan
alter policy announcement_reads_insert_users
  on public.announcement_reads
  with check ((user_id = (select auth.uid())) OR has_role((select auth.uid()), 'regional_admin'::app_role));

alter policy announcement_reads_manage_update
  on public.announcement_reads
  using ((user_id = (select auth.uid())) OR has_role((select auth.uid()), 'regional_admin'::app_role))
  with check ((user_id = (select auth.uid())) OR has_role((select auth.uid()), 'regional_admin'::app_role));

alter policy announcement_reads_manage_delete
  on public.announcement_reads
  using ((user_id = (select auth.uid())) OR has_role((select auth.uid()), 'regional_admin'::app_role));

alter policy notifications_select_own
  on public.notifications
  using ((user_id = (select auth.uid())) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role));

alter policy notifications_update_own
  on public.notifications
  using ((user_id = (select auth.uid())) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role))
  with check ((user_id = (select auth.uid())) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role));

alter policy profiles_update_policy
  on public.profiles
  using ((id = (select auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role))
  with check ((id = (select auth.uid())) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role));
;
