-- RoleManagement.tsx writes directly to user_roles from the browser client (no RPC). The
-- existing RLS policies only checked that the caller HAS an admin/hr role -- they placed no
-- restriction on which role VALUE could be granted or which existing role row could be
-- touched. Net effect: a regional_admin (hierarchy level 2) could grant themselves or anyone
-- corporate_admin (level 1) or even super_admin (level 0), and could delete/downgrade the role
-- rows of real admins above them. The create-user edge function already enforces a hierarchy
-- check (APP_ROLE_PRIORITY[target] <= APP_ROLE_PRIORITY[inviterBestRole] => forbidden) for
-- invites -- this brings the same rule to direct user_roles writes.

CREATE OR REPLACE FUNCTION public.get_role_priority(_role app_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE _role
    WHEN 'super_admin' THEN 0
    WHEN 'corporate_admin' THEN 1
    WHEN 'regional_admin' THEN 2
    WHEN 'regional_hr' THEN 3
    WHEN 'property_manager' THEN 4
    WHEN 'property_hr' THEN 5
    WHEN 'department_head' THEN 6
    WHEN 'manager' THEN 7
    WHEN 'staff' THEN 8
  END
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_priority(_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MIN(public.get_role_priority(role)), 999)
  FROM public.user_roles
  WHERE user_id = _user_id
$function$;

COMMENT ON FUNCTION public.get_user_role_priority IS
    'Lowest (= most privileged) role priority held by a user. 999 if they hold no role. Used to gate user_roles writes so an admin can only grant/revoke roles strictly below their own level.';

DROP POLICY IF EXISTS user_roles_modify_admin_hr_insert ON public.user_roles;
CREATE POLICY user_roles_modify_admin_hr_insert ON public.user_roles
FOR INSERT
WITH CHECK (
    (has_role(auth.uid(), 'regional_admin'::app_role) OR has_role(auth.uid(), 'regional_hr'::app_role))
    AND public.get_role_priority(role) > public.get_user_role_priority(auth.uid())
);

DROP POLICY IF EXISTS user_roles_modify_admin_hr_update ON public.user_roles;
CREATE POLICY user_roles_modify_admin_hr_update ON public.user_roles
FOR UPDATE
USING (
    (has_role(auth.uid(), 'regional_admin'::app_role) OR has_role(auth.uid(), 'regional_hr'::app_role))
    AND public.get_role_priority(role) > public.get_user_role_priority(auth.uid())
)
WITH CHECK (
    (has_role(auth.uid(), 'regional_admin'::app_role) OR has_role(auth.uid(), 'regional_hr'::app_role))
    AND public.get_role_priority(role) > public.get_user_role_priority(auth.uid())
);

DROP POLICY IF EXISTS user_roles_modify_admin_hr_delete ON public.user_roles;
CREATE POLICY user_roles_modify_admin_hr_delete ON public.user_roles
FOR DELETE
USING (
    (has_role(auth.uid(), 'regional_admin'::app_role) OR has_role(auth.uid(), 'regional_hr'::app_role))
    AND public.get_role_priority(role) > public.get_user_role_priority(auth.uid())
);
