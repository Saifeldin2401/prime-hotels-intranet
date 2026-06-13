-- Ensure training modules are visible when assigned via user/department/role/property/everyone.
-- Also fix learning assignment visibility for non-admin users.

drop policy if exists learning_assignments_select_policy on public.learning_assignments;
create policy learning_assignments_select_policy
on public.learning_assignments
for select
to authenticated
using (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or has_role_optimized('property_hr'::app_role)
    or (
        coalesce(is_deleted, false) = false
        and (
            (target_type = 'user' and target_id = (select auth.uid())::text)
            or target_type = 'everyone'
            or (target_type = 'department' and target_id = any(get_user_departments(auth.uid())::text[]))
            or (target_type = 'property' and target_id = any(get_user_properties(auth.uid())::text[]))
            or (target_type = 'role' and target_id = any(get_my_roles()::text[]))
        )
    )
);

drop policy if exists training_modules_select_policy on public.training_modules;
create policy training_modules_select_policy
on public.training_modules
for select
to authenticated
using (
    has_role_optimized('corporate_admin'::app_role)
    or has_role_optimized('regional_admin'::app_role)
    or exists (
        select 1
        from public.learning_assignments la
        where la.content_id = training_modules.id
          and coalesce(la.is_deleted, false) = false
          and (
              (la.target_type = 'user' and la.target_id = (select auth.uid())::text)
              or la.target_type = 'everyone'
              or (la.target_type = 'department' and la.target_id = any(get_user_departments(auth.uid())::text[]))
              or (la.target_type = 'property' and la.target_id = any(get_user_properties(auth.uid())::text[]))
              or (la.target_type = 'role' and la.target_id = any(get_my_roles()::text[]))
          )
    )
);
;
