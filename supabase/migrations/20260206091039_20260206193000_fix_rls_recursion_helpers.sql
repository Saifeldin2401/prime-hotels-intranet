-- Migration: Fix RLS recursion helpers
-- Date: 2026-02-06
-- Description: Make role/property helper functions SECURITY DEFINER and bypass RLS

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_roles()
 RETURNS public.app_role[]
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security = off
AS $function$
  SELECT COALESCE(array_agg(role), '{}')
  FROM public.user_roles
  WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.has_property_access(uid uuid, prop_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_properties
    WHERE user_id = uid AND property_id = prop_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid
      AND role IN (
        'corporate_admin'::public.app_role,
        'regional_admin'::public.app_role,
        'regional_hr'::public.app_role
      )
  );
$function$;

COMMIT;
NOTIFY pgrst, 'reload schema';;
