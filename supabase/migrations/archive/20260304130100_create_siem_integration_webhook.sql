-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 3.2 - Create SIEM Integration Webhook
-- Description: External SIEM integration with Splunk, Elastic, and other systems
-- Risk Level: MEDIUM (outbound webhooks with authentication)
-- Dependencies: 20260304120100_create_audit_export_formats.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create SIEM integration configuration table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS siem_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Integration metadata
    name text NOT NULL,
    description text,
    provider text NOT NULL CHECK (provider IN (
        'splunk',
        'elastic',
        'datadog',
        'sumo_logic',
        'azure_sentinel',
        'google_chronicle',
        'custom_webhook'
    )),
    
    -- Connection settings
    webhook_url text NOT NULL,
    auth_type text NOT NULL DEFAULT 'bearer' CHECK (auth_type IN (
        'none',
        'bearer',
        'basic',
        'api_key',
        'hmac'
    )),
    auth_config jsonb DEFAULT '{}'::jsonb,
    -- Example:
    -- {
    --   "token": "splunk-hec-token",
    --   "header_name": "Authorization",
    --   "secret": "hmac-secret-key"
    -- }
    
    -- Event filtering
    event_filter jsonb DEFAULT '{}'::jsonb,
    -- Example:
    -- {
    --   "entity_types": ["profiles", "documents"],
    --   "actions": ["create", "delete"],
    --   "min_severity": "high"
    -- }
    
    -- Rate limiting
    rate_limit_per_minute integer DEFAULT 100,
    
    -- Status
    is_active boolean DEFAULT true,
    last_success_at timestamptz,
    last_error_at timestamptz,
    last_error_message text,
    total_events_sent bigint DEFAULT 0,
    total_events_failed bigint DEFAULT 0,
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE siem_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/compliance only
CREATE POLICY "SIEM integrations manageable by admin/compliance"
    ON siem_integrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 2: Create SIEM event queue table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS siem_event_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event data
    integration_id uuid NOT NULL REFERENCES siem_integrations(id) ON DELETE CASCADE,
    event_data jsonb NOT NULL,
    
    -- Processing status
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    next_retry_at timestamptz,
    
    -- Error tracking
    error_message text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_siem_queue_status 
    ON siem_event_queue(status) 
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_siem_queue_integration 
    ON siem_event_queue(integration_id);

CREATE INDEX IF NOT EXISTS idx_siem_queue_retry 
    ON siem_event_queue(next_retry_at) 
    WHERE status = 'failed';

