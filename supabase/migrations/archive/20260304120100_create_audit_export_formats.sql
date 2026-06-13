-- =============================================================================
-- FORGE X: Enterprise Audit & Compliance Export System
-- Migration: Phase 2.2 - Create Audit Export Formats
-- Description: Templates and functions for different export format generation
-- Risk Level: LOW (helper functions for export generation)
-- Dependencies: 20260304110400_create_audit_export_rpc.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create export template configuration table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_export_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text NOT NULL UNIQUE,
    description text,
    format audit_export_format NOT NULL,
    
    -- Template configuration
    header_config jsonb DEFAULT '{}'::jsonb,
    -- Example: {"company_name": "PHG Hotels", "logo_url": "...", "report_title": "Audit Trail Report"}
    
    column_config jsonb NOT NULL,
    -- Example: [{"field": "created_at", "header": "Date/Time", "format": "datetime"}, ...]
    
    filter_config jsonb DEFAULT '{}'::jsonb,
    -- Default filters for this template
    
    -- Template scope
    entity_types text[] DEFAULT '{}',
    required_role app_role DEFAULT 'compliance_officer',
    
    -- Status
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,  -- System templates can't be deleted
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_export_templates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active templates
CREATE POLICY "Active templates viewable by all authenticated users"
    ON audit_export_templates FOR SELECT
    USING (is_active = true);

-- Policy: Only admin/compliance can manage templates
CREATE POLICY "Templates manageable by admin/compliance roles"
    ON audit_export_templates FOR ALL
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
-- STEP 2: Insert default system templates
-- -----------------------------------------------------------------------------
INSERT INTO audit_export_templates (
    template_name,
    description,
    format,
    header_config,
    column_config,
    entity_types,
    required_role,
    is_system
) VALUES 
-- PDF Compliance Report Template
(
    'SOX_Compliance_Report',
    'Standard SOX compliance audit report with tamper-evident signature',
    'pdf',
    '{
        "company_name": "PHG Hotels Group",
        "report_title": "SOX Compliance Audit Report",
        "classification": "CONFIDENTIAL",
        "include_signature": true,
        "include_watermark": true
    }'::jsonb,
    '[
        {"field": "created_at", "header": "Date/Time", "format": "datetime", "width": 20},
        {"field": "user_name", "header": "User", "format": "text", "width": 25},
        {"field": "user_email", "header": "Email", "format": "text", "width": 30},
        {"field": "entity_type", "header": "Entity Type", "format": "text", "width": 20},
        {"field": "action", "header": "Action", "format": "text", "width": 15},
        {"field": "details", "header": "Details", "format": "json", "width": 40}
    ]'::jsonb,
    ARRAY['profiles', 'documents', 'payslips'],
    'compliance_officer',
    true
),

-- Excel Detailed Export Template
(
    'Detailed_Audit_Export',
    'Comprehensive Excel export with filtering and pivot support',
    'excel',
    '{
        "sheet_name": "Audit Data",
        "include_pivot": true,
        "freeze_header": true,
        "auto_filter": true
    }'::jsonb,
    '[
        {"field": "log_id", "header": "Log ID", "format": "uuid"},
        {"field": "created_at", "header": "Timestamp", "format": "datetime"},
        {"field": "entity_type", "header": "Entity", "format": "text"},
        {"field": "entity_id", "header": "Entity ID", "format": "uuid"},
        {"field": "action", "header": "Action", "format": "text"},
        {"field": "user_id", "header": "User ID", "format": "uuid"},
        {"field": "user_name", "header": "User Name", "format": "text"},
        {"field": "user_email", "header": "Email", "format": "text"},
        {"field": "ip_address", "header": "IP Address", "format": "text"},
        {"field": "property_id", "header": "Property", "format": "uuid"},
        {"field": "details", "header": "Details", "format": "json"}
    ]'::jsonb,
    ARRAY['profiles', 'documents', 'training', 'tasks', 'maintenance', 'announcements'],
    'compliance_officer',
    true
),

-- CSV Simple Export Template
(
    'Simple_CSV_Export',
    'Lightweight CSV for import into external tools',
    'csv',
    '{
        "delimiter": ",",
        "include_bom": true,
        "quote_strings": true
    }'::jsonb,
    '[
        {"field": "created_at", "header": "timestamp", "format": "iso_datetime"},
        {"field": "user_email", "header": "user", "format": "text"},
        {"field": "entity_type", "header": "entity", "format": "text"},
        {"field": "action", "header": "action", "format": "text"}
    ]'::jsonb,
    ARRAY['profiles', 'documents', 'tasks'],
    'regional_admin',
    true
),

