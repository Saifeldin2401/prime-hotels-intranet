-- ============================================================================
-- Document Expiry and Metadata Enhancements
-- Additional columns for document lifecycle management and audit tracking
-- ============================================================================

-- Create confidentiality level enum
DO $$ BEGIN
    CREATE TYPE document_confidentiality AS ENUM (
        'public',        -- Visible to everyone
        'internal',      -- Visible to all employees
        'confidential',  -- Visible to specific departments/roles
        'restricted'     -- Visible only to specific individuals
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to documents table
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_reminder_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS document_number TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS confidentiality_level document_confidentiality DEFAULT 'internal',
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS file_extension TEXT,
    ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS watermark_text TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_review_reminder ON documents(review_reminder_date) WHERE review_reminder_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality ON documents(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_document_number ON documents(document_number) WHERE document_number IS NOT NULL;

-- Create document download logs table for audit
CREATE TABLE IF NOT EXISTS document_download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET
);

-- Create document views table for analytics
CREATE TABLE IF NOT EXISTS document_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit and analytics tables
CREATE INDEX IF NOT EXISTS idx_document_download_logs_document ON document_download_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_download_logs_user ON document_download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_download_logs_downloaded ON document_download_logs(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_download_logs_lookup ON document_download_logs(document_id, user_id, downloaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_views_document ON document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_user ON document_views(user_id);
CREATE INDEX IF NOT EXISTS idx_document_views_viewed ON document_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_views_lookup ON document_views(document_id, user_id, viewed_at DESC);

-- Enable Row Level Security on new tables
ALTER TABLE document_download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View download logs
-- Users can view download logs for documents they own or manage
CREATE POLICY "document_download_logs_select"
    ON document_download_logs FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_download_logs.document_id
            AND (
                d.created_by = auth.uid() OR
                d.owner_id = auth.uid() OR
                (public.has_role(auth.uid(), 'property_manager') AND 
                 public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- RLS Policy: Create download logs
-- Any authenticated user can create a download log (system operation)
CREATE POLICY "document_download_logs_insert"
    ON document_download_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: View document views (analytics)
-- Users can view analytics for documents they own or manage
CREATE POLICY "document_views_select"
    ON document_views FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_views.document_id
            AND (
                d.created_by = auth.uid() OR
                d.owner_id = auth.uid() OR
                (public.has_role(auth.uid(), 'property_manager') AND 
                 public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- RLS Policy: Create document views
-- Any authenticated user can create a view log (system operation)
CREATE POLICY "document_views_insert"
    ON document_views FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Function to increment document download count
CREATE OR REPLACE FUNCTION increment_document_download_count(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE documents 
    SET 
        download_count = COALESCE(download_count, 0) + 1,
        last_downloaded_at = NOW()
    WHERE id = p_document_id;
END;
$$;

-- Function to log document download
CREATE OR REPLACE FUNCTION log_document_download(
    p_document_id UUID,
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO document_download_logs (document_id, user_id, ip_address)
    VALUES (p_document_id, p_user_id, p_ip_address)
    RETURNING id INTO v_log_id;
    
    -- Also increment the download count on the document
    PERFORM increment_document_download_count(p_document_id);
    
    RETURN v_log_id;
END;
$$;

-- Function to log document view
CREATE OR REPLACE FUNCTION log_document_view(
    p_document_id UUID,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_view_id UUID;
BEGIN
    INSERT INTO document_views (document_id, user_id)
    VALUES (p_document_id, p_user_id)
    RETURNING id INTO v_view_id;
    
    RETURN v_view_id;
END;
$$;

-- Function to get documents expiring soon
CREATE OR REPLACE FUNCTION get_expiring_documents(
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    document_id UUID,
    title TEXT,
    expires_at TIMESTAMPTZ,
    days_until_expiry INTEGER,
    owner_email TEXT,
    owner_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.expires_at,
        EXTRACT(DAY FROM d.expires_at - NOW())::INTEGER AS days_until_expiry,
        p.email AS owner_email,
        p.full_name AS owner_name
    FROM documents d
    LEFT JOIN profiles p ON d.owner_id = p.id
    WHERE d.expires_at IS NOT NULL
    AND d.expires_at <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND d.expires_at >= NOW()
    AND d.is_archived = FALSE
    ORDER BY d.expires_at ASC;
END;
$$;

-- Function to archive expired documents
CREATE OR REPLACE FUNCTION archive_expired_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE documents 
    SET is_archived = TRUE, updated_at = NOW()
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_archived = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Add comments for documentation
COMMENT ON TYPE document_confidentiality IS 'Confidentiality levels for documents: public, internal, confidential, restricted';
COMMENT ON COLUMN documents.expires_at IS 'Date when the document expires and should be reviewed or archived';
COMMENT ON COLUMN documents.review_reminder_date IS 'Date to send a reminder for document review';
COMMENT ON COLUMN documents.document_number IS 'Unique document identifier/reference number';
COMMENT ON COLUMN documents.confidentiality_level IS 'Document confidentiality classification';
COMMENT ON COLUMN documents.owner_id IS 'User responsible for the document content';
COMMENT ON COLUMN documents.folder_id IS 'Folder where the document is organized';
COMMENT ON COLUMN documents.file_extension IS 'File extension for the document (e.g., pdf, docx)';
COMMENT ON COLUMN documents.download_count IS 'Total number of times the document has been downloaded';
COMMENT ON COLUMN documents.last_downloaded_at IS 'Timestamp of the last download';
COMMENT ON COLUMN documents.watermark_text IS 'Text to overlay as watermark on document';
COMMENT ON COLUMN documents.is_archived IS 'Whether the document is archived (read-only)';
COMMENT ON TABLE document_download_logs IS 'Audit log of document downloads';
COMMENT ON TABLE document_views IS 'Analytics tracking of document views';
;
