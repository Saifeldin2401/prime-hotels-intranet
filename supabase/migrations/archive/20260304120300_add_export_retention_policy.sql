-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 2.4 - Add Export Retention Policy
-- Description: Automatic cleanup of expired audit exports with soft-delete
-- Risk Level: MEDIUM (automated deletion with safety checks)
-- Dependencies: 20260304110100_create_audit_exports_table.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create function for soft-deleting expired exports
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION soft_delete_expired_audit_exports()
RETURNS TABLE (
    deleted_count integer,
    deleted_ids uuid[],
    total_size_freed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_ids uuid[];
    v_deleted_count integer;
    v_size_freed bigint;
BEGIN
    -- Find expired exports that haven't been soft-deleted yet
    SELECT 
        array_agg(id),
        count(*),
        COALESCE(sum(file_size_bytes), 0)
    INTO v_deleted_ids, v_deleted_count, v_size_freed
    FROM audit_exports
    WHERE retention_until < now()
    AND status <> 'expired'
    AND storage_path IS NOT NULL;
    
    -- Update status to expired
    UPDATE audit_exports
    SET 
        status = 'expired',
        updated_at = now()
    WHERE id = ANY(v_deleted_ids);
    
    -- Log the cleanup
    IF v_deleted_count > 0 THEN
        INSERT INTO audit_logs (
            entity_type,
            entity_id,
            action,
            user_id,
            details
        ) VALUES (
            'audit_export_cleanup',
            null,
            'delete',
            auth.uid(),
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'total_size_freed_bytes', v_size_freed,
                'deleted_ids', v_deleted_ids
            )
        );
    END IF;
    
    RETURN QUERY SELECT 
        COALESCE(v_deleted_count, 0),
        COALESCE(v_deleted_ids, '{}'::uuid[]),
        COALESCE(v_size_freed, 0)::bigint;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 2: Create function for hard deletion (after grace period)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_expired_audit_exports(
    p_grace_period_days integer DEFAULT 7
)
RETURNS TABLE (
    purged_count integer,
    purged_ids uuid[],
    total_size_freed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purged_ids uuid[];
    v_purged_count integer;
    v_size_freed bigint;
    v_cutoff_date timestamptz;
BEGIN
    -- System jobs (cron) run without JWT context; allow that path.
    -- Only corporate_admin can purge
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'corporate_admin'
    ) THEN
        RAISE EXCEPTION 'Only corporate_admin can purge expired exports';
    END IF;
    
    -- Calculate cutoff date (expired before this date can be purged)
    v_cutoff_date := now() - (p_grace_period_days || ' days')::interval;
    
    -- Find exports to purge
    SELECT 
        array_agg(id),
        count(*),
        COALESCE(sum(file_size_bytes), 0)
    INTO v_purged_ids, v_purged_count, v_size_freed
    FROM audit_exports
    WHERE status = 'expired'
    AND retention_until < v_cutoff_date;
    
    -- Delete the records (hard delete)
    DELETE FROM audit_exports
    WHERE id = ANY(v_purged_ids);
    
    -- Log the purge
    IF v_purged_count > 0 THEN
        INSERT INTO audit_logs (
            entity_type,
            entity_id,
            action,
            user_id,
            details
        ) VALUES (
            'audit_export_purge',
            null,
            'delete',
            auth.uid(),
            jsonb_build_object(
                'purged_count', v_purged_count,
                'total_size_freed_bytes', v_size_freed,
                'grace_period_days', p_grace_period_days,
                'purged_ids', v_purged_ids
            )
        );
    END IF;
    
    RETURN QUERY SELECT 
        COALESCE(v_purged_count, 0),
        COALESCE(v_purged_ids, '{}'::uuid[]),
        COALESCE(v_size_freed, 0)::bigint;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 3: Create retention policy configuration table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_export_retention_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name text NOT NULL UNIQUE,
    description text,
    
    -- Retention rules
    default_retention_days integer NOT NULL DEFAULT 90,
    max_retention_days integer NOT NULL DEFAULT 365,
    min_retention_days integer NOT NULL DEFAULT 30,
    
    -- Format-specific retention
    pdf_retention_days integer,
    excel_retention_days integer,
    csv_retention_days integer,
    json_retention_days integer,
    
    -- Automatic cleanup settings
    auto_soft_delete boolean DEFAULT true,
    auto_purge_after_days integer DEFAULT 7,  -- Days after soft-delete to hard delete
    
    -- Role-specific overrides
    corporate_admin_retention_days integer,
    compliance_officer_retention_days integer,
    
    -- Status
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE audit_export_retention_policies ENABLE ROW LEVEL SECURITY;

