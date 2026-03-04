-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 2.1 - Create Compliance Dashboard Views
-- Description: Materialized views for efficient compliance dashboard queries
-- Risk Level: LOW (read-only views, auto-refreshed)
-- Dependencies: 20260304110500_create_pii_audit_summary_rpc.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create materialized view for daily audit metrics
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compliance_daily_metrics AS
SELECT 
    date_trunc('day', al.created_at) as metric_date,
    al.entity_type,
    al.action,
    count(*) as event_count,
    count(DISTINCT al.user_id) as unique_users,
    count(DISTINCT COALESCE(al.details->>'property_id', 'unscoped')) as affected_properties
FROM audit_logs al
WHERE al.created_at > now() - interval '90 days'
GROUP BY 
    date_trunc('day', al.created_at),
    al.entity_type,
    al.action;

-- Index for efficient querying
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_daily_metrics_pk 
    ON mv_compliance_daily_metrics(metric_date, entity_type, action);

CREATE INDEX IF NOT EXISTS idx_mv_compliance_daily_metrics_date 
    ON mv_compliance_daily_metrics(metric_date DESC);

-- -----------------------------------------------------------------------------
-- STEP 2: Create materialized view for PII access patterns
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compliance_pii_patterns AS
SELECT 
    date_trunc('day', pal.created_at) as access_date,
    f.field as pii_field,
    count(*) as access_count,
    count(DISTINCT pal.accessed_by) as unique_accessors,
    count(DISTINCT pal.user_id) as unique_targets,
    -- Calculate risk indicators
    CASE 
        WHEN count(*) > 100 THEN 'high'
        WHEN count(*) > 50 THEN 'medium'
        ELSE 'low'
    END as volume_risk
FROM pii_access_logs pal
LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
WHERE pal.created_at > now() - interval '90 days'
GROUP BY 
    date_trunc('day', pal.created_at),
    f.field;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_pii_patterns_pk 
    ON mv_compliance_pii_patterns(access_date, pii_field);

CREATE INDEX IF NOT EXISTS idx_mv_compliance_pii_patterns_date 
    ON mv_compliance_pii_patterns(access_date DESC);

-- -----------------------------------------------------------------------------
-- STEP 3: Create materialized view for user activity summary
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compliance_user_activity AS
SELECT 
    al.user_id,
    p.full_name as user_name,
    (SELECT ur.role FROM user_roles ur WHERE ur.user_id = al.user_id LIMIT 1) as primary_role,
    date_trunc('day', al.created_at) as activity_date,
    count(*) as total_actions,
    count(*) FILTER (WHERE al.action = 'create') as creates,
    count(*) FILTER (WHERE al.action = 'update') as updates,
    count(*) FILTER (WHERE al.action = 'delete') as deletes,
    count(*) FILTER (WHERE al.action = 'view') as views,
    count(DISTINCT al.entity_type) as entity_types_accessed,
    max(al.created_at) as last_activity_at
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.created_at > now() - interval '90 days'
  AND al.user_id IS NOT NULL
GROUP BY 
    al.user_id,
    p.full_name,
    date_trunc('day', al.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_user_activity_pk 
    ON mv_compliance_user_activity(user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_mv_compliance_user_activity_date 
    ON mv_compliance_user_activity(activity_date DESC);

-- -----------------------------------------------------------------------------
-- STEP 4: Create view for real-time compliance alerts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_compliance_alerts AS
WITH recent_activity AS (
    SELECT 
        al.user_id,
        count(*) as action_count,
        count(DISTINCT al.entity_type) as entity_types,
        array_agg(DISTINCT al.entity_type) as entities,
        max(al.created_at) as last_action
    FROM audit_logs al
    WHERE al.created_at > now() - interval '1 hour'
    GROUP BY al.user_id
    HAVING count(*) > 50  -- Threshold for high activity alert
)
SELECT 
    'high_activity'::text as alert_type,
    'warning'::text as severity,
    ra.user_id,
    p.full_name as user_name,
    jsonb_build_object(
        'action_count', ra.action_count,
        'entity_types', ra.entity_types,
        'entities', ra.entities,
        'time_window', 'last_hour'
    ) as alert_data,
    ra.last_action as triggered_at,
    now() as created_at
FROM recent_activity ra
LEFT JOIN profiles p ON p.id = ra.user_id

UNION ALL

-- Unusual PII access alert
SELECT 
    'unusual_pii_access'::text,
    'critical'::text,
    pal.accessed_by as user_id,
    p.full_name as user_name,
    jsonb_build_object(
        'access_count', count(*),
        'unique_targets', count(DISTINCT pal.user_id),
        'fields_accessed', array_remove(array_agg(DISTINCT f.field), NULL)
    ),
    max(pal.created_at),
    now()
FROM pii_access_logs pal
LEFT JOIN profiles p ON p.id = pal.accessed_by
LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
WHERE pal.created_at > now() - interval '1 hour'
GROUP BY pal.accessed_by, p.full_name
HAVING count(*) > 20

UNION ALL

-- Failed export alert
SELECT 
    'failed_export'::text,
    'error'::text,
    ae.requested_by as user_id,
    p.full_name as user_name,
    jsonb_build_object(
        'export_id', ae.id,
        'export_name', ae.export_name,
        'error_message', ae.error_message
    ),
    ae.updated_at,
    now()
FROM audit_exports ae
LEFT JOIN profiles p ON p.id = ae.requested_by
WHERE ae.status = 'failed'
  AND ae.updated_at > now() - interval '24 hours';

-- -----------------------------------------------------------------------------
-- STEP 5: Create function to refresh materialized views
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_compliance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Concurrent refresh is not allowed inside functions/transactions.
    REFRESH MATERIALIZED VIEW mv_compliance_daily_metrics;
    REFRESH MATERIALIZED VIEW mv_compliance_pii_patterns;
    REFRESH MATERIALIZED VIEW mv_compliance_user_activity;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Create cron schedule for view refresh (every 15 minutes)
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
    'refresh-compliance-views',
    '*/15 * * * *',
    'SELECT refresh_compliance_views()'
);

-- -----------------------------------------------------------------------------
-- STEP 7: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON MATERIALIZED VIEW mv_compliance_daily_metrics IS 'Daily aggregated audit metrics for compliance dashboard (refreshed every 15 minutes)';

COMMENT ON MATERIALIZED VIEW mv_compliance_pii_patterns IS 'PII access patterns for privacy compliance monitoring';

COMMENT ON MATERIALIZED VIEW mv_compliance_user_activity IS 'User activity summary for behavioral analysis';

COMMENT ON VIEW vw_compliance_alerts IS 'Real-time compliance alerts view (unusual activity, failed exports, etc.)';

COMMENT ON FUNCTION refresh_compliance_views IS 'Refreshes all compliance materialized views concurrently';
