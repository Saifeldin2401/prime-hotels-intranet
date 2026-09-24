
-- Defense-in-depth: these 4 SECURITY DEFINER functions were anon-executable.
-- All 4 already internally re-check authorization (platform-operator/auth.uid()
-- guards), so this closes public API surface rather than fixing an active
-- bypass. verify_certificate is left anon-callable - it's an intentional public
-- certificate-verification lookup with no internal auth check by design.
REVOKE EXECUTE ON FUNCTION public.get_master_content_adoption(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.platform_assign_master_content(uuid, uuid[], text, text, text, uuid[], timestamptz, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_sops(text) FROM anon;
