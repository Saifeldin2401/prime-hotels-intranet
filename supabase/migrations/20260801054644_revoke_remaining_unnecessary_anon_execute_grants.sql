-- ============================================================================
-- MIGRATION: revoke_remaining_unnecessary_anon_execute_grants
-- Completes the anon-executable-function review started in earlier rounds
-- (25 originally flagged; 10 fixed round 2, 4 more fixed in the audit-report
-- round). This closes out the remaining list:
--
-- Defense-in-depth only (already internally guarded, not exploitable):
--   get_announcement_compliance_breakdown, get_top_events
-- Real gaps (no internal auth check, genuinely should not be anon-callable):
--   is_task_creator (ownership-probing), request_knowledge_content
--   (unauthenticated write / spam vector -- inserts system_events with
--   actor_id=NULL for anon callers)
-- Own new Finance functions, made public only by Postgres's PUBLIC-execute
-- default (same class of oversight found and fixed in round 2 for 9 of 10
-- functions there): create_request_for_invoice (trigger-only, never meant
-- to be called directly by anyone) and find_finance_approver (internal
-- helper, no auth check, minor info leak about who approves for a property).
--
-- Left unchanged (verified legitimate/low-risk): check_password_reuse,
-- clear_failed_login_attempts, complete_password_reset, lock_account,
-- record_failed_login_attempt (all pre-auth flows with proper internal
-- guards from earlier rounds), verify_certificate (must work pre-login by
-- design), track_related_article_click/impression and
-- increment_article_view_count (anonymous analytics/view-counters, no
-- content exposed, standard pattern).
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

REVOKE ALL ON FUNCTION public.get_announcement_compliance_breakdown(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_announcement_compliance_breakdown(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_announcement_compliance_breakdown(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_top_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_top_events(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_top_events(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_task_creator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_task_creator(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.request_knowledge_content(text, text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_knowledge_content(text, text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_knowledge_content(text, text, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_request_for_invoice() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_request_for_invoice() FROM anon;
REVOKE ALL ON FUNCTION public.create_request_for_invoice() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_request_for_invoice() TO service_role;

REVOKE ALL ON FUNCTION public.find_finance_approver(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_finance_approver(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_finance_approver(uuid) TO authenticated, service_role;
