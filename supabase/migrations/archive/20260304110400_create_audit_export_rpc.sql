-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 1.5 - Create Audit Export RPC
-- Description: Secure RPC function for generating audit exports with scoping
-- Risk Level: MEDIUM (powerful function with security definer)
-- Dependencies: 20260304110100_create_audit_exports_table.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Main audit export function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_audit_export(
    p_export_name text,
    p_description text,
    p_scope jsonb,
    p_format audit_export_format DEFAULT 'pdf',
    p_retention_days integer DEFAULT 90
)
RETURNS TABLE (
    export_id uuid,
    status text,
    message text,
    estimated_records bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_export_id uuid;
    v_user_id uuid := auth.uid();
    v_user_role app_role;
    v_estimated_records bigint;
    v_retention_until timestamptz;
    v_scope_type text;
BEGIN
    -- Verify user has permission to export
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = v_user_id
    AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin', 'regional_hr')
    ORDER BY 
        CASE role
            WHEN 'corporate_admin' THEN 1
            WHEN 'compliance_officer' THEN 2
            WHEN 'regional_admin' THEN 3
            WHEN 'regional_hr' THEN 4
        END
    LIMIT 1;
    
    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT 
            null::uuid,
            'error'::text,
            'Insufficient permissions to create audit export'::text,
            0::bigint;
        RETURN;
    END IF;

    -- Validate scope
    v_scope_type := p_scope->>'type';
    IF v_scope_type IS NULL THEN
        RETURN QUERY SELECT 
            null::uuid,
            'error'::text,
            'Export scope type is required'::text,
            0::bigint;
        RETURN;
    END IF;

    -- Calculate retention date
    v_retention_until := now() + (p_retention_days || ' days')::interval;

    -- Validate property access for non-admin roles
    IF v_user_role NOT IN ('corporate_admin', 'compliance_officer') THEN
        IF p_scope ? 'property_ids' THEN
            IF EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(p_scope->'property_ids') AS requested_id
                WHERE requested_id::uuid NOT IN (
                    SELECT property_id FROM get_user_accessible_properties_for_audit()
                )
            ) THEN
                RETURN QUERY SELECT 
                    null::uuid,
                    'error'::text,
                    'Access denied to one or more requested properties'::text,
                    0::bigint;
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Estimate record count
    SELECT COUNT(*) INTO v_estimated_records
    FROM audit_logs al
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
        (p_scope->'actions' IS NULL OR al.action = ANY(ARRAY(
            SELECT jsonb_array_elements_text(p_scope->'actions')
        )))
    )
    AND (
        -- Property filter (for scoped roles)
        v_user_role IN ('corporate_admin', 'compliance_officer')
        OR EXISTS (
            SELECT 1
            FROM get_user_accessible_properties_for_audit() ap
            WHERE ap.property_id::text = COALESCE(al.details->>'property_id', '')
        )
    );

    -- Create export record
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
        v_user_id,
        p_export_name,
        p_description,
        p_scope,
        p_format,
        'pending',
        v_retention_until,
        v_estimated_records
    )
    RETURNING id INTO v_export_id;

    -- Return export ID and status
    RETURN QUERY SELECT 
        v_export_id,
        'pending'::text,
        'Audit export queued successfully'::text,
        v_estimated_records;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 2: Function to mark export as completed with file info
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_audit_export(
    p_export_id uuid,
    p_storage_path text,
    p_file_size_bytes bigint,
    p_file_name text,
    p_sha256_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_export record;
    v_processing_duration integer;
BEGIN
    -- Get export record
    SELECT * INTO v_export
    FROM audit_exports
    WHERE id = p_export_id;
    
    IF v_export IS NULL THEN
        RAISE EXCEPTION 'Export not found';
    END IF;
    
    -- Verify requesting user matches or is admin
    IF v_export.requested_by != auth.uid() THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        ) THEN
            RAISE EXCEPTION 'Access denied';
        END IF;
    END IF;
    
    -- Calculate processing duration
    v_processing_duration := EXTRACT(EPOCH FROM (now() - v_export.processing_started_at)) * 1000;
    
    -- Update export record
    UPDATE audit_exports
    SET 
        status = 'completed',
        storage_path = p_storage_path,
        file_size_bytes = p_file_size_bytes,
        file_name = p_file_name,
        sha256_hash = p_sha256_hash,
        processing_completed_at = now(),
        processing_duration_ms = v_processing_duration,
        updated_at = now()
    WHERE id = p_export_id;
    
    -- Log the completion
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        details
    ) VALUES (
        'audit_export',
        p_export_id,
        'create',
        auth.uid(),
        jsonb_build_object(
            'event', 'export_completed',
            'file_size', p_file_size_bytes,
            'record_count', v_export.record_count
        )
    );
    
    RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 3: Function to record download
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_audit_export_download(
    p_export_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_export record;
BEGIN
    -- Get export record
    SELECT * INTO v_export
    FROM audit_exports
    WHERE id = p_export_id;
    
    IF v_export IS NULL THEN
        RAISE EXCEPTION 'Export not found';
    END IF;
    
    -- Check permissions
    IF v_export.requested_by != auth.uid() THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        ) THEN
            RAISE EXCEPTION 'Access denied';
        END IF;
    END IF;
    
    -- Update download tracking
    UPDATE audit_exports
    SET 
        download_count = download_count + 1,
        last_downloaded_at = now(),
        last_downloaded_by = auth.uid(),
        status = 'downloaded',
        updated_at = now()
    WHERE id = p_export_id;
    
    -- Log the download
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        details
    ) VALUES (
        'audit_export',
        p_export_id,
        'view',
        auth.uid(),
        jsonb_build_object(
            'event', 'export_downloaded',
            'download_count', v_export.download_count + 1
        )
    );
    
    RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Function to list user's audit exports
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION list_audit_exports(
    p_status audit_export_status DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    export_name text,
    description text,
    format audit_export_format,
    status audit_export_status,
    record_count integer,
    file_size_bytes bigint,
    created_at timestamptz,
    retention_until timestamptz,
    download_count integer,
    integrity_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Check if user has admin/compliance access
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) INTO v_is_admin;
    
    RETURN QUERY
    SELECT 
        ae.id,
        ae.export_name,
        ae.description,
        ae.format,
        ae.status,
        ae.record_count,
        ae.file_size_bytes,
        ae.created_at,
        ae.retention_until,
        ae.download_count,
        ae.integrity_verified
    FROM audit_exports ae
    WHERE (
        -- Own exports OR admin access
        ae.requested_by = auth.uid() OR v_is_admin
    )
    AND (
        -- Status filter if provided
        p_status IS NULL OR ae.status = p_status
    )
    ORDER BY ae.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Function to get export details
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_export_details(
    p_export_id uuid
)
RETURNS TABLE (
    id uuid,
    export_name text,
    description text,
    export_scope jsonb,
    format audit_export_format,
    status audit_export_status,
    storage_path text,
    file_name text,
    file_size_bytes bigint,
    sha256_hash text,
    integrity_verified boolean,
    verified_at timestamptz,
    record_count integer,
    download_count integer,
    last_downloaded_at timestamptz,
    created_at timestamptz,
    retention_until timestamptz,
    requested_by uuid,
    requested_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Check if user has admin/compliance access
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) INTO v_is_admin;
    
    RETURN QUERY
    SELECT 
        ae.id,
        ae.export_name,
        ae.description,
        ae.export_scope,
        ae.format,
        ae.status,
        ae.storage_path,
        ae.file_name,
        ae.file_size_bytes,
        ae.sha256_hash,
        ae.integrity_verified,
        ae.verified_at,
        ae.record_count,
        ae.download_count,
        ae.last_downloaded_at,
        ae.created_at,
        ae.retention_until,
        ae.requested_by,
        p.full_name as requested_by_name
    FROM audit_exports ae
    LEFT JOIN profiles p ON p.id = ae.requested_by
    WHERE ae.id = p_export_id
    AND (
        ae.requested_by = auth.uid() OR v_is_admin
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION create_audit_export IS 'Creates a new audit export request with proper permission validation';

COMMENT ON FUNCTION complete_audit_export IS 'Marks an audit export as completed with file metadata and hash';

COMMENT ON FUNCTION record_audit_export_download IS 'Records a download event for audit trail';

COMMENT ON FUNCTION list_audit_exports IS 'Lists audit exports accessible to the current user';

COMMENT ON FUNCTION get_audit_export_details IS 'Gets detailed information about a specific audit export';