-- JSON Machine-Readable Template
(
    'SIEM_Integration_Export',
    'Structured JSON for SIEM integration (Splunk, Elastic, etc.)',
    'json',
    '{
        "structure": "array",
        "include_metadata": true,
        "flatten_details": false
    }'::jsonb,
    '[
        {"field": "log_id", "header": "event_id", "format": "uuid"},
        {"field": "created_at", "header": "@timestamp", "format": "iso_datetime"},
        {"field": "entity_type", "header": "entity_type", "format": "text"},
        {"field": "action", "header": "event_action", "format": "text"},
        {"field": "user_id", "header": "actor_id", "format": "uuid"},
        {"field": "user_email", "header": "actor_email", "format": "text"},
        {"field": "ip_address", "header": "source_ip", "format": "text"},
        {"field": "details", "header": "event_data", "format": "json_object"}
    ]'::jsonb,
    ARRAY['profiles', 'documents', 'training', 'tasks', 'maintenance', 'announcements', 'messaging'],
    'compliance_officer',
    true
),

-- GDPR Data Subject Access Request Template
(
    'GDPR_DSAR_Report',
    'GDPR-compliant data subject access request report',
    'pdf',
    '{
        "company_name": "PHG Hotels Group",
        "report_title": "Data Subject Access Request",
        "legal_notice": "This report contains personal data subject to GDPR protection.",
        "include_toc": true,
        "include_index": true
    }'::jsonb,
    '[
        {"field": "section", "header": "Section", "format": "text"},
        {"field": "data_category", "header": "Data Category", "format": "text"},
        {"field": "data_content", "header": "Data Content", "format": "text"},
        {"field": "purpose", "header": "Processing Purpose", "format": "text"},
        {"field": "retention", "header": "Retention Period", "format": "text"},
        {"field": "third_parties", "header": "Third Party Recipients", "format": "text"}
    ]'::jsonb,
    ARRAY['profiles', 'payslips', 'performance_reviews', 'goals'],
    'compliance_officer',
    true
)
ON CONFLICT (template_name) DO UPDATE SET
    description = EXCLUDED.description,
    column_config = EXCLUDED.column_config,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- STEP 3: Create function to get export template
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_export_template(
    p_template_name text
)
RETURNS TABLE (
    template_id uuid,
    template_name text,
    description text,
    format audit_export_format,
    header_config jsonb,
    column_config jsonb,
    filter_config jsonb,
    entity_types text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user has permission
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin', 'regional_hr')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT 
        et.id as template_id,
        et.template_name,
        et.description,
        et.format,
        et.header_config,
        et.column_config,
        et.filter_config,
        et.entity_types
    FROM audit_export_templates et
    WHERE et.template_name = p_template_name
    AND et.is_active = true;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 4: Create function to list available templates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION list_audit_export_templates(
    p_format audit_export_format DEFAULT NULL
)
RETURNS TABLE (
    template_name text,
    description text,
    format audit_export_format,
    entity_types text[],
    required_role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.template_name,
        et.description,
        et.format,
        et.entity_types,
        et.required_role
    FROM audit_export_templates et
    WHERE et.is_active = true
    AND (p_format IS NULL OR et.format = p_format)
    ORDER BY et.template_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Create function to validate export format
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_export_format(
    p_format audit_export_format,
    p_scope jsonb
)
RETURNS TABLE (
    is_valid boolean,
    message text,
    max_records bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estimated_records bigint;
    v_max_records bigint;
BEGIN
    -- Estimate records
    SELECT COUNT(*) INTO v_estimated_records
    FROM audit_logs al
    WHERE (
        (p_scope->>'date_from' IS NULL OR al.created_at >= (p_scope->>'date_from')::timestamptz)
        AND (p_scope->>'date_to' IS NULL OR al.created_at <= (p_scope->>'date_to')::timestamptz)
    );
    
    -- Format-specific limits
    v_max_records := CASE p_format
        WHEN 'pdf' THEN 10000
        WHEN 'excel' THEN 50000
        WHEN 'csv' THEN 100000
        WHEN 'json' THEN 50000
        ELSE 10000
    END;
    
    IF v_estimated_records > v_max_records THEN
        RETURN QUERY SELECT 
            false,
            format('Export would contain %s records, but %s format supports maximum %s records', 
                   v_estimated_records, p_format, v_max_records),
            v_max_records::bigint;
    ELSE
        RETURN QUERY SELECT 
            true,
            format('Export format valid. Estimated %s records.', v_estimated_records),
            v_max_records::bigint;
    END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 6: Add comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE audit_export_templates IS 'Configuration templates for different audit export formats (PDF, Excel, CSV, JSON)';

COMMENT ON FUNCTION get_audit_export_template IS 'Retrieves a specific export template configuration';

COMMENT ON FUNCTION list_audit_export_templates IS 'Lists all available export templates';

COMMENT ON FUNCTION validate_export_format IS 'Validates if export scope is compatible with selected format';
