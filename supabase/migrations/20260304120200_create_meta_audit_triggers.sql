-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 2.3 - Create Meta Audit Triggers
-- Description: Tracks access to audit exports themselves (meta-audit)
-- Risk Level: LOW (logging triggers on audit_exports table)
-- Dependencies: 20260304110100_create_audit_exports_table.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create meta audit log table (audit of audit exports)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_export_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the audit export
    export_id uuid NOT NULL REFERENCES audit_exports(id) ON DELETE CASCADE,
    
    -- Access metadata
    accessed_by uuid NOT NULL REFERENCES auth.users(id),
    accessed_at timestamptz DEFAULT now(),
    access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'verify', 'delete')),
    
    -- Context
    ip_address inet,
    user_agent text,
    
    -- Access result
    access_granted boolean DEFAULT true,
    denial_reason text,
    
    -- For bulk export detection
    is_bulk_download boolean DEFAULT false,
    related_export_ids uuid[],
    
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_export_access_logs_export_id 
    ON audit_export_access_logs(export_id);

CREATE INDEX IF NOT EXISTS idx_audit_export_access_logs_accessed_by 
    ON audit_export_access_logs(accessed_by);

CREATE INDEX IF NOT EXISTS idx_audit_export_access_logs_accessed_at 
    ON audit_export_access_logs(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_export_access_logs_bulk_download 
    ON audit_export_access_logs(is_bulk_download) 
    WHERE is_bulk_download = true;

-- -----------------------------------------------------------------------------
-- STEP 2: Enable RLS on meta audit logs
-- -----------------------------------------------------------------------------
ALTER TABLE audit_export_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/compliance can view all access logs
CREATE POLICY "Admin/compliance can view all export access logs"
    ON audit_export_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    );

-- Policy: Users can see when their exports were accessed
CREATE POLICY "Users can view access logs for their own exports"
    ON audit_export_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM audit_exports ae
            WHERE ae.id = audit_export_access_logs.export_id
            AND ae.requested_by = auth.uid()
        )
    );

-- Policy: System can insert access logs
CREATE POLICY "System can insert export access logs"
    ON audit_export_access_logs FOR INSERT
    WITH CHECK (accessed_by = auth.uid() OR auth.uid() IS NULL);

-- -----------------------------------------------------------------------------
-- STEP 3: Create trigger function for logging export access
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit_export_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip_address inet;
    v_user_agent text;
    v_actor_id uuid;
