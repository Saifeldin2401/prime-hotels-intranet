-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 3.1 - Create Scheduled Compliance Reports
-- Description: Automated report generation with scheduling and delivery
-- Risk Level: MEDIUM (automated job creation with data export)
-- Dependencies: 20260304110400_create_audit_export_rpc.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create scheduled report configuration table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_compliance_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report metadata
    report_name text NOT NULL UNIQUE,
    description text,
    report_type text NOT NULL CHECK (report_type IN (
        'daily_summary',
        'weekly_executive',
        'monthly_compliance',
        'quarterly_audit',
        'pii_access_review',
        'anomaly_report',
        'custom'
    )),
    
    -- Schedule configuration
    schedule_cron text NOT NULL,  -- Cron expression
    schedule_timezone text DEFAULT 'Asia/Riyadh',
    last_run_at timestamptz,
    next_run_at timestamptz,
    
    -- Report scope (same structure as audit_exports.export_scope)
    report_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Export format
    format audit_export_format NOT NULL DEFAULT 'pdf',
    template_name text REFERENCES audit_export_templates(template_name),
    
    -- Delivery configuration
    delivery_config jsonb DEFAULT '{}'::jsonb,
    -- Example:
    -- {
    --   "email_recipients": ["compliance@phg.com", "cfo@phg.com"],
    --   "email_subject": "Daily Compliance Report",
    --   "include_attachment": true,
    --   "upload_to_storage": true,
    --   "storage_folder": "scheduled-reports/daily/"
    -- }
    
    -- Report ownership
    created_by uuid NOT NULL REFERENCES auth.users(id),
    recipient_roles app_role[],  -- Auto-deliver to users with these roles
    
    -- Status
    is_active boolean DEFAULT true,
    run_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    last_error text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by 
    ON scheduled_compliance_reports(created_by);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run 
    ON scheduled_compliance_reports(next_run_at) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_type 
    ON scheduled_compliance_reports(report_type);

-- Enable RLS
ALTER TABLE scheduled_compliance_reports ENABLE ROW LEVEL SECURITY;

-- Policy: View own reports or admin can view all
CREATE POLICY "Users can view own scheduled reports"
    ON scheduled_compliance_reports FOR SELECT
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    );

-- Policy: Manage own reports or admin can manage all
CREATE POLICY "Users can manage own scheduled reports"
    ON scheduled_compliance_reports FOR ALL
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 2: Create report execution history table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_report_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES scheduled_compliance_reports(id) ON DELETE CASCADE,
    
    -- Execution details
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    
    -- Results
    export_id uuid REFERENCES audit_exports(id),
    records_exported integer,
    file_size_bytes bigint,
    
    -- Delivery tracking
    emails_sent integer DEFAULT 0,
    emails_delivered integer DEFAULT 0,
    emails_failed integer DEFAULT 0,
    
    -- Error info
    error_message text,
    error_details jsonb,
    
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_executions_report_id 
    ON scheduled_report_executions(report_id);

CREATE INDEX IF NOT EXISTS idx_report_executions_status 
    ON scheduled_report_executions(status);

-- Enable RLS
ALTER TABLE scheduled_report_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Report executions viewable by report owner or admin"
    ON scheduled_report_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM scheduled_compliance_reports r
            WHERE r.id = scheduled_report_executions.report_id
            AND (r.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role IN ('corporate_admin', 'compliance_officer')
            ))
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 3: Create function to execute scheduled report
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execute_scheduled_report(
    p_report_id uuid
)
RETURNS uuid  -- Returns execution_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report record;
    v_execution_id uuid;
    v_export_result record;
    v_fallback_export_id uuid;
    v_fallback_estimated_records bigint;
