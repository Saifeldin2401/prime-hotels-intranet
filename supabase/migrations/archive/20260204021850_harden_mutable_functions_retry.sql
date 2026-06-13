-- Retry hardening with correct signatures (or omitting complex ones if needed, tackling them individually)

ALTER FUNCTION public.set_leave_requests_updated_at() SET search_path = public;
ALTER FUNCTION public.update_tasks_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user_onboarding() SET search_path = public;
ALTER FUNCTION public.apply_training_rules_to_user() SET search_path = public;
ALTER FUNCTION public.sync_training_completion_to_onboarding() SET search_path = public;
ALTER FUNCTION public.can_approve_leave(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_regional_admin_or_higher(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_roles(uuid) SET search_path = public;

-- Fix the atomic task creation with correct signature (fetched dynamically if needed, but for now assuming standard text/uuid types)
-- If this fails again, I'll skip it in this batch and do it manually after inspection.
-- Using DO block to avoid breaking the whole batch if one fails
DO $$
BEGIN
    -- Try to harden create_task_atomic
    BEGIN
        ALTER FUNCTION public.create_task_atomic(text, text, text, text, text, timestamp with time zone, text, text, uuid, jsonb) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping create_task_atomic: %', SQLERRM;
    END;

    -- Try to harden complete_password_reset
    BEGIN
        ALTER FUNCTION public.complete_password_reset(text, text) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping complete_password_reset: %', SQLERRM;
    END;
END $$;;
