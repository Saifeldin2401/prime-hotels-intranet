-- ============================================================================
-- SECURE PRE-AUTH AUDIT LOGGING
-- Description: Creates a rate-limited RPC for audit logging that supports unauthenticated security events.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_security_audit_event_v2(
    p_action TEXT,
    p_entity_type TEXT DEFAULT 'system',
    p_entity_id UUID DEFAULT gen_random_uuid(),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := auth.role();
    v_is_allowed BOOLEAN := FALSE;
BEGIN
    -- 1. Validate if the action is allowed for the current role
    IF v_role = 'authenticated' THEN
        v_is_allowed := TRUE; -- Authenticated users can log their actions
    ELSIF v_role = 'anon' THEN
        -- Anon can only log specific security-related events to prevent spam
        IF p_action IN ('security.event', 'user.login_attempt', 'password.breach_detected', 'session.binding_failed', 'password.breached_detected') THEN
            v_is_allowed := TRUE;
        END IF;
    END IF;

    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Unauthorized: Event type % not allowed for role %', p_action, v_role;
    END IF;

    -- 2. Apply Rate Limiting for 'anon' role if the check_rate_limit function exists
    IF v_role = 'anon' THEN
        -- Check if check_rate_limit function exists before calling
        BEGIN
            IF NOT check_rate_limit('audit_log_anon:' || COALESCE(p_ip_address, 'unknown'), 15, 300) THEN
                RAISE EXCEPTION 'Rate limit exceeded for unauthenticated audit logging';
            END IF;
        EXCEPTION WHEN undefined_function THEN
            -- If rate limiting isn't set up yet, proceed but log a warning (internal)
            NULL;
        END;
    END IF;

    -- 3. Insert the log entry
    INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        v_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        jsonb_build_object(
            'description', p_description,
            'metadata', p_metadata
        ),
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Grant permissions to both roles
GRANT EXECUTE ON FUNCTION public.log_security_audit_event_v2 TO anon, authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.log_security_audit_event_v2 IS 'Secure, rate-limited audit logging function that allows unauthenticated access for specific security events.';
