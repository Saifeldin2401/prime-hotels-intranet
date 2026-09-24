
-- 1. Wrap auth.role() in a scalar subquery so it is evaluated once per query rather
--    than once per row (same auth_rls_initplan fix applied across the schema earlier).
ALTER POLICY platform_notification_policies_read ON public.platform_notification_policies
  USING ((select auth.role()) = 'authenticated'::text);

-- 2. Defense in depth: these SECURITY DEFINER functions all already reject unauthenticated
--    callers internally (verified by reading each body), but they were still EXECUTE-able
--    by the `anon` role because Postgres grants EXECUTE to PUBLIC on CREATE FUNCTION by
--    default and these were never revoked. Revoking removes the reachable attack surface
--    rather than relying solely on each function's own guard clause.
--    verify_certificate is intentionally left public -- it backs the unauthenticated
--    certificate-verification page.
REVOKE EXECUTE ON FUNCTION public.dismiss_contextual_tip(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_master_content_adoption(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_user_wizard_progress(text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_user_directory(text, uuid, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_media_url(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.platform_assign_master_content(uuid, uuid[], text, text, text, uuid[], timestamptz, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_user_wizard_progress(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_sops(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.skip_or_complete_wizard(text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_wizard_step_progress(text, text, integer, boolean, uuid) FROM anon;
