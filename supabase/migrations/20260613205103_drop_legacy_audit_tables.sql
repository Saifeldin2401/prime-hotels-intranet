-- ============================================================
-- drop_legacy_audit_tables
--
-- Data from audit_logs (65 rows) and security_audit_logs (1 row)
-- was already migrated to system_events in consolidate_audit_logs.
-- 4 additional rows written to audit_logs after that migration
-- are migrated here before the tables are dropped.
-- All DB functions that still wrote to these tables are also
-- redirected to system_events in this migration.
-- ============================================================

-- STEP 1: Migrate any rows in audit_logs not yet in system_events
INSERT INTO public.system_events (id, event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
SELECT
    al.id,
    'audit',
    al.user_id,
    al.entity_type,
    al.entity_id,
    CASE WHEN al.ip_address IS NOT NULL THEN al.ip_address::inet ELSE NULL END,
    al.user_agent,
    jsonb_build_object('action', al.action, 'details', COALESCE(al.details, '{}'::jsonb)),
    COALESCE(al.created_at, now())
FROM public.audit_logs al
WHERE NOT EXISTS (SELECT 1 FROM public.system_events se WHERE se.id = al.id)
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Fix functions that still INSERT into audit_logs or security_audit_logs

-- log_audit_event_trigger (old variant writing to audit_logs)
CREATE OR REPLACE FUNCTION public.log_audit_event_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id uuid := auth.uid();
    v_action text;
    v_changes jsonb;
    v_record_id uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create'; v_changes := to_jsonb(NEW); v_record_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update'; v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)); v_record_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete'; v_changes := to_jsonb(OLD); v_record_id := OLD.id;
    END IF;
    IF v_record_id IS NOT NULL THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('audit', v_actor_id, TG_TABLE_NAME, v_record_id, jsonb_build_object('action', v_action, 'details', v_changes));
    END IF;
    RETURN NULL;
END; $$;

-- log_audit_event (old trigger function variant writing to audit_logs)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    actor_id uuid;
    changes jsonb;
    action_type text;
    record_id uuid;
BEGIN
    actor_id := auth.uid();
    IF TG_OP = 'INSERT' THEN
        action_type := 'create'; changes := to_jsonb(NEW); record_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update'; changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)); record_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete'; changes := to_jsonb(OLD); record_id := OLD.id;
    END IF;
    IF record_id IS NOT NULL THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('audit', actor_id, TG_TABLE_NAME, record_id, jsonb_build_object('action', action_type, 'details', changes));
    END IF;
    RETURN NULL;
END; $$;

-- log_security_audit_event_v2 (still inserted into audit_logs)
CREATE OR REPLACE FUNCTION public.log_security_audit_event_v2(
    p_action text,
    p_entity_type text DEFAULT 'system',
    p_entity_id uuid DEFAULT gen_random_uuid(),
    p_description text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}',
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text := auth.role();
    v_is_allowed boolean := false;
BEGIN
    IF v_role = 'authenticated' THEN
        v_is_allowed := true;
    ELSIF v_role = 'anon' THEN
        IF p_action IN ('security.event', 'user.login_attempt', 'password.breach_detected', 'session.binding_failed', 'password.breached_detected') THEN
            v_is_allowed := true;
        END IF;
    END IF;
    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Unauthorized: Event type % not allowed for role %', p_action, v_role;
    END IF;
    IF v_role = 'anon' THEN
        BEGIN
            IF NOT check_rate_limit('audit_log_anon:' || COALESCE(p_ip_address, 'unknown'), 15, 300) THEN
                RAISE EXCEPTION 'Rate limit exceeded for unauthenticated audit logging';
            END IF;
        EXCEPTION WHEN undefined_function THEN NULL;
        END;
    END IF;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES (
        'audit',
        v_user_id,
        p_entity_type,
        p_entity_id,
        CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::inet ELSE NULL END,
        p_user_agent,
        jsonb_build_object('action', p_action, 'details', jsonb_build_object('description', p_description, 'metadata', p_metadata))
    );
END; $$;

