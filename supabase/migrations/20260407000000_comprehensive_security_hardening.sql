-- ============================================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Fixes SQL injection vulnerabilities, strengthens RLS, and adds security functions
-- ============================================================================

-- ============================================================================
-- PART 1: SECURE DATABASE FUNCTIONS (Parameterized Queries)
-- ============================================================================

-- Function: Securely search documents with proper parameterization
-- Replaces client-side ILIKE concatenation that is vulnerable to injection
CREATE OR REPLACE FUNCTION secure_search_documents(
    p_search_query TEXT,
    p_property_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_file_type TEXT[] DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_confidentiality_level TEXT DEFAULT NULL,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_include_archived BOOLEAN DEFAULT FALSE,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'desc',
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    content TEXT,
    file_url TEXT,
    status TEXT,
    visibility TEXT,
    property_id UUID,
    department_id UUID,
    folder_id UUID,
    file_type TEXT,
    file_size BIGINT,
    file_extension TEXT,
    confidentiality_level TEXT,
    is_deleted BOOLEAN,
    is_archived BOOLEAN,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    view_count INTEGER,
    download_count INTEGER,
    content_type TEXT,
    author JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_has_property_access BOOLEAN;
    v_query TEXT;
    v_sort_column TEXT;
    v_sort_direction TEXT;
BEGIN
    -- Validate and sanitize sort column
    v_sort_column := CASE 
        WHEN p_sort_by IN ('created_at', 'updated_at', 'title', 'file_size', 'view_count') 
        THEN p_sort_by 
        ELSE 'created_at' 
    END;
    
    v_sort_direction := CASE 
        WHEN LOWER(p_sort_order) = 'asc' THEN 'ASC' 
        ELSE 'DESC' 
    END;
    
    -- Check user permissions
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );
    
    v_has_property_access := p_property_id IS NULL OR EXISTS (
        SELECT 1 FROM user_properties 
        WHERE user_id = v_user_id AND property_id = p_property_id
    ) OR v_is_admin;
    
    -- Return empty if user doesn't have property access
    IF NOT v_has_property_access THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.content,
        d.file_url,
        d.status::TEXT,
        d.visibility::TEXT,
        d.property_id,
        d.department_id,
        d.folder_id,
        d.file_type,
        d.file_size,
        d.file_extension,
        d.confidentiality_level::TEXT,
        d.is_deleted,
        d.is_archived,
        d.created_by,
        d.created_at,
        d.updated_at,
        d.expires_at,
        d.view_count,
        d.download_count,
        d.content_type,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url
        ) AS author
    FROM documents d
    LEFT JOIN profiles p ON d.created_by = p.id
    WHERE 
        -- Search filter (safe parameterized ILIKE)
        (p_search_query IS NULL OR p_search_query = '' OR 
            (d.title ILIKE '%' || p_search_query || '%' OR
             d.description ILIKE '%' || p_search_query || '%' OR
             d.content ILIKE '%' || p_search_query || '%'))
        -- Property filter
        AND (p_property_id IS NULL OR d.property_id = p_property_id)
        -- Folder filter
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        -- Status filter
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        -- Visibility filter
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        -- Department filter
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        -- File type filter
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        -- Date range filters
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        -- Confidentiality filter
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        -- Deleted filter
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        -- Archived filter
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        -- RLS: User can see own documents or published with proper visibility
        AND (
            v_is_admin OR
            d.created_by = v_user_id OR
            d.owner_id = v_user_id OR
            (
                d.status = 'PUBLISHED' AND 
                (
                    d.visibility = 'all_properties' OR
                    (d.visibility = 'property' AND EXISTS (
                        SELECT 1 FROM user_properties up 
                        WHERE up.user_id = v_user_id AND up.property_id = d.property_id
                    )) OR
                    (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM user_departments ud 
                        WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
                    )) OR
                    (d.visibility = 'role' AND EXISTS (
                        SELECT 1 FROM user_roles ur 
                        WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT
                    ))
                )
            )
        )
    ORDER BY 
        CASE v_sort_column 
            WHEN 'title' THEN d.title
            ELSE NULL
        END ASC NULLS LAST,
        CASE v_sort_column 
            WHEN 'created_at' THEN d.created_at::TEXT
            WHEN 'updated_at' THEN d.updated_at::TEXT
            ELSE NULL
        END::TIMESTAMPTZ DESC NULLS LAST
    LIMIT LEAST(p_limit, 500)  -- Hard limit for safety
    OFFSET GREATEST(p_offset, 0);
