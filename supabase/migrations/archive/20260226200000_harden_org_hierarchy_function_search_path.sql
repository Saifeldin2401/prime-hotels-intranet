-- Harden function execution context by pinning search_path.
BEGIN;

ALTER FUNCTION public.check_circular_reporting() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_direct_reports(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_org_hierarchy(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_reporting_chain(uuid) SET search_path = public, pg_temp;

COMMIT;
