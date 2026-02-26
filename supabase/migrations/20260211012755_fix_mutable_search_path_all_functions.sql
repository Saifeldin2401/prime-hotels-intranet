
-- Phase 1, Migration 1: Fix mutable search_path on all flagged functions
-- This prevents SQL injection via schema poisoning

-- 1. is_admin(uuid) — CRITICAL: used in RLS policies
ALTER FUNCTION public.is_admin(uuid) SET search_path = '';

-- 2. is_hr(uuid) — CRITICAL: used in RLS policies
ALTER FUNCTION public.is_hr(uuid) SET search_path = '';

-- 3. calculate_onboarding_progress() — trigger function
ALTER FUNCTION public.calculate_onboarding_progress() SET search_path = '';

-- 4. create_request_for_leave_request() — trigger function
ALTER FUNCTION public.create_request_for_leave_request() SET search_path = '';

-- 5. find_hr_assignee(uuid) — called from other functions
ALTER FUNCTION public.find_hr_assignee(uuid) SET search_path = '';

-- 6. prune_translation_cache() — maintenance function
ALTER FUNCTION public.prune_translation_cache() SET search_path = '';

-- 7. request_apply_action(uuid, text, text, uuid, text) — core workflow
ALTER FUNCTION public.request_apply_action(uuid, text, text, uuid, text) SET search_path = '';

-- 8. submit_promotion_request(uuid, app_role, text, uuid, text) — 5-arg version
-- Already has SET search_path TO 'public', change to empty string
ALTER FUNCTION public.submit_promotion_request(uuid, app_role, text, uuid, text) SET search_path = '';

-- 9. submit_promotion_request(uuid, app_role, text, uuid, date, text) — 6-arg version
ALTER FUNCTION public.submit_promotion_request(uuid, app_role, text, uuid, date, text) SET search_path = '';

-- 10. submit_transfer_request(uuid, uuid, uuid, date, text) — transfer workflow
ALTER FUNCTION public.submit_transfer_request(uuid, uuid, uuid, date, text) SET search_path = '';

-- 11. update_conversation_last_message() — trigger function
ALTER FUNCTION public.update_conversation_last_message() SET search_path = '';
;