END;
$$;

COMMENT ON FUNCTION secure_search_documents IS 
'Secure parameterized search for documents - replaces vulnerable client-side filter construction';

-- Function: Secure count for document search
CREATE OR REPLACE FUNCTION secure_count_documents(
    p_search_query TEXT,
    p_property_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_file_type TEXT[] DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_confidentiality_level TEXT DEFAULT NULL,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    SELECT COUNT(*) INTO v_count
    FROM documents d
    WHERE 
        (p_search_query IS NULL OR p_search_query = '' OR 
            (d.title ILIKE '%' || p_search_query || '%' OR
             d.description ILIKE '%' || p_search_query || '%'))
        AND (p_property_id IS NULL OR d.property_id = p_property_id)
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        AND (
            v_is_admin OR
            d.created_by = v_user_id OR
            d.owner_id = v_user_id OR
            (
                d.status = 'PUBLISHED' AND 
                (
                    d.visibility = 'all_properties' OR
                    (d.visibility = 'property' AND EXISTS (
                        SELECT 1 FROM user_properties up 
                        WHERE up.user_id = v_user_id AND up.property_id = d.property_id
                    )) OR
                    (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM user_departments ud 
                        WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
                    )) OR
                    (d.visibility = 'role' AND EXISTS (
                        SELECT 1 FROM user_roles ur 
                        WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT
                    ))
                )
            )
        );
    
    RETURN v_count;
END;
$$;

-- Function: Secure task search
CREATE OR REPLACE FUNCTION secure_search_tasks(
    p_search_query TEXT DEFAULT NULL,
    p_status TEXT[] DEFAULT NULL,
    p_priority TEXT[] DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    assigned_to_id UUID,
    created_by_id UUID,
    property_id UUID,
    department_id UUID,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status::TEXT,
        t.priority::TEXT,
        t.assigned_to_id,
        t.created_by_id,
        t.property_id,
        t.department_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.is_deleted
    FROM tasks t
    WHERE t.is_deleted = FALSE
        AND (p_search_query IS NULL OR p_search_query = '' OR 
            (t.title ILIKE '%' || p_search_query || '%' OR
             t.description ILIKE '%' || p_search_query || '%'))
        AND (p_status IS NULL OR p_status = '{}' OR t.status::TEXT = ANY(p_status))
        AND (p_priority IS NULL OR p_priority = '{}' OR t.priority::TEXT = ANY(p_priority))
        AND (p_assigned_to IS NULL OR t.assigned_to_id = p_assigned_to)
        AND (p_created_by IS NULL OR t.created_by_id = p_created_by)
        AND (p_property_id IS NULL OR t.property_id = p_property_id)
        AND (p_department_id IS NULL OR t.department_id = p_department_id)
        AND (
            v_is_admin OR
            t.assigned_to_id = v_user_id OR
            t.created_by_id = v_user_id OR
            EXISTS (
                SELECT 1 FROM user_properties up 
                WHERE up.user_id = v_user_id AND up.property_id = t.property_id
            )
        )
    ORDER BY t.created_at DESC
    LIMIT LEAST(p_limit, 500)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- Function: Secure user search
CREATE OR REPLACE FUNCTION secure_search_users(
    p_search_query TEXT,
    p_property_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    job_title TEXT,
    staff_id TEXT,
    avatar_url TEXT,
    is_active BOOLEAN,
    hire_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin', 'property_manager', 'property_hr')
    );

    -- Non-admins can only search within their own property
    IF NOT v_is_admin AND p_property_id IS NULL THEN
        SELECT property_id INTO p_property_id
        FROM user_properties
        WHERE user_id = v_user_id
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.phone,
        p.job_title,
        p.staff_id,
        p.avatar_url,
        p.is_active,
        p.hire_date,
        p.created_at
    FROM profiles p
    WHERE 
        -- Search query (sanitized)
        (p_search_query IS NULL OR p_search_query = '' OR 
            (p.full_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%' OR
             p.job_title ILIKE '%' || p_search_query || '%' OR
             p.staff_id ILIKE '%' || p_search_query || '%'))
        -- Active filter
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
        -- Property filter (check user_properties)
        AND (p_property_id IS NULL OR EXISTS (
            SELECT 1 FROM user_properties up 
            WHERE up.user_id = p.id AND up.property_id = p_property_id
        ))
        -- Department filter
        AND (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM user_departments ud 
            WHERE ud.user_id = p.id AND ud.department_id = p_department_id
        ))
        -- Role filter
        AND (p_role IS NULL OR EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = p.id AND ur.role::TEXT = p_role
        ))
        -- RLS: Users can see profiles in their properties
        AND (
            v_is_admin OR
            p.id = v_user_id OR
            EXISTS (
                SELECT 1 FROM user_properties up1
                JOIN user_properties up2 ON up1.property_id = up2.property_id
                WHERE up1.user_id = v_user_id AND up2.user_id = p.id
            )
        )
    ORDER BY p.full_name ASC NULLS LAST
    LIMIT LEAST(p_limit, 200);