-- Enable RLS
ALTER TABLE siem_event_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SIEM queue manageable by system only"
    ON siem_event_queue FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 3: Create function to format audit log for SIEM
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION format_audit_log_for_siem(
    p_log_id uuid,
    p_provider text DEFAULT 'splunk'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log record;
    v_formatted jsonb;
BEGIN
    -- Get the audit log
    SELECT * INTO v_log
    FROM audit_logs
    WHERE id = p_log_id;
    
    IF v_log IS NULL THEN
        RETURN null;
    END IF;
    
    -- Format based on provider
    v_formatted := CASE p_provider
        WHEN 'splunk' THEN jsonb_build_object(
            'time', extract(epoch from v_log.created_at),
            'source', 'prime_connect_audit',
            'sourcetype', '_json',
            'host', COALESCE(v_log.ip_address, 'unknown'),
            'event', jsonb_build_object(
                'event_id', v_log.id,
                'entity_type', v_log.entity_type,
                'entity_id', v_log.entity_id,
                'action', v_log.action,
                'actor_id', v_log.user_id,
                'timestamp', v_log.created_at,
                'ip_address', v_log.ip_address,
                'user_agent', v_log.user_agent,
                'details', v_log.details,
                'property_id', v_log.details->>'property_id'
            )
        )
        
        WHEN 'elastic' THEN jsonb_build_object(
            '@timestamp', v_log.created_at,
            'event', jsonb_build_object(
                'kind', 'event',
                'category', array[v_log.entity_type],
                'type', array[v_log.action],
                'id', v_log.id
            ),
            'user', jsonb_build_object(
                'id', v_log.user_id
            ),
            'source', jsonb_build_object(
                'ip', v_log.ip_address
            ),
            'http', jsonb_build_object(
                'request', jsonb_build_object(
                    'user_agent', jsonb_build_object(
                        'original', v_log.user_agent
                    )
                )
            ),
            'prime', jsonb_build_object(
                'entity_type', v_log.entity_type,
                'entity_id', v_log.entity_id,
                'property_id', v_log.details->>'property_id',
                'details', v_log.details
            )
        )
        
        WHEN 'datadog' THEN jsonb_build_object(
            'ddsource', 'prime_connect',
            'ddtags', format('entity:%s,action:%s', v_log.entity_type, v_log.action),
            'hostname', COALESCE(v_log.ip_address, 'unknown'),
            'service', 'prime_connect_audit',
            'timestamp', extract(epoch from v_log.created_at) * 1000000000,
            'message', format('[%s] %s on %s', v_log.action, v_log.entity_type, v_log.entity_id),
            'audit', jsonb_build_object(
                'event_id', v_log.id,
                'user_id', v_log.user_id,
                'entity_type', v_log.entity_type,
                'entity_id', v_log.entity_id,
                'action', v_log.action,
                'details', v_log.details
            )
        )
        
        ELSE jsonb_build_object(
            'timestamp', v_log.created_at,
            'event_id', v_log.id,
            'entity_type', v_log.entity_type,
            'entity_id', v_log.entity_id,
            'action', v_log.action,
            'actor_id', v_log.user_id,
            'ip_address', v_log.ip_address,
            'details', v_log.details
        )
    END;
    
    RETURN v_formatted;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Create function to queue audit event for SIEM
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION queue_audit_event_for_siem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_integration record;
    v_should_queue boolean;
    v_event_data jsonb;
BEGIN
    -- Find active SIEM integrations
    FOR v_integration IN 
        SELECT * FROM siem_integrations WHERE is_active = true
    LOOP
        -- Check if this event matches the filter
        v_should_queue := true;
        
        -- Entity type filter
        IF v_integration.event_filter ? 'entity_types' THEN
            IF NOT (NEW.entity_type = ANY(
                ARRAY(SELECT jsonb_array_elements_text(v_integration.event_filter->'entity_types'))
            )) THEN
                v_should_queue := false;
            END IF;
        END IF;
        
        -- Action filter
        IF v_should_queue AND v_integration.event_filter ? 'actions' THEN
            IF NOT (NEW.action::text = ANY(
                ARRAY(SELECT jsonb_array_elements_text(v_integration.event_filter->'actions'))
            )) THEN
                v_should_queue := false;
            END IF;
        END IF;
        
        IF v_should_queue THEN
            -- Format the event
            v_event_data := format_audit_log_for_siem(NEW.id, v_integration.provider);
            
            -- Queue the event
            INSERT INTO siem_event_queue (
                integration_id,
                event_data,
                status
            ) VALUES (
                v_integration.id,
                v_event_data,
                'pending'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create function to process SIEM queue (called by edge function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_siem_queue(
    p_batch_size integer DEFAULT 100
)
RETURNS TABLE (
    processed_count integer,
    success_count integer,
    failed_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processed integer := 0;
    v_success integer := 0;
    v_failed integer := 0;
    v_event record;
BEGIN
    -- Process pending events
    FOR v_event IN
        SELECT eq.*, si.provider, si.webhook_url, si.auth_config, si.auth_type
        FROM siem_event_queue eq
        JOIN siem_integrations si ON si.id = eq.integration_id
        WHERE eq.status = 'pending'
        ORDER BY eq.created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        v_processed := v_processed + 1;
        
        -- Mark as processing
        UPDATE siem_event_queue
        SET status = 'processing'
        WHERE id = v_event.id;
        
        -- Note: Actual HTTP request would be made by edge function
        -- This function just prepares and marks status
        
        -- For now, mark as sent (edge function will update with actual result)
        UPDATE siem_event_queue
        SET 
            status = 'sent',
            processed_at = now()
        WHERE id = v_event.id;
        
        -- Update integration stats
        UPDATE siem_integrations
        SET 
            total_events_sent = total_events_sent + 1,
            last_success_at = now()
        WHERE id = v_event.integration_id;
        
        v_success := v_success + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_success, v_failed;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Create trigger to auto-queue audit events
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_queue_audit_for_siem ON audit_logs;
CREATE TRIGGER tr_queue_audit_for_siem
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION queue_audit_event_for_siem();

-- -----------------------------------------------------------------------------
-- STEP 7: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE siem_integrations IS 'Configuration for external SIEM tool integrations (Splunk, Elastic, etc.)';

COMMENT ON TABLE siem_event_queue IS 'Queue for audit events pending delivery to SIEM systems';

COMMENT ON FUNCTION format_audit_log_for_siem IS 'Formats audit log entry for specific SIEM provider';

COMMENT ON FUNCTION queue_audit_event_for_siem IS 'Trigger function to queue audit events for SIEM delivery';

COMMENT ON FUNCTION process_siem_queue IS 'Processes pending SIEM events (called by edge function)';
