-- Function to clean up old audit logs (older than 3 years)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - INTERVAL '3 years';
END;
$$;

-- Function to clean up old PII access logs (older than 7 years)
CREATE OR REPLACE FUNCTION public.cleanup_old_pii_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pii_access_logs
  WHERE created_at < now() - INTERVAL '7 years';
END;
$$;;
