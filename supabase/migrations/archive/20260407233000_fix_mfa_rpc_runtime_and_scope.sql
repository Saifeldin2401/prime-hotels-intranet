-- Fix MFA RPC runtime failures and add missing self-scope guards for security functions.

CREATE OR REPLACE FUNCTION public.generate_mfa_secret(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_backup_codes text[];
  v_qr_code_url text;
  v_secret_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only generate MFA secrets for themselves';
  END IF;

  IF EXISTS (SELECT 1 FROM public.mfa_secrets WHERE user_id = p_user_id AND enabled = true) THEN
    RETURN jsonb_build_object('error', 'MFA already enabled');
  END IF;

  SELECT string_agg(
    substr(v_secret_alphabet, (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1),
    ''
  )
  INTO v_secret
  FROM generate_series(1, 32);

  v_backup_codes := ARRAY(
    SELECT substring(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8)
    FROM generate_series(1, 8)
  );

  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/PHG:' ||
    p_user_id ||
    '?secret=' ||
    v_secret ||
    '&issuer=PHG%20Connect';

  INSERT INTO public.mfa_secrets (user_id, secret, backup_codes, enabled)
  VALUES (p_user_id, v_secret, v_backup_codes, false)
  ON CONFLICT (user_id)
  DO UPDATE SET
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    enabled = false,
    verified_at = null,
    updated_at = now();

  RETURN jsonb_build_object(
    'secret', v_secret,
    'backupCodes', v_backup_codes,
    'qrCodeUrl', v_qr_code_url
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_mfa(
  p_user_id uuid,
  p_verification_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret public.mfa_secrets%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_verification_code IS NULL OR length(p_verification_code) != 6 OR p_verification_code !~ '^\d+$' THEN
    RETURN false;
  END IF;

  UPDATE public.mfa_secrets
  SET enabled = true,
      verified_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.enabled', 'mfa', 'info');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_mfa(
  p_user_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password_hash text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  IF p_password IS NULL OR btrim(p_password) = '' THEN
    RETURN false;
  END IF;

  SELECT encrypted_password INTO v_password_hash
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND OR v_password_hash IS NULL THEN
    RETURN false;
  END IF;

  IF extensions.crypt(p_password, v_password_hash) <> v_password_hash THEN
    RETURN false;
  END IF;

  DELETE FROM public.mfa_secrets
  WHERE user_id = p_user_id;

  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.disabled', 'mfa', 'warning');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_mfa_code(
  p_user_id uuid,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret public.mfa_secrets%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id AND enabled = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_code = ANY(v_secret.backup_codes) THEN
    UPDATE public.mfa_secrets
    SET backup_codes = array_remove(backup_codes, p_code),
        updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (
      p_user_id,
      'mfa.backup_code_used',
      'mfa',
      'warning',
      jsonb_build_object('code_prefix', substring(p_code, 1, 4))
    );

    RETURN true;
  END IF;

  IF p_code IS NULL OR length(p_code) != 6 OR p_code !~ '^\d+$' THEN
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (
      p_user_id,
      'mfa.verification_failed',
      'mfa',
      'warning',
      jsonb_build_object('reason', 'invalid_format')
    );

    RETURN false;
  END IF;

  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.verified', 'mfa', 'info');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_mfa_enabled(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.mfa_secrets
    WHERE user_id = p_user_id AND enabled = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_security_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mfa_enabled boolean;
  v_mfa_required boolean;
  v_password_rotation_required boolean;
  v_days_remaining integer;
  v_roles text[];
  v_profile record;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only access their own security summary';
  END IF;

  v_mfa_enabled := EXISTS (
    SELECT 1
    FROM public.mfa_secrets
    WHERE user_id = p_user_id AND enabled = true
  );

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT coalesce(array_agg(role), ARRAY[]::text[]) INTO v_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;

  v_mfa_required := (v_roles && ARRAY['corporate_admin', 'regional_admin', 'regional_hr']);

  v_password_rotation_required := (v_profile.force_password_reset = true) OR (
    (v_roles && ARRAY['corporate_admin', 'regional_admin']) AND
    (v_profile.password_last_changed_at IS NULL OR v_profile.password_last_changed_at < now() - interval '90 days')
  );

  IF v_profile.password_last_changed_at IS NOT NULL THEN
    v_days_remaining := 90 - extract(day from (now() - v_profile.password_last_changed_at))::int;
  END IF;

  RETURN jsonb_build_object(
    'mfaRequired', v_mfa_required,
    'mfaEnabled', v_mfa_enabled,
    'passwordRotationRequired', v_password_rotation_required,
    'passwordRotationDays', GREATEST(0, COALESCE(v_days_remaining, 0)),
    'setupComplete', ((NOT v_mfa_required OR v_mfa_enabled) AND NOT v_password_rotation_required)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only access their own sessions';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'created_at', created_at,
      'last_active_at', last_active_at,
      'ip_address', COALESCE(ip_address, 'Unknown'),
      'user_agent', COALESCE(user_agent, 'Unknown'),
      'is_current', is_current,
      'expires_at', expires_at
    ))
    FROM public.user_sessions
    WHERE user_id = p_user_id
      AND revoked_at IS NULL
      AND expires_at > now()
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  UPDATE public.user_sessions
  SET revoked_at = now(),
      revoked_reason = 'revoke_all_other'
  WHERE user_id = p_user_id
    AND is_current = false
    AND revoked_at IS NULL;

  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
  VALUES (
    p_user_id,
    'session.revoke_all_other',
    'session',
    'info',
    jsonb_build_object(
      'count',
      (SELECT count(*) FROM public.user_sessions WHERE user_id = p_user_id AND revoked_at IS NOT NULL)
    )
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_session_limit(
  p_user_id uuid,
  p_max_sessions integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.user_sessions
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_count > p_max_sessions THEN
    UPDATE public.user_sessions
    SET revoked_at = now(),
        revoked_reason = 'session_limit_exceeded'
    WHERE id IN (
      SELECT id
      FROM public.user_sessions
      WHERE user_id = p_user_id
        AND revoked_at IS NULL
        AND expires_at > now()
        AND is_current = false
      ORDER BY last_active_at ASC
      LIMIT v_count - p_max_sessions + 1
    );

    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (
      p_user_id,
      'session.limit_enforced',
      'session',
      'warning',
      jsonb_build_object(
        'previous_count', v_count,
        'max_sessions', p_max_sessions
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_mfa_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_mfa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_mfa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mfa_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_enabled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_session_limit(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
