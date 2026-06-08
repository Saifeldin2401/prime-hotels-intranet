-- Match the live production fix that removed recursive role checks by making
-- the role helper functions run as SECURITY DEFINER under postgres.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(role), '{}'::public.app_role[])
  FROM public.user_roles
  WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.has_role_optimized(check_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT check_role = ANY(public.get_my_roles());
$function$;

CREATE OR REPLACE FUNCTION public.get_user_properties(user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(property_id), ARRAY[]::uuid[])
  FROM public.user_properties
  WHERE user_id = $1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_departments(user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(department_id), ARRAY[]::uuid[])
  FROM public.user_departments
  WHERE user_id = $1;
$function$;

COMMIT;
