-- Consolidate duplicate permissive SELECT policies to reduce RLS policy fanout.
-- Semantics are preserved by merging "own" and "admin" visibility with OR logic.

BEGIN;

-- user_roles
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;

CREATE POLICY user_roles_select_self_or_admin
ON public.user_roles
FOR SELECT
TO public
USING (
  user_id = auth.uid()
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

-- user_properties
DROP POLICY IF EXISTS user_properties_select_admin ON public.user_properties;
DROP POLICY IF EXISTS user_properties_select_own ON public.user_properties;
DROP POLICY IF EXISTS user_properties_select_self_or_admin ON public.user_properties;

CREATE POLICY user_properties_select_self_or_admin
ON public.user_properties
FOR SELECT
TO public
USING (
  user_id = auth.uid()
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

-- user_departments
DROP POLICY IF EXISTS user_departments_select_admin ON public.user_departments;
DROP POLICY IF EXISTS user_departments_select_own ON public.user_departments;
DROP POLICY IF EXISTS user_departments_select_self_or_admin ON public.user_departments;

CREATE POLICY user_departments_select_self_or_admin
ON public.user_departments
FOR SELECT
TO public
USING (
  user_id = auth.uid()
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
