-- Phase 4c: _p7_is_service_context() (hardened in 4b) read the service role only
-- from the legacy request.jwt.claim.role GUC. Current PostgREST passes claims
-- as JSON in request.jwt.claims, so edge functions calling with the
-- service-role key (emit_platform_event, get_tenant_email_context,
-- consume_ai_credit, ...) were treated as untrusted. auth.role() reads both.
CREATE OR REPLACE FUNCTION public._p7_is_service_context()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NULL AND (
    auth.role() = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );
$function$;