-- check_and_escalate_maintenance
CREATE OR REPLACE FUNCTION public.check_and_escalate_maintenance()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    ticket RECORD;
    rule RECORD;
    next_assignee_id uuid;
    new_due_at timestamptz;
BEGIN
    FOR ticket IN
        SELECT mt.*
        FROM public.maintenance_tickets mt
        WHERE mt.status IN ('open', 'in_progress', 'pending_parts')
          AND mt.is_deleted = false
          AND (
            (mt.due_at IS NOT NULL AND mt.due_at < now()) OR
            (mt.due_at IS NULL AND mt.created_at < now() - interval '24 hours')
          )
          AND (mt.escalated_at IS NULL OR mt.escalated_at < now() - interval '1 hour')
    LOOP
        SELECT * INTO rule
        FROM public.escalation_rules er
        WHERE er.is_active = true AND er.action_type = 'maintenance_ticket'
        ORDER BY er.threshold_hours ASC LIMIT 1;

        IF rule IS NULL THEN CONTINUE; END IF;

        SELECT p.id INTO next_assignee_id
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
        LEFT JOIN public.user_properties up ON up.user_id = p.id
        WHERE ur.role = rule.next_role AND p.is_active = true
          AND (ticket.property_id IS NULL OR ur.role IN ('regional_admin','regional_hr','corporate_admin') OR up.property_id = ticket.property_id)
        ORDER BY (up.property_id = ticket.property_id) DESC, p.created_at LIMIT 1;

        IF next_assignee_id IS NULL OR next_assignee_id = ticket.assigned_to_id THEN CONTINUE; END IF;

        new_due_at := now() + make_interval(hours => COALESCE(ticket.sla_hours, rule.threshold_hours));

        UPDATE public.maintenance_tickets
        SET assigned_to_id = next_assignee_id, escalated_at = now(), due_at = new_due_at
        WHERE id = ticket.id;

        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('audit', NULL, 'maintenance_ticket', ticket.id,
            jsonb_build_object('action', 'escalate', 'details', jsonb_build_object(
                'old_assignee_id', ticket.assigned_to_id,
                'new_assignee_id', next_assignee_id,
                'rule_id', rule.id)));

        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (next_assignee_id, 'escalation_alert', 'Maintenance Ticket Escalated',
            format('Maintenance ticket "%s" has been escalated to you.', ticket.title),
            jsonb_build_object('ticket_id', ticket.id));
    END LOOP;
END; $$;

-- check_and_escalate_approvals
CREATE OR REPLACE FUNCTION public.check_and_escalate_approvals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    pending_request RECORD;
    escalation_rule RECORD;
    hours_pending integer;
    next_approver_id uuid;
BEGIN
    FOR pending_request IN
        SELECT ar.*, er.threshold_hours, er.next_role
        FROM approval_requests ar
        LEFT JOIN escalation_rules er ON er.action_type = ar.entity_type AND er.is_active = true
        WHERE ar.status = 'pending'
          AND ar.created_at < now() - INTERVAL '1 hour'
    LOOP
        hours_pending := EXTRACT(EPOCH FROM (now() - pending_request.created_at)) / 3600;
        IF pending_request.threshold_hours IS NOT NULL AND hours_pending >= pending_request.threshold_hours THEN
            SELECT id INTO next_approver_id
            FROM profiles p JOIN user_roles ur ON ur.user_id = p.id
            WHERE ur.role = pending_request.next_role AND p.is_active = true LIMIT 1;

            IF next_approver_id IS NOT NULL THEN
                UPDATE approval_requests SET current_approver_id = next_approver_id, updated_at = now()
                WHERE id = pending_request.id;

                INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
                VALUES ('audit', NULL, pending_request.entity_type, pending_request.entity_id,
                    jsonb_build_object('action', 'escalate', 'details', jsonb_build_object(
                        'old_approver_id', pending_request.current_approver_id,
                        'new_approver_id', next_approver_id,
                        'hours_pending', hours_pending)));

                INSERT INTO notifications (user_id, type, title, message, metadata)
                VALUES (next_approver_id, 'escalation_alert', 'Approval Escalated',
                    'An approval request has been escalated to you after ' || hours_pending || ' hours.',
                    jsonb_build_object('entity_type', pending_request.entity_type, 'entity_id', pending_request.entity_id, 'approval_request_id', pending_request.id));

                IF pending_request.current_approver_id IS NOT NULL THEN
                    INSERT INTO notifications (user_id, type, title, message, metadata)
                    VALUES (pending_request.current_approver_id, 'escalation_alert', 'Approval Escalated',
                        'An approval request has been escalated due to inactivity.',
                        jsonb_build_object('entity_type', pending_request.entity_type, 'entity_id', pending_request.entity_id));
                END IF;
            END IF;
        END IF;
    END LOOP;