-- Policy: Viewable by all authenticated
CREATE POLICY "Retention policies viewable by authenticated users"
    ON audit_export_retention_policies FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Policy: Manageable by admin only
CREATE POLICY "Retention policies manageable by corporate_admin"
    ON audit_export_retention_policies FOR ALL
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

-- Insert default policy
INSERT INTO audit_export_retention_policies (
    policy_name,
    description,
    default_retention_days,
    max_retention_days,
    min_retention_days,
    pdf_retention_days,
    excel_retention_days,
    csv_retention_days,
    json_retention_days,
    auto_soft_delete,
    auto_purge_after_days,
    corporate_admin_retention_days,
    compliance_officer_retention_days,
    is_default
) VALUES (
    'Default_SOX_Compliance_Policy',
    'Default retention policy for SOX compliance - 90 days standard, 1 year max',
    90,   -- default_retention_days
    365,  -- max_retention_days
    30,   -- min_retention_days
    180,  -- pdf_retention_days (longer for signed reports)
    90,   -- excel_retention_days
    30,   -- csv_retention_days (shorter for raw data)
    90,   -- json_retention_days
    true, -- auto_soft_delete
    7,    -- auto_purge_after_days
    365,  -- corporate_admin_retention_days
    180,  -- compliance_officer_retention_days
    true  -- is_default
)
ON CONFLICT (policy_name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- STEP 4: Create function to calculate retention date based on policy
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_retention_date(
    p_format audit_export_format,
    p_requested_by uuid,
    p_custom_days integer DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy record;
    v_user_role app_role;
    v_retention_days integer;
BEGIN
    -- Get default policy
    SELECT * INTO v_policy
    FROM audit_export_retention_policies
    WHERE is_default = true
    AND is_active = true
    LIMIT 1;
    
    IF v_policy IS NULL THEN
        -- Fallback to hardcoded defaults
        v_retention_days := 90;
    ELSE
        -- Get user's role
        SELECT role INTO v_user_role
        FROM user_roles
        WHERE user_id = p_requested_by
        ORDER BY 
            CASE role
                WHEN 'corporate_admin' THEN 1
                WHEN 'compliance_officer' THEN 2
                ELSE 99
            END
        LIMIT 1;
        
        -- Determine retention days based on role and format
        v_retention_days := CASE v_user_role
            WHEN 'corporate_admin' THEN COALESCE(v_policy.corporate_admin_retention_days, v_policy.default_retention_days)
            WHEN 'compliance_officer' THEN COALESCE(v_policy.compliance_officer_retention_days, v_policy.default_retention_days)
            ELSE v_policy.default_retention_days
        END;
        
        -- Apply format-specific overrides
        v_retention_days := CASE p_format
            WHEN 'pdf' THEN COALESCE(v_policy.pdf_retention_days, v_retention_days)
            WHEN 'excel' THEN COALESCE(v_policy.excel_retention_days, v_retention_days)
            WHEN 'csv' THEN COALESCE(v_policy.csv_retention_days, v_retention_days)
            WHEN 'json' THEN COALESCE(v_policy.json_retention_days, v_retention_days)
            ELSE v_retention_days
        END;
        
        -- Apply custom days if provided (within bounds)
        IF p_custom_days IS NOT NULL THEN
            v_retention_days := GREATEST(
                v_policy.min_retention_days,
                LEAST(v_policy.max_retention_days, p_custom_days)
            );
        END IF;
    END IF;
    
    RETURN now() + (v_retention_days || ' days')::interval;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create cron job for automatic cleanup
-- -----------------------------------------------------------------------------
-- Soft delete expired exports daily at 2 AM
SELECT cron.schedule(
    'audit-export-soft-delete',
    '0 2 * * *',
    'SELECT soft_delete_expired_audit_exports()'
);

-- Purge expired exports weekly on Sundays at 3 AM
SELECT cron.schedule(
    'audit-export-purge',
    '0 3 * * 0',
    'SELECT purge_expired_audit_exports(7)'
);

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION soft_delete_expired_audit_exports IS 'Soft-deletes audit exports that have passed their retention period';

COMMENT ON FUNCTION purge_expired_audit_exports IS 'Hard-deletes soft-deleted exports after grace period (admin only)';

COMMENT ON FUNCTION calculate_retention_date IS 'Calculates retention expiration date based on policy, role, and format';

COMMENT ON TABLE audit_export_retention_policies IS 'Configurable retention policies for audit exports with role-based and format-specific rules';
