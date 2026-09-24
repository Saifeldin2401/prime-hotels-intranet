-- Fixes a regression introduced in the immediately-preceding migration:
-- the backup-code check must run BEFORE the 6-digit-format validation
-- (backup codes are not necessarily 6-digit numeric strings), matching the
-- original function's order. My rewrite accidentally swapped them, which
-- would have broken backup-code login for any account using one -- caught
-- via a rolled-back functional test before this ever reached anyone.
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
