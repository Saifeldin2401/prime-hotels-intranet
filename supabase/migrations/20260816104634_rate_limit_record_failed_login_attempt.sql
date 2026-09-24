-- SEC-05: record_failed_login_attempt(p_email) is anon-executable (by design - it must run
-- pre-authentication to track failed logins) with no attribution and no rate limit. An
-- unauthenticated attacker can call it directly (bypassing the actual login form) to lock any
-- account indefinitely: 5 calls -> 30min lock; repeated in a loop -> permanent lockout of any/
-- every employee. This mirrors the already-fixed lock_account (duration capped server-side);
-- this sibling function was missed because it *creates* the lock rather than extending one.
--
-- Fix: rate-limit via the existing check_rate_limit() helper, keyed both per-target-email (caps
-- how often any caller can push a given account toward/through lockout - directly closes the
-- "keep every account locked forever" loop) and per-source-IP (caps one attacker sweeping many
-- different target emails). Limits are generous enough that a real user mistyping their
-- password repeatedly is unaffected. On rate-limit, silently no-op (matches the function's
-- existing void/best-effort contract - the frontend does not check a return value).
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.failed_login_attempts%ROWTYPE;
  v_profile_id uuid;
  v_client_ip text;
BEGIN
  -- Per-target-email limit: at most 8 recorded attempts per 5 minutes. Genuine mistyped-password
  -- sequences stay well under this; it caps how fast/often an attacker can force or refresh a
  -- lockout on a single account.
  IF NOT public.check_rate_limit('failed_login_rpc:email:' || lower(p_email), 8, 300) THEN
    RETURN;
  END IF;

  -- Per-source-IP limit: at most 20 recorded attempts per 5 minutes across all target emails.
  -- Caps one attacker source from sweeping through many different accounts. inet_client_addr()
  -- reflects the immediate connecting peer (may be a shared proxy/pooler address in some
  -- deployments) - treated as a defense-in-depth layer alongside the per-email limit, not the
  -- sole control.
  v_client_ip := coalesce(inet_client_addr()::text, 'unknown');
  IF NOT public.check_rate_limit('failed_login_rpc:ip:' || v_client_ip, 20, 300) THEN
    RETURN;
  END IF;

  -- Check if there's an existing record for this email
  SELECT * INTO v_record
  FROM public.failed_login_attempts
  WHERE email = lower(p_email)
  ORDER BY last_attempt_at DESC
  LIMIT 1;

  IF FOUND AND v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    -- Already locked, just update timestamp
    UPDATE public.failed_login_attempts
    SET last_attempt_at = now()
    WHERE id = v_record.id;
    RETURN;
  END IF;

  IF FOUND THEN
    -- Update existing record
    UPDATE public.failed_login_attempts
    SET attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        captcha_required = CASE WHEN attempt_count >= 3 THEN true ELSE captcha_required END,
        locked_until = CASE
          WHEN attempt_count >= 5 THEN now() + interval '30 minutes'
          ELSE locked_until
        END
    WHERE id = v_record.id;
  ELSE
    -- Insert new record
    INSERT INTO public.failed_login_attempts (email, attempt_count)
    VALUES (lower(p_email), 1);
  END IF;

  -- Also update the profile if it exists
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);

  IF FOUND THEN
    UPDATE public.profiles
    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        locked_until = CASE
          WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes'
          ELSE locked_until
        END,
        account_status = CASE
          WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN 'locked'
          ELSE account_status
        END
    WHERE id = v_profile_id;
  END IF;
END;
$function$;
