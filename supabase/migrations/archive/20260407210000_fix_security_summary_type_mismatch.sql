-- Fix COALESCE type mismatch in get_security_summary
-- role is app_role enum type, needs explicit cast to text[]

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

  -- FIX: Cast role to text[] to match COALESCE fallback type
  SELECT coalesce(array_agg(role::text), ARRAY[]::text[]) INTO v_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;

  v_mfa_required := (v_roles && ARRAY['corporate_admin', 'regional_admin', 'regional_hr']::text[]);

  v_password_rotation_required := (v_profile.force_password_reset = true) OR (
    (v_roles && ARRAY['corporate_admin', 'regional_admin']::text[]) AND
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

GRANT EXECUTE ON FUNCTION public.get_security_summary(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
