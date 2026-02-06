-- Stabilization: remaining Supabase Advisor fixes

-- ============================================================================
-- SECURITY: remove overly permissive policy on ai_manager_digests
-- ============================================================================

DROP POLICY IF EXISTS "Service can manage digests" ON public.ai_manager_digests;

-- Restrict management to service_role only
CREATE POLICY "Service can manage digests"
  ON public.ai_manager_digests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECURITY: fix function_search_path_mutable for public functions
-- Supabase linter flags functions without an explicit search_path.
-- ============================================================================

DO $fn$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proconfig IS NULL OR
        NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) c
          WHERE c LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema_name, r.function_name, r.args);
  END LOOP;
END;
$fn$;