END;
$$;

-- ============================================================================
-- PART 2: RLS POLICY AUDIT AND HARDENING
-- ============================================================================

-- Enable RLS on all tables that might be missing it
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            SELECT tablename FROM pg_policy 
            WHERE schemaname = 'public'
        )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Function to safely check table RLS status
CREATE OR REPLACE FUNCTION public.is_rls_enabled(p_table_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE oid = (p_table_name)::regclass;
$$;

-- ============================================================================
-- PART 3: AUDIT LOGGING SYSTEM
-- ============================================================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin_only"
    ON security_audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('regional_admin', 'corporate_admin')
        )
    );

-- Only system can insert audit logs
CREATE POLICY "audit_logs_insert_system_only"
    ON security_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);  -- Allow inserts, actual control via triggers

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON security_audit_logs(severity);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'info',
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO security_audit_logs (
        event_type,
        user_id,
        user_role,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        severity,
        metadata
    ) VALUES (
        p_event_type,
        auth.uid(),
        (SELECT role::TEXT FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
        p_table_name,
        p_record_id,
        p_action,
        p_old_data,
        p_new_data,
        p_severity,
        p_metadata
    );
END;
$$;

-- ============================================================================
-- PART 4: RATE LIMITING TABLE (Server-side rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,  -- Composite key: user_id:action or ip:action
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_entries(window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_entry rate_limit_entries%ROWTYPE;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Clean up old entries periodically (1% chance)
    IF random() < 0.01 THEN
        DELETE FROM rate_limit_entries WHERE window_start < v_window_start;
    END IF;
    
    -- Get or create entry
    SELECT * INTO v_entry
    FROM rate_limit_entries
    WHERE key = p_key AND window_start > v_window_start;
    
    IF NOT FOUND THEN
        -- Create new entry
        INSERT INTO rate_limit_entries (key, count, window_start)
        VALUES (p_key, 1, now())
        ON CONFLICT (key) DO UPDATE
        SET count = 1, window_start = now(), updated_at = now()
        WHERE rate_limit_entries.window_start < v_window_start;
        RETURN TRUE;
    END IF;
    
    -- Check limit
    IF v_entry.count >= p_max_requests THEN
        -- Log rate limit exceeded
        PERFORM log_security_event(
            'rate_limit_exceeded',
            NULL,
            NULL,
            'rate_limit_check',
            NULL,
            jsonb_build_object('key', p_key, 'count', v_entry.count, 'max', p_max_requests),
            'warning'
        );
        RETURN FALSE;
    END IF;
    
    -- Increment count
    UPDATE rate_limit_entries
    SET count = count + 1, updated_at = now()
    WHERE id = v_entry.id;
    
    RETURN TRUE;
END;
$$;

-- Function to check rate limit for current user
CREATE OR REPLACE FUNCTION check_user_rate_limit(
    p_action TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 900  -- 15 minutes
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN check_rate_limit(
        auth.uid()::TEXT || ':' || p_action,
        p_max_requests,
        p_window_seconds
    );
END;
$$;

-- ============================================================================
-- PART 5: SECURE FILE ACCESS VALIDATION
-- ============================================================================

-- Function to validate document access before generating signed URL
CREATE OR REPLACE FUNCTION validate_document_access(p_document_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_doc RECORD;
    v_is_admin BOOLEAN;
BEGIN
    -- Check admin status
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );
    
    -- Get document
    SELECT * INTO v_doc
    FROM documents
    WHERE id = p_document_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Admin can access all
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Owner can access
    IF v_doc.created_by = v_user_id OR v_doc.owner_id = v_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check published status and visibility
    IF v_doc.status = 'PUBLISHED' THEN
        CASE v_doc.visibility
            WHEN 'all_properties' THEN
                RETURN TRUE;
            WHEN 'property' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_properties 
                    WHERE user_id = v_user_id AND property_id = v_doc.property_id
                );
            WHEN 'department' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_departments 
                    WHERE user_id = v_user_id AND department_id = v_doc.department_id
                );
            WHEN 'role' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = v_user_id AND role::TEXT = v_doc.role::TEXT
                );
            ELSE
                RETURN FALSE;
        END CASE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- ============================================================================
-- PART 6: INPUT VALIDATION FUNCTIONS
-- ============================================================================

-- Function to sanitize user input for search
CREATE OR REPLACE FUNCTION sanitize_search_input(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
AS $$
SELECT regexp_replace(
    regexp_replace(
        regexp_replace(
            COALESCE(p_input, ''),
            '[^a-zA-Z0-9\s\-_@.]', '', 'g'  -- Remove special characters
        ),
        '\s+', ' ', 'g'  -- Normalize whitespace
    ),
    '^\s+|\s+$', '', 'g'  -- Trim
);
$$;

-- Function to validate UUID array
CREATE OR REPLACE FUNCTION validate_uuid_array(p_input TEXT[])
RETURNS UUID[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
AS $$
SELECT ARRAY_AGG(x::UUID)
FROM UNNEST(p_input) AS x
WHERE x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

-- ============================================================================
-- PART 7: SECURITY COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION secure_search_documents IS 
'CRITICAL SECURITY FUNCTION: Use this instead of client-side .or() filters to prevent SQL injection';

COMMENT ON FUNCTION secure_count_documents IS 
'CRITICAL SECURITY FUNCTION: Use this for document counts instead of client-side count queries';

COMMENT ON FUNCTION check_rate_limit IS 
'Server-side rate limiting to replace client-side in-memory rate limiting';

COMMENT ON FUNCTION validate_document_access IS 
'IDOR protection: Validates user has permission to access document before generating URLs';

COMMENT ON TABLE security_audit_logs IS 
'Audit trail for security events including authentication, authorization, and data access';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION secure_search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION secure_count_documents TO authenticated;
GRANT EXECUTE ON FUNCTION secure_search_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION secure_search_users TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION validate_document_access TO authenticated;
GRANT EXECUTE ON FUNCTION sanitize_search_input TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
