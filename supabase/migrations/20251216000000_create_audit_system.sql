-- Migration: Create Audit Log System
-- Description: Centralized audit logging for compliance and history tracking

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view all, Users can view their own changes (optional, maybe unrestricted for admins only?)
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr')
        )
    );

-- Trigger Function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    old_row JSONB := NULL;
    new_row JSONB := NULL;
    op TEXT := TG_OP;
BEGIN
    IF TG_OP = 'INSERT' THEN
        new_row = to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_row = to_jsonb(OLD);
        new_row = to_jsonb(NEW);
        
        -- Detect Soft Delete
        IF (OLD ? 'is_deleted') AND (NEW ? 'is_deleted') AND (OLD->>'is_deleted' = 'false') AND (NEW->>'is_deleted' = 'true') THEN
            op = 'SOFT_DELETE';
        END IF;
        
         -- Detect Restore
        IF (OLD ? 'is_deleted') AND (NEW ? 'is_deleted') AND (OLD->>'is_deleted' = 'true') AND (NEW->>'is_deleted' = 'false') THEN
            op = 'RESTORE';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        old_row = to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        op,
        old_row,
        new_row,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
