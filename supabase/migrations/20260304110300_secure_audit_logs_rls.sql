-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 1.4 - Secure Audit Logs RLS
-- Description: Row-level security policies for audit data access control
-- Risk Level: HIGH (modifies access to sensitive audit data)
-- Dependencies: 20260304110000_create_compliance_officer_role.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Ensure RLS is enabled on audit_logs table
-- -----------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that may conflict
DROP POLICY IF EXISTS "Audit logs viewable by corporate_admin" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs viewable by authorized roles" ON audit_logs;

-- -----------------------------------------------------------------------------
-- STEP 2: Create comprehensive audit_logs policies
-- -----------------------------------------------------------------------------

-- Policy 1: Compliance officer - can view all audit logs (read-only)
CREATE POLICY "Compliance officer can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'compliance_officer'
        )
    );

-- Policy 2: Corporate admin - full access to all audit logs
CREATE POLICY "Corporate admin full access to audit logs"
    ON audit_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    );

-- Policy 3: Regional admin - property-scoped audit logs
CREATE POLICY "Regional admin property-scoped audit access"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN user_properties up ON up.user_id = ur.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'regional_admin'
            AND up.property_id::text = COALESCE(audit_logs.details->>'property_id', '')
        )
        OR
        -- Also allow if they're the actor in the audit log
        audit_logs.user_id = auth.uid()
    );

-- Policy 4: Users can view audit logs where they are the subject
CREATE POLICY "Users can view own audit trail"
    ON audit_logs FOR SELECT
    USING (
        audit_logs.user_id = auth.uid()
        OR
        audit_logs.entity_id = auth.uid()
    );

-- Policy 5: Property managers - property-scoped access
CREATE POLICY "Property manager property-scoped audit access"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN user_properties up ON up.user_id = ur.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'property_manager'
            AND up.property_id::text = COALESCE(audit_logs.details->>'property_id', '')
        )
    );

-- No INSERT/UPDATE/DELETE for non-admin roles - audit logs are immutable

-- -----------------------------------------------------------------------------
-- STEP 3: Secure pii_access_logs table
-- -----------------------------------------------------------------------------
ALTER TABLE pii_access_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "PII logs viewable by corporate_admin" ON pii_access_logs;
DROP POLICY IF EXISTS "PII logs viewable by authorized roles" ON pii_access_logs;

-- Policy: Compliance officer can view all PII access logs
CREATE POLICY "Compliance officer can view PII logs"
    ON pii_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'compliance_officer'
        )
    );

-- Policy: Corporate admin full access
CREATE POLICY "Corporate admin full PII log access"
    ON pii_access_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'corporate_admin'
        )
    );

-- Policy: Regional HR can view PII access in their region
CREATE POLICY "Regional HR property-scoped PII access"
    ON pii_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN user_properties hr_up ON hr_up.user_id = ur.user_id
            JOIN user_properties target_up ON target_up.user_id = pii_access_logs.user_id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'regional_hr'
            AND hr_up.property_id = target_up.property_id
        )
    );

-- Policy: Users can see when their own PII was accessed
CREATE POLICY "Users can view PII access on own records"
    ON pii_access_logs FOR SELECT
    USING (
        pii_access_logs.user_id = auth.uid()
        OR
        pii_access_logs.accessed_by = auth.uid()
    );

-- -----------------------------------------------------------------------------
-- STEP 4: Create secure audit log access function with role checking
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_access_audit_logs(
    p_target_user_id uuid DEFAULT NULL,
    p_property_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role app_role;
    v_has_access boolean := false;
BEGIN
    -- Get user's primary role
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY 
        CASE role
            WHEN 'corporate_admin' THEN 1
            WHEN 'compliance_officer' THEN 2
            WHEN 'regional_admin' THEN 3
            WHEN 'regional_hr' THEN 4
            WHEN 'property_manager' THEN 5
            ELSE 99
        END
    LIMIT 1;
    
    -- Full access roles
    IF v_user_role IN ('corporate_admin', 'compliance_officer') THEN
        RETURN true;
    END IF;
    
    -- Self access
    IF p_target_user_id = auth.uid() THEN
        RETURN true;
    END IF;
    
    -- Property-scoped access
    IF p_property_id IS NOT NULL AND v_user_role IN ('regional_admin', 'regional_hr', 'property_manager') THEN
        SELECT EXISTS (
            SELECT 1 FROM user_properties
            WHERE user_id = auth.uid()
            AND property_id = p_property_id
        ) INTO v_has_access;
        
        RETURN v_has_access;
    END IF;
    
    RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create function to get accessible property IDs for audit
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_accessible_properties_for_audit()
RETURNS TABLE (property_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role app_role;
BEGIN
    -- Get user's primary role
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY 
        CASE role
            WHEN 'corporate_admin' THEN 1
            WHEN 'compliance_officer' THEN 2
            WHEN 'regional_admin' THEN 3
            WHEN 'regional_hr' THEN 4
            ELSE 99
        END
    LIMIT 1;
    
    -- Full access - return all properties
    IF v_user_role IN ('corporate_admin', 'compliance_officer') THEN
        RETURN QUERY SELECT p.id FROM properties p WHERE p.is_active = true;
        RETURN;
    END IF;
    
    -- Scoped access - return assigned properties
    RETURN QUERY
    SELECT up.property_id
    FROM user_properties up
    JOIN properties p ON p.id = up.property_id
    WHERE up.user_id = auth.uid()
    AND p.is_active = true;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION can_access_audit_logs IS 'Checks if current user can access audit logs for specified user/property';

COMMENT ON FUNCTION get_user_accessible_properties_for_audit IS 'Returns list of property IDs the current user can access audit data for';
