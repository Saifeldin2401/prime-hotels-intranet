-- Allow Regional HR to manage user roles, properties, and departments
-- Fixes 403 errors when updating users via client-side admin tools.

BEGIN;

-- user_roles
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_policy" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
);

CREATE POLICY "user_roles_manage_policy" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
)
WITH CHECK (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
);

-- user_properties
DROP POLICY IF EXISTS "user_properties_select_policy" ON public.user_properties;
DROP POLICY IF EXISTS "user_properties_manage_policy" ON public.user_properties;

CREATE POLICY "user_properties_select_policy" ON public.user_properties
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
  OR public.has_role_optimized('property_manager'::public.app_role)
);

CREATE POLICY "user_properties_manage_policy" ON public.user_properties
FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
)
WITH CHECK (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
);

-- user_departments
DROP POLICY IF EXISTS "user_departments_select_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_manage_policy" ON public.user_departments;

CREATE POLICY "user_departments_select_policy" ON public.user_departments
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
  OR public.has_role_optimized('property_manager'::public.app_role)
);

CREATE POLICY "user_departments_manage_policy" ON public.user_departments
FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
)
WITH CHECK (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
);

COMMIT;
NOTIFY pgrst, 'reload schema';;
