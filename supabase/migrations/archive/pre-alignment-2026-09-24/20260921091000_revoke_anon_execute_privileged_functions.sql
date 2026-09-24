-- Defense in depth: these SECURITY DEFINER functions all reject unauthenticated callers
-- internally, but new functions inherit Postgres' default EXECUTE-to-PUBLIC grant, which
-- exposed them to the anon role. verify_certificate intentionally stays public (the public
-- certificate verification page calls it without a session).
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'dismiss_contextual_tip', 'get_master_content_adoption', 'get_or_create_user_wizard_progress',
        'get_platform_user_directory', 'get_secure_media_url', 'platform_assign_master_content',
        'reset_user_wizard_progress', 'search_sops', 'skip_or_complete_wizard', 'update_wizard_step_progress'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
