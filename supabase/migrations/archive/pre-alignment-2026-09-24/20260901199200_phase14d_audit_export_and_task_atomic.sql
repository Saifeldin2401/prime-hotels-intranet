-- Phase 14d.
-- get_audit_data_for_export: corporate_admin/compliance_officer branch returned every org's
-- system_events audit rows + auth.users.email with no tenant scoping. system_events has no
-- organization_id -> restrict to platform super admin until per-tenant audit export is built.
CREATE OR REPLACE FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer DEFAULT 1000, p_batch_offset integer DEFAULT 0)
 RETURNS TABLE(log_id uuid, entity_type text, entity_id text, action text, user_id uuid, user_name text, user_email text, created_at timestamp with time zone, details jsonb, ip_address text, property_id text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.is_platform_super_admin() THEN
        RAISE EXCEPTION 'Only platform operators may export audit data' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT se.id, se.entity_type, se.entity_id::text, (se.metadata->>'action')::text,
           se.actor_id, p.full_name, u.email, se.created_at, (se.metadata->'details'),
           se.ip_address::text, (se.metadata->>'property_id')
    FROM public.system_events se
    LEFT JOIN public.profiles p ON p.id = se.actor_id
    LEFT JOIN auth.users u ON u.id = se.actor_id
    WHERE se.event_type = 'audit'
      AND (p_scope->>'date_from' IS NULL OR se.created_at >= (p_scope->>'date_from')::timestamptz)
      AND (p_scope->>'date_to' IS NULL OR se.created_at <= (p_scope->>'date_to')::timestamptz)
      AND (p_scope->'entity_types' IS NULL OR se.entity_type = ANY(ARRAY(SELECT jsonb_array_elements_text(p_scope->'entity_types'))))
      AND (p_scope->'actions' IS NULL OR (se.metadata->>'action') = ANY(ARRAY(SELECT jsonb_array_elements_text(p_scope->'actions'))))
    ORDER BY se.created_at DESC
    LIMIT p_batch_size OFFSET p_batch_offset;
END; $function$;

-- create_task_atomic: tasks is a purged domain. Allowed cross-tenant task injection +
-- notification phishing to an arbitrary user_id. Revoke from client roles.
REVOKE EXECUTE ON FUNCTION public.create_task_atomic(jsonb, jsonb) FROM anon, authenticated, public;
