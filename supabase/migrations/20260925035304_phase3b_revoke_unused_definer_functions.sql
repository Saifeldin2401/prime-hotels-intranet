-- Phase 3b (rebuild, 2026-09-25): shrink the SECURITY DEFINER surface.
--
-- 175 SECURITY DEFINER functions were executable by every signed-in user.
-- Each one runs with the owner's privileges, i.e. bypasses RLS, so each is a
-- potential way around tenant isolation. This revokes EXECUTE from client
-- roles for the ones nothing legitimate calls as the user:
--   * not referenced by the app or edge-function code (string-literal scan of
--     src/ and supabase/functions/),
--   * not used by any RLS policy, view, invoker function or column default
--     (those evaluate with the caller's privileges and would break),
--   * trigger functions (fired by the table owner's trigger, never called).
-- Other SECURITY DEFINER functions still call them freely (they run as owner),
-- and service_role keeps access for edge functions and cron.
--
-- Notable: log_audit_event / log_content_change / log_pii_access let any user
-- write arbitrary audit entries (a forgeable audit log); consume_ai_credit /
-- reset_monthly_ai_credits let any user spend or reset an organization's AI
-- credits; enable_mfa / disable_mfa / generate_mfa_secret took a user id.

DO $$
DECLARE
  f regprocedure;
  names text[] := ARRAY[
    'can_review_training_module', 'can_view_employee_public_profile', 'can_view_learning_analytics',
    'check_rate_limit', 'cleanup_orphaned_media_files', 'consume_ai_credit', 'content_editor_org_ids',
    'disable_mfa', 'enable_mfa', 'feature_enabled', 'generate_mfa_secret', 'generate_verification_code',
    'get_audit_data_for_export', 'get_department_skill_matrix', 'get_employee_directory',
    'get_expiring_documents', 'get_my_roles', 'get_operator_impersonated_org', 'get_secure_report_run_url',
    'get_training_module_related_resources', 'get_user_departments', 'get_user_organizations',
    'get_user_properties', 'get_user_skill_gaps', 'has_role_optimized', 'is_knowledge_manager',
    'is_learning_editor', 'is_mfa_enabled', 'is_platform_user', 'is_rls_enabled', 'learning_manager_org_ids',
    'learning_team_org_ids', 'log_audit_event', 'log_content_change', 'log_pii_access',
    'mark_all_notifications_as_read', 'mark_notification_as_read', 'my_feature_enabled',
    'notification_policy_enabled', 'request_knowledge_content', 'reset_monthly_ai_credits',
    'sanitize_search_input', 'user_has_organization_access', 'validate_module_quiz_integrity',
    'validate_uuid_array', 'verify_mfa_code',
    -- trigger functions
    'set_documents_child_org', 'set_training_child_org', 'tg_set_parent_default_org',
    'tg_skills_fill_organization', 'trg_protect_organization_control_plane'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY (names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;
