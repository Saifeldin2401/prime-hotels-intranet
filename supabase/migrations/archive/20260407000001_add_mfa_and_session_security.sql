-- =============================================================================
-- MFA (Multi-Factor Authentication) and Session Security Migration
-- =============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- MFA Secrets Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mfa_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_mfa UNIQUE (user_id)
);

COMMENT ON TABLE public.mfa_secrets IS 'Stores TOTP MFA secrets and backup codes for users';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON public.mfa_secrets(user_id);

-- Enable RLS
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mfa_secrets
DROP POLICY IF EXISTS mfa_secrets_select_own ON public.mfa_secrets;
CREATE POLICY mfa_secrets_select_own
  ON public.mfa_secrets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS mfa_secrets_insert_own ON public.mfa_secrets;
CREATE POLICY mfa_secrets_insert_own
  ON public.mfa_secrets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mfa_secrets_update_own ON public.mfa_secrets;
CREATE POLICY mfa_secrets_update_own
  ON public.mfa_secrets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mfa_secrets_delete_own ON public.mfa_secrets;
CREATE POLICY mfa_secrets_delete_own
  ON public.mfa_secrets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- User Sessions Table (for session management and revocation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL,
  ip_address text,
  ip_hash text,
  user_agent text,
  user_agent_hash text,
  fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  is_current boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_expires CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions for session management and revocation';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(session_token_hash);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS user_sessions_select_own ON public.user_sessions;
CREATE POLICY user_sessions_select_own
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_sessions_admin_all ON public.user_sessions;
CREATE POLICY user_sessions_admin_all
  ON public.user_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('corporate_admin', 'regional_admin')
    )
  );

-- =============================================================================
-- Security Audit Log Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'auth',
  severity text NOT NULL DEFAULT 'info',
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT valid_category CHECK (event_category IN ('auth', 'session', 'mfa', 'password', 'account', 'suspicious'))
);

COMMENT ON TABLE public.security_audit_log IS 'Security-specific audit log for authentication and session events';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON public.security_audit_log(severity, created_at DESC) WHERE severity IN ('warning', 'critical');

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only view their own security logs
DROP POLICY IF EXISTS security_audit_select_own ON public.security_audit_log;
CREATE POLICY security_audit_select_own
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all security logs
DROP POLICY IF EXISTS security_audit_admin_all ON public.security_audit_log;
CREATE POLICY security_audit_admin_all
  ON public.security_audit_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('corporate_admin', 'regional_admin')
    )
  );

-- =============================================================================
-- Failed Login Attempts Tracking (for brute force protection)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  captcha_required boolean NOT NULL DEFAULT false,
  
  CONSTRAINT positive_attempts CHECK (attempt_count > 0)
);

COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts for brute force protection';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_failed_login_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_locked ON public.failed_login_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- Enable RLS (only admins and service role can access)
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS failed_login_admin_all ON public.failed_login_attempts;
CREATE POLICY failed_login_admin_all
  ON public.failed_login_attempts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('corporate_admin', 'regional_admin')
    )
  );

-- =============================================================================
-- Security Functions
-- =============================================================================

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.failed_login_attempts%ROWTYPE;
  v_profile_id uuid;
BEGIN
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
$$;

-- Function to clear failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Delete from failed_login_attempts
  DELETE FROM public.failed_login_attempts
  WHERE email = lower(p_email);
  
  -- Reset profile counters
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
$$;

-- Function to lock an account
CREATE OR REPLACE FUNCTION public.lock_account(
  p_email text,
  p_duration_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);
  
  IF FOUND THEN
    UPDATE public.profiles
    SET account_status = 'locked',
        locked_until = now() + (p_duration_minutes || ' minutes')::interval
    WHERE id = v_profile_id;
    
    -- Log the lockout
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (v_profile_id, 'account.locked', 'account', 'warning', jsonb_build_object(
      'email', p_email,
      'duration_minutes', p_duration_minutes
    ));
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- =============================================================================
-- MFA Functions
-- =============================================================================

-- Function to generate MFA secret (placeholder - in production use proper TOTP library)
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only generate MFA secrets for themselves';
  END IF;

  -- Check if user already has MFA enabled
  IF EXISTS (SELECT 1 FROM public.mfa_secrets WHERE user_id = p_user_id AND enabled = true) THEN
    RETURN jsonb_build_object('error', 'MFA already enabled');
  END IF;
  
  -- Generate a 32-character base32-compatible secret for authenticator apps
  SELECT string_agg(
    substr(v_secret_alphabet, (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1),
    ''
  )
  INTO v_secret
  FROM generate_series(1, 32);
  
  -- Generate backup codes
  v_backup_codes := ARRAY(
    SELECT substring(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8)
    FROM generate_series(1, 8)
  );
  
  -- Generate QR code URL (in production, this would be a proper otpauth URL)
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/PHG:' || p_user_id || '?secret=' || v_secret || '&issuer=PHG%20Connect';
  
  -- Insert or update MFA secret
  INSERT INTO public.mfa_secrets (user_id, secret, backup_codes, enabled)
  VALUES (p_user_id, v_secret, v_backup_codes, false)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    enabled = false,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'secret', v_secret,
    'backupCodes', v_backup_codes,
    'qrCodeUrl', v_qr_code_url
  );
END;
$$;