BEGIN
    -- Get report configuration
    SELECT * INTO v_report
    FROM scheduled_compliance_reports
    WHERE id = p_report_id
    AND is_active = true;
    
    IF v_report IS NULL THEN
        RAISE EXCEPTION 'Report not found or inactive';
    END IF;
    
    -- Create execution record
    INSERT INTO scheduled_report_executions (
        report_id,
        status
    ) VALUES (
        p_report_id,
        'running'
    )
    RETURNING id INTO v_execution_id;
    
    -- Update report last_run_at
    UPDATE scheduled_compliance_reports
    SET 
        last_run_at = now(),
        -- pg_cron does not provide next_scheduled_execution(); use conservative interval fallback.
        next_run_at = CASE
            WHEN split_part(v_report.schedule_cron, ' ', 1) LIKE '*/%' THEN now() + interval '5 minutes'
            WHEN split_part(v_report.schedule_cron, ' ', 2) LIKE '*/%' THEN now() + interval '12 hours'
            WHEN split_part(v_report.schedule_cron, ' ', 3) <> '*' THEN now() + interval '1 month'
            WHEN split_part(v_report.schedule_cron, ' ', 5) <> '*' THEN now() + interval '7 days'
            ELSE now() + interval '1 day'
        END,
        run_count = run_count + 1
    WHERE id = p_report_id;
    
    -- Create the audit export
    SELECT * INTO v_export_result
    FROM create_audit_export(
        v_report.report_name || ' - ' || now()::date::text,
        'Automated scheduled report: ' || v_report.description,
        v_report.report_scope,
        v_report.format,
        90  -- Standard retention
    );

    -- Scheduled pg_cron executions run without JWT; create export in system context.
    IF v_export_result.status = 'error' AND auth.uid() IS NULL THEN
        INSERT INTO audit_exports (
            requested_by,
            export_name,
            description,
            export_scope,
            format,
            status,
            retention_until,
            record_count
        ) VALUES (
            v_report.created_by,
            v_report.report_name || ' - ' || now()::date::text,
            'Automated scheduled report: ' || v_report.description,
            v_report.report_scope,
            v_report.format,
            'pending',
            calculate_retention_date(v_report.format, v_report.created_by, 90),
            null
        )
        RETURNING id INTO v_fallback_export_id;

        v_fallback_estimated_records := 0;

        SELECT
            v_fallback_export_id AS export_id,
            'pending'::text AS status,
            'Audit export queued successfully (system context)'::text AS message,
            v_fallback_estimated_records AS estimated_records
        INTO v_export_result;
    END IF;
    
    IF v_export_result.status = 'error' THEN
        -- Mark execution as failed
        UPDATE scheduled_report_executions
        SET 
            status = 'failed',
            completed_at = now(),
            error_message = v_export_result.message
        WHERE id = v_execution_id;
        
        -- Update report failure count
        UPDATE scheduled_compliance_reports
        SET 
            failure_count = failure_count + 1,
            last_error = v_export_result.message
        WHERE id = p_report_id;
        
        RETURN v_execution_id;
    END IF;
    
    -- Update execution with export info
    UPDATE scheduled_report_executions
    SET 
        status = 'completed',
        completed_at = now(),
        export_id = v_export_result.export_id,
        records_exported = v_export_result.estimated_records
    WHERE id = v_execution_id;
    
    -- Note: Actual file generation and email delivery would be handled
    -- by an edge function or background job
    
    RETURN v_execution_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Create function to schedule default reports
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_default_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Daily PII Access Summary (for compliance officers)
    INSERT INTO scheduled_compliance_reports (
        report_name,
        description,
        report_type,
        schedule_cron,
        report_scope,
        format,
        template_name,
        delivery_config,
        recipient_roles,
        created_by
    ) VALUES (
        'Daily PII Access Summary',
        'Daily summary of PII access events for privacy compliance monitoring',
        'pii_access_review',
        '0 8 * * *',  -- 8 AM daily
        '{"type": "pii_summary", "date_range": "1d"}',
        'pdf',
        'SOX_Compliance_Report',
        '{"email_subject": "Daily PII Access Summary", "include_attachment": true}'::jsonb,
        ARRAY['compliance_officer', 'corporate_admin'],
        auth.uid()
    )
    ON CONFLICT DO NOTHING;
    
    -- Weekly Executive Compliance Report
    INSERT INTO scheduled_compliance_reports (
        report_name,
        description,
        report_type,
        schedule_cron,
        report_scope,
        format,
        template_name,
        delivery_config,
        recipient_roles,
        created_by
    ) VALUES (
        'Weekly Executive Compliance Report',
        'High-level compliance metrics for executive review',
        'weekly_executive',
        '0 9 * * 1',  -- 9 AM Mondays
        '{"type": "executive_summary", "date_range": "7d"}',
        'pdf',
        'SOX_Compliance_Report',
        '{"email_subject": "Weekly Compliance Report", "include_attachment": true}'::jsonb,
        ARRAY['corporate_admin'],
        auth.uid()
    )
    ON CONFLICT DO NOTHING;
    
    -- Monthly Full Compliance Export
    INSERT INTO scheduled_compliance_reports (
        report_name,
        description,
        report_type,
        schedule_cron,
        report_scope,
        format,
        template_name,
        delivery_config,
        recipient_roles,
        created_by
    ) VALUES (
        'Monthly Compliance Archive',
        'Complete monthly audit trail for long-term retention',
        'monthly_compliance',
        '0 2 1 * *',  -- 2 AM on 1st of month
        '{"type": "full_audit", "date_range": "30d"}',
        'excel',
        'Detailed_Audit_Export',
        '{"upload_to_storage": true, "storage_folder": "monthly-archives/"}'::jsonb,
        ARRAY['compliance_officer'],
        auth.uid()
    )
    ON CONFLICT DO NOTHING;
    
    -- Anomaly Detection Report (Twice daily)
    INSERT INTO scheduled_compliance_reports (
        report_name,
        description,
        report_type,
        schedule_cron,
        report_scope,
        format,
        delivery_config,
        recipient_roles,
        created_by
    ) VALUES (
        'Security Anomaly Report',
        'Automated detection of unusual access patterns',
        'anomaly_report',
        '0 */12 * * *',  -- Every 12 hours
        '{"type": "anomaly_detection", "lookback_hours": 12}',
        'json',
        '{"email_subject": "ALERT: Security Anomalies Detected", "include_attachment": false}'::jsonb,
        ARRAY['compliance_officer', 'corporate_admin'],
        auth.uid()
    )
    ON CONFLICT DO NOTHING;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create cron job to process scheduled reports
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
    'process-scheduled-reports',
    '*/5 * * * *',  -- Check every 5 minutes
    $$
    SELECT execute_scheduled_report(id)
    FROM scheduled_compliance_reports
    WHERE is_active = true
    AND (next_run_at IS NULL OR next_run_at <= now())
    $$
);

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE scheduled_compliance_reports IS 'Configuration for automated compliance report generation and delivery';

COMMENT ON TABLE scheduled_report_executions IS 'Execution history and status tracking for scheduled reports';

COMMENT ON FUNCTION execute_scheduled_report IS 'Executes a scheduled report and creates audit export';

COMMENT ON FUNCTION seed_default_scheduled_reports IS 'Seeds default scheduled reports for common compliance needs';