BEGIN
    -- Get connection info (if available)
    BEGIN
        v_ip_address := inet_client_addr();
    EXCEPTION WHEN OTHERS THEN
        v_ip_address := null;
    END;
    
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    
    -- Prefer authenticated actor; fall back to export owner for system jobs (cron/background).
    IF TG_OP = 'DELETE' THEN
        v_actor_id := COALESCE(auth.uid(), OLD.requested_by);
    ELSE
        v_actor_id := COALESCE(auth.uid(), NEW.requested_by, OLD.requested_by);
    END IF;

    -- Determine access type based on the change
    IF TG_OP = 'SELECT' THEN
        -- This won't fire directly, handled by explicit logging
        RETURN COALESCE(NEW, OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.download_count > OLD.download_count THEN
            -- Record download
            INSERT INTO audit_export_access_logs (
                export_id,
                accessed_by,
                access_type,
                ip_address,
                user_agent
            ) VALUES (
                NEW.id,
                v_actor_id,
                'download',
                v_ip_address,
                v_user_agent
            );
            
            -- Check for bulk download pattern
            PERFORM check_bulk_download_pattern(NEW.id, v_actor_id);
        END IF;
        
        IF NEW.integrity_verified AND NOT OLD.integrity_verified THEN
            -- Record verification
            INSERT INTO audit_export_access_logs (
                export_id,
                accessed_by,
                access_type,
                ip_address,
                user_agent
            ) VALUES (
                NEW.id,
                v_actor_id,
                'verify',
                v_ip_address,
                v_user_agent
            );
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_export_access_logs (
            export_id,
            accessed_by,
            access_type,
            ip_address,
            user_agent
        ) VALUES (
            OLD.id,
            v_actor_id,
            'delete',
            v_ip_address,
            v_user_agent
        );
        
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Create bulk download detection function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_bulk_download_pattern(
    p_export_id uuid,
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_download_count integer;
    v_time_window interval := interval '1 hour';
    v_bulk_threshold integer := 5;
    v_recent_exports uuid[];
BEGIN
    -- Count downloads in time window
    SELECT 
        count(*),
        array_agg(DISTINCT export_id)
    INTO v_download_count, v_recent_exports
    FROM audit_export_access_logs
    WHERE accessed_by = p_user_id
    AND access_type = 'download'
    AND accessed_at > now() - v_time_window;
    
    -- Check if bulk threshold exceeded
    IF v_download_count >= v_bulk_threshold THEN
        -- Mark recent downloads as bulk
        UPDATE audit_export_access_logs
        SET 
            is_bulk_download = true,
            related_export_ids = v_recent_exports
        WHERE accessed_by = p_user_id
        AND access_type = 'download'
        AND accessed_at > now() - v_time_window;
        
        -- Create alert
        PERFORM pg_notify('compliance_alert', json_build_object(
            'type', 'bulk_download_detected',
            'user_id', p_user_id,
            'export_count', v_download_count,
            'time_window', '1 hour',
            'severity', 'high'
        )::text);
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create function to detect suspicious export patterns
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION detect_suspicious_export_activity(
    p_lookback_hours integer DEFAULT 24
)
RETURNS TABLE (
    alert_type text,
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
BEGIN
    -- Verify admin/compliance access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    -- Bulk download alerts
    SELECT 
        'bulk_export_download'::text,
        aeal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'download_count', count(*),
            'unique_exports', count(DISTINCT aeal.export_id),
            'first_download', min(aeal.accessed_at),
            'last_download', max(aeal.accessed_at)
        ),
        'high'::text,
        now()
    FROM audit_export_access_logs aeal
    LEFT JOIN profiles p ON p.id = aeal.accessed_by
    WHERE aeal.accessed_at > now() - (p_lookback_hours || ' hours')::interval
    AND aeal.access_type = 'download'
    GROUP BY aeal.accessed_by, p.full_name
    HAVING count(*) > 10
    
    UNION ALL
    
    -- Unusual hour access
    SELECT 
        'off_hours_export_access'::text,
        aeal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'access_count', count(*),
            'access_times', array_agg(DISTINCT extract(hour from aeal.accessed_at))
        ),
        'medium'::text,
        now()
    FROM audit_export_access_logs aeal
    LEFT JOIN profiles p ON p.id = aeal.accessed_by
    WHERE aeal.accessed_at > now() - (p_lookback_hours || ' hours')::interval
    AND extract(hour from aeal.accessed_at) NOT BETWEEN 6 AND 22
    GROUP BY aeal.accessed_by, p.full_name
    HAVING count(*) > 3
    
    UNION ALL
    
    -- Export access by unauthorized users
    SELECT 
        'unauthorized_export_access_attempt'::text,
        aeal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'attempt_count', count(*),
            'denial_reasons', array_agg(DISTINCT aeal.denial_reason)
        ),
        'critical'::text,
        now()
    FROM audit_export_access_logs aeal
    LEFT JOIN profiles p ON p.id = aeal.accessed_by
    WHERE aeal.accessed_at > now() - (p_lookback_hours || ' hours')::interval
    AND aeal.access_granted = false
    GROUP BY aeal.accessed_by, p.full_name
    HAVING count(*) > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Create trigger on audit_exports for meta-audit
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_audit_export_meta_audit ON audit_exports;
CREATE TRIGGER tr_audit_export_meta_audit
    AFTER UPDATE OR DELETE ON audit_exports
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_export_access();

-- -----------------------------------------------------------------------------
-- STEP 7: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE audit_export_access_logs IS 'Meta-audit: tracks who accessed audit exports and when';

COMMENT ON FUNCTION log_audit_export_access IS 'Trigger function to log access to audit exports';

COMMENT ON FUNCTION check_bulk_download_pattern IS 'Detects and flags bulk download patterns for security';

COMMENT ON FUNCTION detect_suspicious_export_activity IS 'Identifies suspicious activity around audit exports';
