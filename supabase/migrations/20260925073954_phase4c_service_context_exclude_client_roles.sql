-- The session_user fallback (cron, migrations) must never apply to a request
-- that carries a client role, however the connection was made.
CREATE OR REPLACE FUNCTION public._p7_is_service_context()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NULL AND (
    auth.role() = 'service_role'
    OR (session_user IN ('postgres', 'supabase_admin')
        AND COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  );
$function$;
