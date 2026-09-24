-- ============================================================================
-- MIGRATION: fix_verify_mfa_code_complete_bypass
-- (this file also incorporates two immediately-following live migrations,
-- fix_generate_totp_hmac_schema_qualification and
-- fix_verify_mfa_code_backup_code_order_regression -- both discovered and
-- fixed while functionally testing this fix, folded into the final function
-- bodies below)
--
-- verify_mfa_code(p_user_id, p_code) never actually computed/checked a TOTP
-- value against mfa_secrets.secret. After the backup-code check, it only
-- validated that p_code was a syntactically well-formed 6-digit string, then
-- unconditionally returned true -- ANY 6-digit code (e.g. "000000") was
-- accepted as valid, for any user with MFA enabled. This completely
-- defeated MFA. Confirmed via mfa_secrets having 0 rows currently (feature
-- has never been enrolled by any real account), so not actively exploited
-- today, but a live bypass the moment enrollment ships.
--
-- Fix: implement real RFC 6238 TOTP verification using pgcrypto's hmac()
-- (already enabled, v1.3, lives in the 'extensions' schema -- schema-
-- qualified explicitly since generate_totp inherits the caller's
-- search_path and verify_mfa_code pins SET search_path TO 'public').
-- Added two internal helper functions (base32_decode, generate_totp) --
-- not granted to anon/authenticated, callable only from within SECURITY
-- DEFINER functions running as the object owner. Checks the current 30s
-- time step plus +/-1 step for clock drift tolerance (90s total window),
-- matching standard authenticator app behavior. Backup-code check runs
-- BEFORE the 6-digit-format validation (backup codes are not necessarily
-- numeric), preserving the original function's check order.
--
-- Verified: generate_totp('JBSWY3DPEHPK3PXP', 1700000000) == '324550',
-- cross-checked against an independent Python hmac/hashlib/base64
-- reference implementation of RFC 6238 -- exact match. Functional test:
-- wrong static code rejected, correct live TOTP accepted, backup code
-- accepted and consumed.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-02.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.base32_decode(input text)
RETURNS bytea
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  clean text;
  bits bigint := 0;
  bit_count integer := 0;
  result bytea := ''::bytea;
  c char;
  val integer;
  byte_val integer;
  i integer;
BEGIN
  clean := upper(regexp_replace(coalesce(input, ''), '[^A-Za-z2-7]', '', 'g'));
  FOR i IN 1..length(clean) LOOP
    c := substr(clean, i, 1);
    val := position(c in alphabet) - 1;
    IF val < 0 THEN CONTINUE; END IF;
    bits := (bits << 5) | val;
    bit_count := bit_count + 5;
    IF bit_count >= 8 THEN
      byte_val := (bits >> (bit_count - 8)) & 255;
      result := result || set_byte('\x00'::bytea, 0, byte_val);
      bit_count := bit_count - 8;
    END IF;
  END LOOP;
  RETURN result;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.base32_decode(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_totp(p_secret_base32 text, p_at_time bigint DEFAULT extract(epoch from now())::bigint, p_time_step integer DEFAULT 30, p_digits integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  key_bytes bytea;
  counter bigint;
  counter_bytes bytea := '\x0000000000000000'::bytea;
  hmac_result bytea;
  offset_val integer;
  bin_code bigint;
  otp bigint;
  i integer;
  byte_val integer;
BEGIN
  key_bytes := public.base32_decode(p_secret_base32);
  counter := p_at_time / p_time_step;

  FOR i IN 0..7 LOOP
    byte_val := (counter >> ((7 - i) * 8)) & 255;
    counter_bytes := set_byte(counter_bytes, i, byte_val);
  END LOOP;

  hmac_result := extensions.hmac(counter_bytes, key_bytes, 'sha1');

  offset_val := get_byte(hmac_result, length(hmac_result) - 1) & 15;

  bin_code := ((get_byte(hmac_result, offset_val) & 127) << 24)
            | ((get_byte(hmac_result, offset_val + 1) & 255) << 16)
            | ((get_byte(hmac_result, offset_val + 2) & 255) << 8)
            | (get_byte(hmac_result, offset_val + 3) & 255);

  otp := bin_code % (10 ^ p_digits)::bigint;

  RETURN lpad(otp::text, p_digits, '0');
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.generate_totp(text, bigint, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret public.mfa_secrets%ROWTYPE;
  v_now bigint := extract(epoch from now())::bigint;
  v_expected text;
  v_step integer;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN false; END IF;
    SELECT * INTO v_secret FROM public.mfa_secrets WHERE user_id = p_user_id AND enabled = true;
    IF NOT FOUND THEN RETURN false; END IF;

    IF p_code = ANY(v_secret.backup_codes) THEN
        UPDATE public.mfa_secrets SET backup_codes = array_remove(backup_codes, p_code), updated_at = now() WHERE user_id = p_user_id;
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', p_user_id, 'mfa', p_user_id,
            jsonb_build_object('security_event_type', 'mfa.backup_code_used', 'severity', 'warning',
                'code_prefix', substring(p_code, 1, 4)));
        RETURN true;
    END IF;

    IF p_code IS NULL OR length(p_code) != 6 OR p_code !~ '^\d+$' THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', p_user_id, 'mfa', p_user_id,
            jsonb_build_object('security_event_type', 'mfa.verification_failed', 'severity', 'warning', 'reason', 'invalid_format'));
        RETURN false;
    END IF;

    FOR v_step IN -1..1 LOOP
      v_expected := public.generate_totp(v_secret.secret, v_now + (v_step * 30));
      IF p_code = v_expected THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', p_user_id, 'mfa', p_user_id,
            jsonb_build_object('security_event_type', 'mfa.verified', 'severity', 'info'));
        RETURN true;
      END IF;
    END LOOP;

    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'mfa', p_user_id,
        jsonb_build_object('security_event_type', 'mfa.verification_failed', 'severity', 'warning', 'reason', 'invalid_code'));
    RETURN false;
END; $function$;