END; $$;

-- check_and_escalate_requests
CREATE OR REPLACE FUNCTION public.check_and_escalate_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    pending_step RECORD;
    rule RECORD;
    hours_pending integer;
    next_assignee_id uuid;
    new_due_at timestamptz;
BEGIN
    FOR pending_step IN
        SELECT rs.*, r.entity_type, r.request_no, r.current_assignee_id, r.property_id,
               r.last_action_at, r.submitted_at, r.created_at
        FROM public.request_steps rs
        JOIN public.requests r ON r.id = rs.request_id
        WHERE rs.status = 'pending'
          AND ((rs.due_at IS NOT NULL AND rs.due_at < now()) OR
               (rs.due_at IS NULL AND (r.last_action_at IS NOT NULL OR r.submitted_at IS NOT NULL)))
          AND (rs.escalated_at IS NULL OR rs.escalated_at < now() - interval '1 hour')
    LOOP
        SELECT * INTO rule FROM public.escalation_rules er
        WHERE er.is_active = true AND er.action_type = pending_step.entity_type
        ORDER BY er.threshold_hours ASC LIMIT 1;

        IF rule IS NULL THEN CONTINUE; END IF;

        IF pending_step.due_at IS NULL THEN
            hours_pending := EXTRACT(EPOCH FROM (now() - COALESCE(pending_step.last_action_at, pending_step.submitted_at, pending_step.created_at))) / 3600;
            IF hours_pending < rule.threshold_hours THEN CONTINUE; END IF;
        END IF;

        SELECT p.id INTO next_assignee_id
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
        LEFT JOIN public.user_properties up ON up.user_id = p.id
        WHERE ur.role = rule.next_role AND p.is_active = true
          AND (pending_step.property_id IS NULL OR ur.role IN ('regional_admin','regional_hr','corporate_admin') OR up.property_id = pending_step.property_id)
        ORDER BY (up.property_id = pending_step.property_id) DESC, p.created_at LIMIT 1;

        IF next_assignee_id IS NULL OR next_assignee_id = pending_step.assignee_id THEN CONTINUE; END IF;

        new_due_at := now() + make_interval(hours => COALESCE(pending_step.sla_hours, rule.threshold_hours));

        UPDATE public.request_steps SET assignee_id = next_assignee_id, escalated_at = now(), due_at = new_due_at WHERE id = pending_step.id;
        UPDATE public.requests SET current_assignee_id = next_assignee_id, last_action_at = now(), due_at = new_due_at WHERE id = pending_step.request_id;

        INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
        VALUES (pending_step.request_id, NULL, 'forwarded',
            jsonb_build_object('escalated', true, 'old_assignee_id', pending_step.assignee_id,
                'new_assignee_id', next_assignee_id, 'rule_id', rule.id, 'hours_pending', hours_pending));

        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('audit', NULL, pending_step.entity_type, pending_step.request_id,
            jsonb_build_object('action', 'escalate', 'details', jsonb_build_object(
                'old_assignee_id', pending_step.assignee_id,
                'new_assignee_id', next_assignee_id, 'rule_id', rule.id)));

        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (next_assignee_id, 'escalation_alert', 'Request Escalated',
            format('Request #%s has been escalated to you.', pending_step.request_no),
            jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type));

        IF pending_step.assignee_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (pending_step.assignee_id, 'escalation_alert', 'Request Escalated',
                format('Request #%s has been escalated to another approver.', pending_step.request_no),
                jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type));
        END IF;
    END LOOP;
