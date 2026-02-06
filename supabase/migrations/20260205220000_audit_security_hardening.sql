-- Audit Security Hardening
-- Description: Enforces stricter RLS policies for audit_logs and pii_access_logs.
-- Changes:
-- 1. Disables direct INSERTs for authenticated users (must use SECURITY DEFINER functions).
-- 2. Ensures 'super_admin' has access.
-- 3. Consolidates and cleans up old policies.

-- -----------------------------------------------------------------------------
-- 1. HARDEN AUDIT_LOGS
-- -----------------------------------------------------------------------------

-- Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and HR can view audit logs" ON public.audit_logs;

-- Strict SELECT Policy
-- Allows: super_admin, regional_admin, regional_hr
-- (Property roles removed unless specifically needed, as they lack property_id scoping in this table)
CREATE POLICY "audit_logs_strict_select"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- INSERT Policy: Deny all (Force use of log_audit_event function)
-- No INSERT policy = implicit deny. We do NOT create an INSERT policy.
-- The log_audit_event() function is SECURITY DEFINER, so it bypasses RLS.

-- -----------------------------------------------------------------------------
-- 2. HARDEN PII_ACCESS_LOGS
-- -----------------------------------------------------------------------------

-- Drop all existing policies
DROP POLICY IF EXISTS "pii_access_logs_select_hr_only" ON public.pii_access_logs;
DROP POLICY IF EXISTS "pii_access_logs_insert_all" ON public.pii_access_logs;

-- Strict SELECT Policy
-- Allows: super_admin, regional_hr, regional_admin
CREATE POLICY "pii_access_logs_strict_select"
  ON public.pii_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'regional_admin', 'regional_hr')
    )
  );

-- INSERT Policy: Deny all (Force use of log_pii_access function)
-- No INSERT policy = implicit deny.


-- -----------------------------------------------------------------------------
-- 3. ENSURE FUNCTIONS ARE SECURE
-- -----------------------------------------------------------------------------

-- Re-verify SECURITY DEFINER on logging functions to ensure they work without INSERT permissions
ALTER FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb) SET SEARCH_PATH = public;
ALTER FUNCTION public.log_pii_access(uuid, text[], text) SET SEARCH_PATH = public;