-- Function to enable MFA after verification
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Get the stored secret
  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Verify the code (in production, use proper TOTP verification)
  -- This is a simplified check - proper implementation would use a TOTP library
  IF p_verification_code IS NULL OR length(p_verification_code) != 6 THEN
    RETURN false;
  END IF;
  
  -- Mark as enabled
  UPDATE public.mfa_secrets
  SET enabled = true,
      verified_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the event
  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.enabled', 'mfa', 'info');
  
  RETURN true;
END;
$$;

-- Function to disable MFA
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
  v_user_record auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Verify the password first
  SELECT * INTO v_user_record
  FROM auth.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Delete MFA secret
  DELETE FROM public.mfa_secrets
  WHERE user_id = p_user_id;
  
  -- Log the event
  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.disabled', 'mfa', 'warning');
  
  RETURN true;
END;
$$;

-- Function to verify MFA code
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Get the stored secret
  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if it's a backup code
  IF p_code = ANY(v_secret.backup_codes) THEN
    -- Remove the used backup code
    UPDATE public.mfa_secrets
    SET backup_codes = array_remove(backup_codes, p_code),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Log backup code usage
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (p_user_id, 'mfa.backup_code_used', 'mfa', 'warning', jsonb_build_object('code_prefix', substring(p_code, 1, 4)));
    
    RETURN true;
  END IF;
  
  -- Verify TOTP code (in production, use proper TOTP library)
  -- For now, accept any 6-digit code for demonstration
  IF p_code IS NULL OR length(p_code) != 6 OR p_code !~ '^\d+$' THEN
    -- Log failed verification
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (p_user_id, 'mfa.verification_failed', 'mfa', 'warning', jsonb_build_object('reason', 'invalid_format'));
    
    RETURN false;
  END IF;
  
  -- Log successful verification
  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
  VALUES (p_user_id, 'mfa.verified', 'mfa', 'info');
  
  RETURN true;
END;
$$;

-- Function to check if MFA is enabled
CREATE OR REPLACE FUNCTION public.is_mfa_enabled(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.mfa_secrets 
    WHERE user_id = p_user_id AND enabled = true
  );
END;
$$;

-- =============================================================================
-- Session Management Functions
-- =============================================================================

-- Function to get user sessions
CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
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
    ORDER BY last_active_at DESC
  );
END;
$$;

-- Function to revoke a session
CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = now(),
      revoked_reason = 'user_initiated'
  WHERE id = p_session_id
  AND user_id = auth.uid();
  
  IF FOUND THEN
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
    VALUES (auth.uid(), 'session.revoked', 'session', 'info', jsonb_build_object('session_id', p_session_id));
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to revoke all other sessions
CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = now(),
      revoked_reason = 'revoke_all_other'
  WHERE user_id = p_user_id
  AND is_current = false
  AND revoked_at IS NULL;
  
  INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity, details)
  VALUES (p_user_id, 'session.revoke_all_other', 'session', 'info', jsonb_build_object('count', (SELECT count(*) FROM public.user_sessions WHERE user_id = p_user_id AND revoked_at IS NOT NULL)));
  
  RETURN true;
END;
$$;

-- Function to enforce session limit
CREATE OR REPLACE FUNCTION public.enforce_session_limit(
  p_user_id uuid,
  p_max_sessions integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO v_count
  FROM public.user_sessions
  WHERE user_id = p_user_id
  AND revoked_at IS NULL
  AND expires_at > now();
  
  -- If over limit, revoke oldest sessions
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
    VALUES (p_user_id, 'session.limit_enforced', 'session', 'warning', jsonb_build_object(
      'previous_count', v_count,
      'max_sessions', p_max_sessions
    ));
  END IF;
  
  RETURN true;
END;
$$;

-- =============================================================================
-- Password History Check Function
-- =============================================================================

-- Function to check if password was previously used
CREATE OR REPLACE FUNCTION public.check_password_reuse(
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
  -- Get current password hash
  SELECT encrypted_password INTO v_password_hash
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Check against password history (last 5 passwords)
  RETURN EXISTS (
    SELECT 1 
    FROM public.password_history
    WHERE user_id = p_user_id
    AND created_at > now() - interval '90 days'
    AND password_hash = crypt(p_password, password_hash)
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$$;

-- =============================================================================
-- Security Audit Trigger
-- =============================================================================

-- Function to auto-log certain security events
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log password changes
  IF TG_TABLE_NAME = 'users' AND NEW.encrypted_password != OLD.encrypted_password THEN
    INSERT INTO public.security_audit_log (user_id, event_type, event_category, severity)
    VALUES (NEW.id, 'password.changed', 'password', 'info');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to auth.users (run as supabase_admin)
-- Note: This requires elevated permissions and should be run separately
-- DROP TRIGGER IF EXISTS on_auth_user_security ON auth.users;
-- CREATE TRIGGER on_auth_user_security
--   AFTER UPDATE ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.log_security_event();

-- =============================================================================
-- Grant Permissions
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_account(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mfa_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_mfa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_mfa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mfa_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_enabled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_session_limit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_password_reuse(uuid, text) TO authenticated;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) TO service_role;

-- =============================================================================
-- Add Security-Related Columns to Profiles
-- =============================================================================

-- Add last_login_at if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Add mfa_required column for admin roles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false;

-- Update existing admin users to require MFA
UPDATE public.profiles
SET mfa_required = true
WHERE id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role IN ('corporate_admin', 'regional_admin')
);
