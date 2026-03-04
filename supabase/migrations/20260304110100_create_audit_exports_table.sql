-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 1.2 - Create Audit Exports Table
-- Description: Tracks all audit log exports with cryptographic integrity
-- Risk Level: MEDIUM (new table with sensitive data tracking)
-- Dependencies: 20260304110000_create_compliance_officer_role.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create audit export status enum
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_export_status') THEN
        CREATE TYPE audit_export_status AS ENUM (
            'pending',
            'generating',
            'completed',
            'failed',
            'expired',
            'downloaded'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 2: Create audit export format enum
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_export_format') THEN
        CREATE TYPE audit_export_format AS ENUM (
            'pdf',
            'excel',
            'csv',
            'json'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 3: Create audit exports table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_exports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Export metadata
    requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    export_name text NOT NULL,
    description text,
    
    -- Export scope
    export_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Example scope structure:
    -- {
    --   "type": "property|user|date_range|full",
    --   "property_ids": ["uuid1", "uuid2"],
    --   "user_ids": ["uuid1"],
    --   "date_from": "2026-01-01",
    --   "date_to": "2026-03-01",
    --   "entity_types": ["profiles", "documents", "training"],
    --   "actions": ["create", "update", "delete"]
    -- }
    
    -- Export format and status
    format audit_export_format NOT NULL DEFAULT 'pdf',
    status audit_export_status NOT NULL DEFAULT 'pending',
    
    -- File information
    storage_path text,
    file_size_bytes bigint,
    file_name text,
    
    -- Cryptographic integrity
    sha256_hash text,
    integrity_verified boolean DEFAULT false,
    verified_at timestamptz,
    verified_by uuid REFERENCES auth.users(id),
    
    -- Retention and access tracking
    retention_until timestamptz NOT NULL,
    download_count integer DEFAULT 0,
    last_downloaded_at timestamptz,
    last_downloaded_by uuid REFERENCES auth.users(id),
    
    -- Processing metadata
    record_count integer,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    processing_duration_ms integer,
    error_message text,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_retention CHECK (retention_until > created_at),
    CONSTRAINT valid_file_size CHECK (file_size_bytes >= 0 OR file_size_bytes IS NULL),
    CONSTRAINT valid_record_count CHECK (record_count >= 0 OR record_count IS NULL)
);

-- -----------------------------------------------------------------------------
-- STEP 4: Create indexes for performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_exports_requested_by 
    ON audit_exports(requested_by);

CREATE INDEX IF NOT EXISTS idx_audit_exports_status 
    ON audit_exports(status);

CREATE INDEX IF NOT EXISTS idx_audit_exports_created_at 
    ON audit_exports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_exports_retention 
    ON audit_exports(retention_until);

-- GIN index for JSONB scope queries
CREATE INDEX IF NOT EXISTS idx_audit_exports_scope 
    ON audit_exports USING GIN(export_scope);

-- -----------------------------------------------------------------------------
-- STEP 5: Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own exports
CREATE POLICY "Users can view own audit exports"
    ON audit_exports FOR SELECT
    USING (requested_by = auth.uid());

-- Policy: Corporate admin and compliance officer can view all exports
CREATE POLICY "Compliance roles can view all audit exports"
    ON audit_exports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin')
        )
    );

-- Policy: Users can create their own exports
CREATE POLICY "Users can create own audit exports"
    ON audit_exports FOR INSERT
    WITH CHECK (requested_by = auth.uid());

-- Policy: Only system can update exports (via RPC)
CREATE POLICY "Only system can update audit exports"
    ON audit_exports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
        OR requested_by = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
        OR requested_by = auth.uid()
    );

-- Policy: Soft delete only (update status to expired)
CREATE POLICY "Only corporate_admin can hard delete audit exports"
    ON audit_exports FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 6: Create updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_audit_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_audit_exports_updated_at ON audit_exports;
CREATE TRIGGER tr_update_audit_exports_updated_at
    BEFORE UPDATE ON audit_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_exports_updated_at();

-- -----------------------------------------------------------------------------
-- STEP 7: Add table comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE audit_exports IS 'Tracks all audit log exports with cryptographic integrity verification. Supports compliance reporting and external audit requirements.';

COMMENT ON COLUMN audit_exports.sha256_hash IS 'SHA-256 hash of the exported file for integrity verification';

COMMENT ON COLUMN audit_exports.export_scope IS 'JSON defining the scope of the export: properties, date range, entity types, actions';

COMMENT ON COLUMN audit_exports.retention_until IS 'Automatic deletion date for the export file (GDPR/compliance retention policy)';
