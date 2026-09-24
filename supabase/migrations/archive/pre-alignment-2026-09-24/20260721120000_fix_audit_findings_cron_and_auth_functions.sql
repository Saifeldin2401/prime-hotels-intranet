-- ============================================================================
-- MIGRATION: fix_audit_findings_cron_and_auth_functions
-- Response to an external audit report. Every finding below was independently
-- verified against live state before acting (the report contained some
-- false positives, e.g. approve_pending_user already has a proper internal
-- role check despite being anon-executable). Two issues NOT in the report
-- were found during verification and are also fixed here: check_password_reuse
-- has a dangerous unused 2-arg overload with no ownership check, and
-- clear_failed_login_attempts had no ownership check at all (could be used
-- to bypass brute-force lockout for ANY account, not just the caller's own).
--
-- Applied live via Supabase MCP apply_migration on 2026-07-27.
-- ============================================================================

-- 1. Broken cron jobs: both target functions confirmed non-existent
-- (pg_proc lookup returned 0 rows for both). Firing every 30 min, pure noise.
SELECT cron.unschedule(3);
SELECT cron.unschedule(4);

-- 2. lock_account: legitimately needs anon access (called pre-auth from the
-- failed-login-lockout flow in authSecurityService.ts), but had NO cap on
-- caller-supplied duration -- anyone could call it directly via RPC with an
-- arbitrary duration and lock any real account indefinitely. Cap it.
CREATE OR REPLACE FUNCTION public.lock_account(p_email text, p_duration_minutes integer DEFAULT 30)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_capped_minutes integer := LEAST(GREATEST(p_duration_minutes, 1), 60);
BEGIN
    SELECT id INTO v_profile_id FROM public.profiles WHERE email = lower(p_email);
    IF FOUND THEN
        UPDATE public.profiles SET account_status = 'locked', locked_until = now() + (v_capped_minutes || ' minutes')::interval WHERE id = v_profile_id;
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', v_profile_id, 'profile', v_profile_id,
            jsonb_build_object('security_event_type', 'account.locked', 'severity', 'warning',
                'email', p_email, 'duration_minutes', v_capped_minutes));
        RETURN true;
    END IF;
    RETURN false;
END; $function$;

-- 3. clear_failed_login_attempts: had NO ownership check -- any caller could
-- clear ANY account's lockout/failed-attempt counters, fully defeating the
-- brute-force protection for every other user. The legitimate call site
-- (authSecurityService.ts) only fires after this SAME session's own
-- sign-in just succeeded, so auth.uid() correctly resolves to that user at
-- call time -- enforce that it can only clear the caller's own email.
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_caller_email text;
BEGIN
  SELECT email INTO v_caller_email FROM public.profiles WHERE id = auth.uid();

  IF v_caller_email IS NULL OR lower(v_caller_email) != lower(p_email) THEN
    RETURN; -- silently no-op for mismatched/anon callers, matches prior best-effort error handling
  END IF;

  DELETE FROM public.failed_login_attempts
  WHERE email = lower(p_email);

  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);

  IF FOUND THEN
    UPDATE public.profiles
    SET failed_login_attempts = 0,
        locked_until = NULL,
        account_status = CASE
          WHEN account_status = 'locked' THEN 'active'
          ELSE account_status
        END,
        last_login_at = now()
    WHERE id = v_profile_id;
  END IF;
END;
$function$;

-- 4. check_password_reuse(uuid, text) overload: unused dead code (confirmed
-- via grep -- app only calls the 1-arg version which correctly checks
-- auth.uid()), and has NO ownership check on the target user_id -- a
-- password oracle if ever exercised. Lock down to service_role only.
REVOKE ALL ON FUNCTION public.check_password_reuse(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_password_reuse(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.check_password_reuse(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) TO service_role;

-- 5. log_pii_access (both overloads): no internal auth check, anon-callable,
-- allows injecting fake PII-access audit trail entries. No legitimate
-- anon/pre-auth use case (PII access logging always has a real actor).
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_pii_access(uuid, text[], text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text, text, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text, text, text, text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_pii_access(uuid, text, text, text, text[], text) TO authenticated, service_role;

-- 6. approve_pending_user: already has a correct internal role check (raises
-- an exception for unauthorized callers), so this is not exploitable, but
-- the anon EXECUTE grant is unnecessary -- remove it (defense-in-depth).
REVOKE ALL ON FUNCTION public.approve_pending_user(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_pending_user(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_user(uuid, boolean) TO authenticated;

-- 7. calculate_next_task_run: mutable search_path (privilege-escalation risk
-- pattern in SECURITY DEFINER contexts). Pin it.
ALTER FUNCTION public.calculate_next_task_run(text, timestamptz) SET search_path = public, pg_temp;

-- 8. documents bucket storage policies use {public} role instead of
-- {authenticated}. Not actively exploitable (qual already requires
-- auth.uid() to match the folder owner, which is NULL for anon requests),
-- but tightened for correctness/defense-in-depth.
ALTER POLICY "Allow users to delete their own files" ON storage.objects TO authenticated;
ALTER POLICY "Allow users to update their own files" ON storage.objects TO authenticated;
