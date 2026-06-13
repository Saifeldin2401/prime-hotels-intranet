-- Optimize RLS initplans by wrapping auth.uid() calls in SELECT.

BEGIN;

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin
ON public.user_roles
FOR SELECT
TO public
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM unnest(get_my_roles()) r(r)
    WHERE r.r = ANY (ARRAY[
      'corporate_admin'::app_role,
      'regional_admin'::app_role,
      'regional_hr'::app_role,
      'property_manager'::app_role
    ])
  )
);

DROP POLICY IF EXISTS user_properties_select_self_or_admin ON public.user_properties;
CREATE POLICY user_properties_select_self_or_admin
ON public.user_properties
FOR SELECT
TO public
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM unnest(get_my_roles()) r(r)
    WHERE r.r = ANY (ARRAY[
      'corporate_admin'::app_role,
      'regional_admin'::app_role,
      'regional_hr'::app_role,
      'property_manager'::app_role
    ])
  )
);

DROP POLICY IF EXISTS user_departments_select_self_or_admin ON public.user_departments;
CREATE POLICY user_departments_select_self_or_admin
ON public.user_departments
FOR SELECT
TO public
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM unnest(get_my_roles()) r(r)
    WHERE r.r = ANY (ARRAY[
      'corporate_admin'::app_role,
      'regional_admin'::app_role,
      'regional_hr'::app_role,
      'property_manager'::app_role
    ])
  )
);

COMMIT;
