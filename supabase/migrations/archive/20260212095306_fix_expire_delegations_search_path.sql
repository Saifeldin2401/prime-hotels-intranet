-- Fix security: Set immutable search_path on expire_delegations function
CREATE OR REPLACE FUNCTION expire_delegations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_delegations
  SET is_active = false, auto_expired = true, updated_at = now()
  WHERE is_active = true AND ends_at < now();
END;
$$;;
