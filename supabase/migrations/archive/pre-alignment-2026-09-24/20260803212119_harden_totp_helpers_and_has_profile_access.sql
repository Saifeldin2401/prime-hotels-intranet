-- Self-correction of two regressions introduced earlier in this engagement,
-- caught by re-running the security advisor afterwards:
--
-- 1. base32_decode() and generate_totp() (added by the MFA-bypass fix) had no
--    pinned search_path. Both are SECURITY INVOKER and already revoked from
--    anon/authenticated, but an unpinned search_path on a function called from
--    inside a SECURITY DEFINER chain is a hijack vector. Pinned to a fixed
--    path -- matching the convention used elsewhere in this schema -- rather
--    than rewriting the verified function bodies, since `position(x in y)` is
--    non-qualifiable SQL syntax.
--    Verified after change: generate_totp('JBSWY3DPEHPK3PXP', 1700000000)
--    still returns '324550', matching the independent RFC 6238 reference.
--
-- 2. has_profile_access() (added by the properties/profiles company-scoping
--    fix) kept PostgreSQL's default EXECUTE-to-PUBLIC grant, which anon
--    inherits. It is an authorization predicate used inside RLS policies and
--    must not be probeable by unauthenticated callers.
ALTER FUNCTION public.base32_decode(text)
  SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.generate_totp(text, bigint, integer, integer)
  SET search_path TO 'pg_catalog', 'public', 'extensions';
REVOKE EXECUTE ON FUNCTION public.base32_decode(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_totp(text, bigint, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_profile_access(uuid, uuid) FROM PUBLIC, anon;
