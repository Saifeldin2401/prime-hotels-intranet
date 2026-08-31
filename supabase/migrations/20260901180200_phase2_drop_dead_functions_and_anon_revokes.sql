-- Phase 2 (security triage): drop functions that reference tables removed by the domain purge
-- (all already runtime-broken), revoke anon EXECUTE on mutating/enumeration KB + analytics
-- functions, and pin the 5 mutable search_paths flagged by the advisor.

-- 1. Dead functions (purged HR / maintenance / procurement / workflow / EOM / media domains)
DROP FUNCTION IF EXISTS public.apply_promotion() CASCADE;
DROP FUNCTION IF EXISTS public.apply_transfer() CASCADE;
DROP FUNCTION IF EXISTS public.approve_leave_request(uuid, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.assign_maintenance_ticket(uuid, uuid, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_leave(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_purchase_request(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_feed_item(text) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_request(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.complete_maintenance_ticket(uuid, uuid, numeric, numeric, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.decide_purchase_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_media_url(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_vacation_balance(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.reject_leave_request(uuid, uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.run_eom_calculation(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.set_media_download_headers(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_expense_claim(text, numeric, text, date, text, text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, app_role, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, app_role, text, uuid, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_transfer_request(uuid, uuid, uuid, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_password_reuse(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.promote_employee(uuid, app_role, text, uuid, date, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.bulk_update_reporting_lines(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_employee_private_profile(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.export_birthdays_for_month(integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_request_details(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.execute_scheduled_report(uuid) CASCADE;

-- 2. Revoke anon EXECUTE on KB mutation + enumeration + analytics functions.
REVOKE EXECUTE ON FUNCTION public.publish_document_to_kb(uuid,uuid,text,uuid,uuid,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_document_internal(uuid,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.remove_document_from_kb(uuid,uuid,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_knowledge_articles(text,text,text,uuid,uuid,boolean,integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_learner_analytics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_learner_topic_breakdown(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_course_analytics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_pass_rates(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_questions(uuid,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assessment_analytics_wrong_answers(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_search_terms(integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_top_documents(integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_knowledge_analytics_zero_result_searches(integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_learning_analytics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_training_certificate(uuid) FROM anon;

-- 3. Pin mutable search_path (advisor: function_search_path_mutable x5)
ALTER FUNCTION public.user_has_organization_access(uuid) SET search_path = public;
ALTER FUNCTION public.notify_message_received() SET search_path = public;
ALTER FUNCTION public.learning_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_content_reviews_touch() SET search_path = public;
ALTER FUNCTION public.handle_training_assignment_submissions_updated_at() SET search_path = public;
