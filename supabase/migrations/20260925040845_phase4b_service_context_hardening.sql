-- Phase 4b: Harden _p7_is_service_context to require auth.uid() IS NULL.
-- In PostgreSQL, SECURITY DEFINER functions run with current_user = 'postgres'.
-- Checking current_user IN ('postgres', 'service_role') caused any caller inside
-- a SECURITY DEFINER function to be treated as a trusted service context.
-- Now, only true server/service contexts (migrations, background workers, edge
-- functions with service_role key, where auth.uid() IS NULL) qualify.

CREATE OR REPLACE FUNCTION public._p7_is_service_context()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NULL AND (
    NULLIF(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin', 'service_role')
  );
$function$;
