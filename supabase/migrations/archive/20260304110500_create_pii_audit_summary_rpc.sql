-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 1.6 - Create PII Audit Summary RPC
-- Description: PII access reporting and compliance monitoring functions
-- Risk Level: MEDIUM (accesses sensitive PII access data)
-- Dependencies: 20260304110300_secure_audit_logs_rls.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Function to get PII access summary for a user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pii_access_summary(
    p_target_user_id uuid DEFAULT NULL,
    p_date_from date DEFAULT (now() - interval '30 days')::date,
    p_date_to date DEFAULT now()::date
)
RETURNS TABLE (
    access_date date,
    access_count bigint,
    unique_accessors bigint,
    top_accessed_fields text[],
    risk_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
    v_is_target_user boolean;
BEGIN
    -- Check permissions
    v_is_target_user := (p_target_user_id = auth.uid());
    
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_hr')
    ) INTO v_is_admin;
    
    -- Must be admin or accessing own data
    IF NOT (v_is_admin OR v_is_target_user OR p_target_user_id IS NULL) THEN
        RAISE EXCEPTION 'Access denied to PII access summary';
    END IF;

    RETURN QUERY
    WITH daily_access AS (
        SELECT 
            date(pal.created_at) as access_day,
            count(*) as daily_count,
            count(DISTINCT pal.accessed_by) as daily_accessors,
            array_remove(array_agg(DISTINCT f.field), NULL) as fields,
            -- Calculate risk score based on volume and diversity
            CASE 
                WHEN count(*) > 50 THEN 5
                WHEN count(*) > 20 THEN 4
                WHEN count(*) > 10 THEN 3
                WHEN count(*) > 5 THEN 2
                ELSE 1
            END +
            CASE 
                WHEN count(DISTINCT pal.accessed_by) > 5 THEN 3
                WHEN count(DISTINCT pal.accessed_by) > 2 THEN 2
                ELSE 1
            END as daily_risk
        FROM pii_access_logs pal
        LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
        AND (
            p_target_user_id IS NULL 
            OR pal.user_id = p_target_user_id
        )
        GROUP BY date(pal.created_at)
    )
    SELECT 
        da.access_day,
        da.daily_count,
        da.daily_accessors,
        da.fields as top_accessed_fields,
        da.daily_risk as risk_score
    FROM daily_access da
    ORDER BY da.access_day DESC;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 2: Function to get top PII accessors
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_pii_accessors(
    p_date_from date DEFAULT (now() - interval '30 days')::date,
    p_date_to date DEFAULT now()::date,
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    accessor_id uuid,
    accessor_name text,
    accessor_role text,
    total_accesses bigint,
    unique_targets bigint,
    most_accessed_field text,
    last_accessed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_hr', 'regional_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    WITH accessor_stats AS (
        SELECT 
            pal.accessed_by as user_id,
            count(*) as access_count,
            count(DISTINCT pal.user_id) as target_count,
            mode() WITHIN GROUP (ORDER BY f.field) as common_field,
            max(pal.created_at) as last_access
        FROM pii_access_logs pal
        LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
        GROUP BY pal.accessed_by
        ORDER BY access_count DESC
        LIMIT p_limit
    )
    SELECT 
        ast.user_id as accessor_id,
        p.full_name as accessor_name,
        (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = ast.user_id LIMIT 1) as accessor_role,
        ast.access_count as total_accesses,
        ast.target_count as unique_targets,
        ast.common_field as most_accessed_field,
        ast.last_access as last_accessed_at
    FROM accessor_stats ast
    LEFT JOIN profiles p ON p.id = ast.user_id
    ORDER BY ast.access_count DESC;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 3: Function to detect anomalous PII access
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION detect_pii_access_anomalies(
    p_lookback_days integer DEFAULT 7,
    p_threshold_multiplier numeric DEFAULT 3.0
)
RETURNS TABLE (
    anomaly_type text,
    user_id uuid,
    user_name text,
    details jsonb,
    severity text,
    detected_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avg_daily_access numeric;
    v_stddev_daily_access numeric;
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Calculate baseline statistics
    SELECT 
        avg(daily_count),
        COALESCE(stddev(daily_count), 0)
    INTO v_avg_daily_access, v_stddev_daily_access
    FROM (
        SELECT 
            date(created_at) as day,
            count(*) as daily_count
        FROM pii_access_logs
        WHERE created_at > now() - (p_lookback_days * 2 || ' days')::interval
        GROUP BY date(created_at)
    ) daily_stats;

    RETURN QUERY
    -- High volume anomaly
    SELECT 
        'high_volume'::text as anomaly_type,
        pal.accessed_by as user_id,
        p.full_name as user_name,
        jsonb_build_object(
            'access_count', count(*),
            'date_range', jsonb_build_object(
                'from', min(pal.created_at)::date,
                'to', max(pal.created_at)::date
            ),
            'unique_targets', count(DISTINCT pal.user_id),
            'avg_baseline', v_avg_daily_access
        ) as details,
        CASE 
            WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * p_threshold_multiplier)) THEN 'high'
            WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * (p_threshold_multiplier / 2))) THEN 'medium'
            ELSE 'low'
        END as severity,
        now() as detected_at
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > (v_avg_daily_access + (v_stddev_daily_access * 2))
    
    UNION ALL
    
    -- Off-hours access anomaly
    SELECT 
        'off_hours_access'::text,
        pal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'off_hours_count', count(*),
            'access_times', array_agg(distinct extract(hour from pal.created_at))
        ),
        'medium'::text,
        now()
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
    AND extract(hour from pal.created_at) NOT BETWEEN 8 AND 18
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > 5
    
    UNION ALL
    
    -- Bulk access anomaly (many users in short time)
    SELECT 
        'bulk_access_pattern'::text,
        pal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'records_accessed', count(*),
            'time_window_minutes', 60
        ),
        'high'::text,
        now()
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - interval '1 hour'
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > 20;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Function to get compliance dashboard metrics
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_compliance_dashboard_metrics(
    p_date_from date DEFAULT (now() - interval '30 days')::date,
    p_date_to date DEFAULT now()::date
)
RETURNS TABLE (
    metric_name text,
    metric_value bigint,
    metric_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    -- Total audit logs generated
    SELECT 
        'total_audit_logs'::text,
        count(*)::bigint,
        jsonb_build_object(
            'period_start', p_date_from,
            'period_end', p_date_to
        )
    FROM audit_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- PII access events
    SELECT 
        'pii_access_events'::text,
        count(*)::bigint,
        jsonb_build_object(
            'unique_users_accessed', count(DISTINCT user_id),
            'unique_accessors', count(DISTINCT accessed_by)
        )
    FROM pii_access_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- Active audit exports
    SELECT 
        'active_audit_exports'::text,
        count(*)::bigint,
        jsonb_build_object(
            'pending', count(*) FILTER (WHERE status = 'pending'),
            'completed', count(*) FILTER (WHERE status = 'completed'),
            'expired_soon', count(*) FILTER (WHERE retention_until < now() + interval '7 days')
        )
    FROM audit_exports
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- Top entity types audited
    SELECT 
        'top_audited_entities'::text,
        count(*)::bigint,
        jsonb_build_object(
            'entity_type', entity_type,
            'percentage', round(100.0 * count(*) / sum(count(*)) OVER (), 2)
        )
    FROM audit_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    GROUP BY entity_type
    ORDER BY count(*) DESC
    LIMIT 5;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Function to get audit exportable data (for actual export generation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_data_for_export(
    p_scope jsonb,
    p_batch_size integer DEFAULT 1000,
    p_batch_offset integer DEFAULT 0
)
RETURNS TABLE (
    log_id uuid,
    entity_type text,
    entity_id text,
    action text,
    user_id uuid,
    user_name text,
    user_email text,
    created_at timestamptz,
    details jsonb,
    ip_address text,
    property_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user has export permission
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin', 'regional_hr')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to export audit data';
    END IF;

    RETURN QUERY
    SELECT 
        al.id as log_id,
        al.entity_type,
        al.entity_id::text,
        al.action::text,
        al.user_id,
        p.full_name as user_name,
        u.email as user_email,
        al.created_at,
        al.details,
        al.ip_address,
        al.details->>'property_id' as property_id
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    LEFT JOIN auth.users u ON u.id = al.user_id
    WHERE (
        -- Date range filter
        (p_scope->>'date_from' IS NULL OR al.created_at >= (p_scope->>'date_from')::timestamptz)
        AND (p_scope->>'date_to' IS NULL OR al.created_at <= (p_scope->>'date_to')::timestamptz)
    )
    AND (
        -- Entity type filter
        (p_scope->'entity_types' IS NULL OR al.entity_type = ANY(ARRAY(
            SELECT jsonb_array_elements_text(p_scope->'entity_types')
        )))
    )
    AND (
        -- Actions filter
        (p_scope->'actions' IS NULL OR al.action::text = ANY(ARRAY(
            SELECT jsonb_array_elements_text(p_scope->'actions')
        )))
    )
    AND (
        -- Property scoping for non-admin roles
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
        OR COALESCE(al.details->>'property_id', '') IN (
            SELECT p.property_id::text FROM get_user_accessible_properties_for_audit() p
        )
    )
    ORDER BY al.created_at DESC
    LIMIT p_batch_size
    OFFSET p_batch_offset;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION get_pii_access_summary IS 'Generates daily PII access summary for compliance monitoring';

COMMENT ON FUNCTION get_top_pii_accessors IS 'Identifies users with highest PII access activity';

COMMENT ON FUNCTION detect_pii_access_anomalies IS 'Detects anomalous PII access patterns for security alerts';

COMMENT ON FUNCTION get_compliance_dashboard_metrics IS 'Returns key metrics for compliance dashboard';

COMMENT ON FUNCTION get_audit_data_for_export IS 'Retrieves audit log data for export generation with batching support';
