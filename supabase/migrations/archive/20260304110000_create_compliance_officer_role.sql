-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 1.1 - Create Compliance Officer Role
-- Description: Adds compliance_officer role for audit export capabilities
-- Risk Level: LOW (additive change, no existing data modification)
-- Dependencies: None
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create compliance officer permissions mapping
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL DEFAULT 'compliance_officer',
    permission_key text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(role, permission_key)
);

-- Insert compliance officer permissions
INSERT INTO compliance_role_permissions (role, permission_key, description) VALUES
    ('compliance_officer', 'audit.export', 'Export audit logs in various formats'),
    ('compliance_officer', 'audit.view', 'View audit log summaries and dashboards'),
    ('compliance_officer', 'audit.verify', 'Verify integrity of audit exports'),
    ('compliance_officer', 'pii.view', 'View PII access logs (read-only)'),
    ('compliance_officer', 'compliance.dashboard', 'Access compliance dashboard'),
    ('compliance_officer', 'compliance.report', 'Generate compliance reports')
ON CONFLICT (role, permission_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- STEP 2: Enable RLS on compliance permissions
-- -----------------------------------------------------------------------------
ALTER TABLE compliance_role_permissions ENABLE ROW LEVEL SECURITY;

-- Only corporate_admin and compliance_officer can view permissions
CREATE POLICY "Compliance permissions viewable by authorized roles"
    ON compliance_role_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
    );

-- Only corporate_admin can manage permissions
CREATE POLICY "Compliance permissions manageable by corporate_admin only"
    ON compliance_role_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 3: Add documentation comment
-- -----------------------------------------------------------------------------
COMMENT ON TYPE app_role IS 'Application roles hierarchy: corporate_admin(1), regional_admin(2), regional_hr(3), property_manager(4), property_hr(5), department_head(6), manager(7), staff(8), compliance_officer(special - audit read-only)';

COMMENT ON TABLE compliance_role_permissions IS 'Defines granular permissions for compliance and audit roles. Used by frontend permission system.';
