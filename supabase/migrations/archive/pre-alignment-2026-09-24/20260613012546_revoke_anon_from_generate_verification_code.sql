-- =============================================================================
-- Revoke anon EXECUTE from generate_verification_code()
-- =============================================================================
--
-- generate_verification_code() is a SECURITY DEFINER function that generates
-- a random 32-char hex string using extensions.gen_random_bytes(). It has no
-- authentication guard, so it could be called by the anon role. There is no
-- legitimate use case for anonymous callers to generate verification codes.
--
-- The previous batch revoke migration (20260612165348) erroneously left this
-- function in the "intentionally kept for anon" exemption list. This migration
-- corrects that oversight.
--
-- Note: The PUBLIC grant (=X) is also revoked. Anon inherits from PUBLIC, so
-- revoking only from anon while PUBLIC still grants is ineffective. We also
-- explicitly grant to authenticated and service_role to preserve those paths.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.generate_verification_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_verification_code() FROM anon;
GRANT  EXECUTE ON FUNCTION public.generate_verification_code() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_verification_code() TO service_role;