END; $$;

-- Security functions (MFA, sessions, account lock) — redirect to system_events
CREATE OR REPLACE FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret public.mfa_secrets%ROWTYPE;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN false; END IF;
    SELECT * INTO v_secret FROM public.mfa_secrets WHERE user_id = p_user_id;
    IF NOT FOUND THEN RETURN false; END IF;
    IF p_verification_code IS NULL OR length(p_verification_code) != 6 THEN RETURN false; END IF;
    UPDATE public.mfa_secrets SET enabled = true, verified_at = now(), updated_at = now() WHERE user_id = p_user_id;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'mfa', p_user_id,
        jsonb_build_object('security_event_type', 'mfa.enabled', 'severity', 'info'));
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.disable_mfa(p_user_id uuid, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_record auth.users%ROWTYPE;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN false; END IF;
    SELECT * INTO v_user_record FROM auth.users WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN false; END IF;
    DELETE FROM public.mfa_secrets WHERE user_id = p_user_id;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'mfa', p_user_id,
        jsonb_build_object('security_event_type', 'mfa.disabled', 'severity', 'warning'));
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret public.mfa_secrets%ROWTYPE;
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
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'mfa', p_user_id,
        jsonb_build_object('security_event_type', 'mfa.verified', 'severity', 'info'));
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.lock_account(p_email text, p_duration_minutes integer DEFAULT 30)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id uuid;
BEGIN
    SELECT id INTO v_profile_id FROM public.profiles WHERE email = lower(p_email);
    IF FOUND THEN
        UPDATE public.profiles SET account_status = 'locked', locked_until = now() + (p_duration_minutes || ' minutes')::interval WHERE id = v_profile_id;
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', v_profile_id, 'profile', v_profile_id,
            jsonb_build_object('security_event_type', 'account.locked', 'severity', 'warning',
                'email', p_email, 'duration_minutes', p_duration_minutes));
        RETURN true;
    END IF;
    RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.user_sessions SET revoked_at = now(), revoked_reason = 'user_initiated'
    WHERE id = p_session_id AND user_id = auth.uid();
    IF FOUND THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', auth.uid(), 'session', p_session_id,
            jsonb_build_object('security_event_type', 'session.revoked', 'severity', 'info', 'session_id', p_session_id));
        RETURN true;
    END IF;
    RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.user_sessions SET revoked_at = now(), revoked_reason = 'revoke_all_other'
    WHERE user_id = p_user_id AND is_current = false AND revoked_at IS NULL;
    INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
    VALUES ('security', p_user_id, 'user', p_user_id,
        jsonb_build_object('security_event_type', 'session.revoke_all_other', 'severity', 'info',
            'count', (SELECT count(*) FROM public.user_sessions WHERE user_id = p_user_id AND revoked_at IS NOT NULL)));
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer DEFAULT 5)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.user_sessions
    WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > now();
    IF v_count > p_max_sessions THEN
        UPDATE public.user_sessions SET revoked_at = now(), revoked_reason = 'session_limit_exceeded'
        WHERE id IN (
            SELECT id FROM public.user_sessions
            WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > now() AND is_current = false
            ORDER BY last_active_at ASC LIMIT v_count - p_max_sessions + 1);
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', p_user_id, 'user', p_user_id,
            jsonb_build_object('security_event_type', 'session.limit_enforced', 'severity', 'warning',
                'previous_count', v_count, 'max_sessions', p_max_sessions));
    END IF;
    RETURN true;
END; $$;

-- log_security_event trigger (writes to security_audit_logs)
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_TABLE_NAME = 'users' AND NEW.encrypted_password != OLD.encrypted_password THEN
        INSERT INTO public.system_events (event_type, actor_id, entity_type, entity_id, metadata)
        VALUES ('security', NEW.id, 'user', NEW.id,
            jsonb_build_object('security_event_type', 'password.changed', 'severity', 'info'));
    END IF;
    RETURN NEW;
END; $$;

