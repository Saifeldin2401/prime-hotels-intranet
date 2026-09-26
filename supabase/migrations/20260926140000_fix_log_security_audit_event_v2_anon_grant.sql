-- Migration: 20260926140000_fix_log_security_audit_event_v2_anon_grant.sql
-- Description: Allow anon role to invoke log_security_audit_event_v2 for whitelisted auth security events (login, logout, breach check)
--              and fix role detection inside SECURITY DEFINER execution context.

CREATE OR REPLACE FUNCTION public.log_security_audit_event_v2(
    p_action text,
    p_entity_type text DEFAULT 'system'::text,
    p_entity_id uuid DEFAULT gen_random_uuid(),
    p_description text DEFAULT NULL::text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_ip_address text DEFAULT NULL::text,
    p_user_agent text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text := COALESCE(auth.role(), current_setting('role', true), 'anon');
    v_is_allowed boolean := false;
BEGIN
    IF v_role IN ('authenticated', 'service_role', 'postgres') THEN
        v_is_allowed := true;
    ELSIF v_role IN ('anon', 'public') THEN
        IF p_action IN (
            'security.event',
            'user.login',
            'user.logout',
            'user.login_attempt',
            'password.breach_detected',
            'session.binding_failed',
            'password.breached_detected'
        ) THEN
            v_is_allowed := true;
        END IF;
    END IF;

    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Unauthorized: Event type % not allowed for role %', p_action, v_role;
    END IF;

    IF v_role IN ('anon', 'public') THEN
        BEGIN
            IF NOT check_rate_limit('audit_log_anon:' || COALESCE(p_ip_address, 'unknown'), 60, 300) THEN
                RAISE EXCEPTION 'Rate limit exceeded for unauthenticated audit logging';
            END IF;
        EXCEPTION WHEN undefined_function THEN NULL;
        END;
    END IF;

    INSERT INTO public.system_events (
        event_type,
        actor_id,
        entity_type,
        entity_id,
        ip_address,
        user_agent,
        metadata
    )
    VALUES (
        'audit',
        v_user_id,
        p_entity_type,
        p_entity_id,
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::inet ELSE NULL END,
        p_user_agent,
        jsonb_build_object(
            'action', p_action,
            'details', jsonb_build_object('description', p_description, 'metadata', p_metadata)
        )
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.log_security_audit_event_v2(text, text, uuid, text, jsonb, text, text) TO anon, authenticated, service_role;
