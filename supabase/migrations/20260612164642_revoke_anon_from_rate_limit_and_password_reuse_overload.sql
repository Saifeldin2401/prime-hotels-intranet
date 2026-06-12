-- Revoke anon access from check_rate_limit and check_password_reuse(uuid,text).
--
-- check_rate_limit: SECURITY DEFINER, no client-side call sites — anon has no
-- business calling it.
--
-- check_password_reuse(uuid, text): two-arg overload that takes an explicit
-- user_id. Only callable when the caller already knows who the user is, i.e.
-- exclusively from authenticated contexts. The one-arg overload (plain_password
-- text) is intentionally kept for anon — it powers the password-reset flow.
--
-- Both functions had a PUBLIC EXECUTE grant by default. We revoke that and
-- re-grant only to the authenticated role.

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) TO authenticated;