-- get_audit_data_for_export — redirect to system_events
CREATE OR REPLACE FUNCTION public.get_audit_data_for_export(
    p_scope jsonb,
    p_batch_size integer DEFAULT 1000,
    p_batch_offset integer DEFAULT 0
)
RETURNS TABLE(log_id uuid, entity_type text, entity_id text, action text, user_id uuid, user_name text, user_email text, created_at timestamptz, details jsonb, ip_address text, property_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin', 'regional_hr')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to export audit data';
    END IF;

    RETURN QUERY
    SELECT
        se.id AS log_id,
        se.entity_type,
        se.entity_id::text,
        (se.metadata->>'action')::text AS action,
        se.actor_id AS user_id,
        p.full_name AS user_name,
        u.email AS user_email,
        se.created_at,
        (se.metadata->'details') AS details,
        se.ip_address::text AS ip_address,
        (se.metadata->>'property_id') AS property_id
    FROM public.system_events se
    LEFT JOIN public.profiles p ON p.id = se.actor_id
    LEFT JOIN auth.users u ON u.id = se.actor_id
    WHERE se.event_type = 'audit'
      AND (p_scope->>'date_from' IS NULL OR se.created_at >= (p_scope->>'date_from')::timestamptz)
      AND (p_scope->>'date_to' IS NULL OR se.created_at <= (p_scope->>'date_to')::timestamptz)
      AND (p_scope->'entity_types' IS NULL OR se.entity_type = ANY(
              ARRAY(SELECT jsonb_array_elements_text(p_scope->'entity_types'))))
      AND (p_scope->'actions' IS NULL OR (se.metadata->>'action') = ANY(
              ARRAY(SELECT jsonb_array_elements_text(p_scope->'actions'))))
      AND (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('corporate_admin','compliance_officer'))
          OR COALESCE((se.metadata->>'property_id'), '') IN (
              SELECT p2.property_id::text FROM get_user_accessible_properties_for_audit() p2)
      )
    ORDER BY se.created_at DESC
    LIMIT p_batch_size
    OFFSET p_batch_offset;
END; $$;

-- get_compliance_dashboard_metrics — redirect to system_events
CREATE OR REPLACE FUNCTION public.get_compliance_dashboard_metrics(
    p_date_from date DEFAULT (now() - '30 days'::interval)::date,
    p_date_to date DEFAULT now()::date
)
RETURNS TABLE(metric_name text, metric_value bigint, metric_details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT
        'total_audit_logs'::text,
        count(*)::bigint,
        jsonb_build_object('period_start', p_date_from, 'period_end', p_date_to)
    FROM public.system_events
    WHERE event_type = 'audit'
      AND created_at::date BETWEEN p_date_from AND p_date_to

    UNION ALL

    SELECT
        'pii_access_events'::text,
        count(*)::bigint,
        jsonb_build_object(
            'unique_users_accessed', count(DISTINCT entity_id),
            'unique_accessors', count(DISTINCT actor_id))
    FROM public.system_events
    WHERE event_type = 'pii_access'
      AND created_at::date BETWEEN p_date_from AND p_date_to

    UNION ALL

    SELECT
        'active_audit_exports'::text,
        count(*)::bigint,
        jsonb_build_object(
            'pending', count(*) FILTER (WHERE status = 'pending'),
            'completed', count(*) FILTER (WHERE status = 'completed'),
            'expired_soon', count(*) FILTER (WHERE retention_until < now() + interval '7 days'))
    FROM public.audit_exports
    WHERE created_at::date BETWEEN p_date_from AND p_date_to

    UNION ALL

    SELECT
        'top_audited_entities'::text,
        count(*)::bigint,
        jsonb_build_object(
            'entity_type', entity_type,
            'percentage', round(100.0 * count(*) / sum(count(*)) OVER (), 2))
    FROM public.system_events
    WHERE event_type = 'audit'
      AND created_at::date BETWEEN p_date_from AND p_date_to
    GROUP BY entity_type
    ORDER BY count(*) DESC
    LIMIT 5;
END; $$;

-- STEP 3: Drop legacy tables
-- (CASCADE removes any dependent constraints; backward-compat views
--  audit_logs_v and security_audit_logs_v reference system_events, not these tables)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.security_audit_logs CASCADE;
