-- ============================================================================
-- Document Comments System
-- Commenting and discussion threads on documents
-- ============================================================================

-- Create document comments table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_comments_document ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent ON document_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created ON document_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_comments_resolved ON document_comments(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_document_comments_pinned ON document_comments(is_pinned) WHERE is_pinned = TRUE;

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_document_comments_updated_at ON document_comments;
CREATE TRIGGER update_document_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View comments
-- Users can view comments on documents they have access to
CREATE POLICY "document_comments_select"
    ON document_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_comments.document_id
            AND (
                public.has_role(auth.uid(), 'regional_admin') OR
                public.has_role(auth.uid(), 'regional_hr') OR
                d.created_by = auth.uid() OR
                d.owner_id = auth.uid() OR
                (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id)) OR
                (
                    d.visibility = 'department' AND d.department_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM user_departments ud
                        WHERE ud.user_id = auth.uid() AND ud.department_id = d.department_id
                    )
                )
            )
        )
    );

-- RLS Policy: Create comments
-- Users can create comments on documents they can view
CREATE POLICY "document_comments_insert"
    ON document_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_comments.document_id
            AND (
                public.has_role(auth.uid(), 'regional_admin') OR
                public.has_role(auth.uid(), 'regional_hr') OR
                d.created_by = auth.uid() OR
                d.owner_id = auth.uid() OR
                (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id)) OR
                (
                    d.visibility = 'department' AND d.department_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM user_departments ud
                        WHERE ud.user_id = auth.uid() AND ud.department_id = d.department_id
                    )
                )
            )
        )
    );

-- RLS Policy: Update comments
-- Users can update their own comments
CREATE POLICY "document_comments_update_own"
    ON document_comments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Update comment resolution status
-- Document owners and admins can mark comments as resolved
CREATE POLICY "document_comments_resolve"
    ON document_comments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_comments.document_id
            AND (
                d.created_by = auth.uid() OR
                d.owner_id = auth.uid() OR
                public.has_role(auth.uid(), 'regional_admin') OR
                (public.has_role(auth.uid(), 'property_manager') AND 
                 public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- RLS Policy: Delete comments
-- Users can delete their own comments, admins can delete any
CREATE POLICY "document_comments_delete"
    ON document_comments FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.has_role(auth.uid(), 'regional_admin') OR
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_comments.document_id
            AND (d.created_by = auth.uid() OR d.owner_id = auth.uid())
        )
    );

-- Function to get comment thread with nested replies
CREATE OR REPLACE FUNCTION get_document_comments_thread(p_document_id UUID)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    parent_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    content TEXT,
    is_resolved BOOLEAN,
    is_pinned BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    reply_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.is_pinned,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM document_comments replies WHERE replies.parent_id = c.id) AS reply_count
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.document_id = p_document_id
    AND c.parent_id IS NULL  -- Only top-level comments
    ORDER BY 
        c.is_pinned DESC,  -- Pinned comments first
        c.created_at DESC;
END;
$$;

-- Function to get replies for a specific comment
CREATE OR REPLACE FUNCTION get_comment_replies(p_parent_id UUID)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    parent_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    content TEXT,
    is_resolved BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.created_at,
        c.updated_at
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.parent_id = p_parent_id
    ORDER BY c.created_at ASC;
END;
$$;

-- Function to toggle comment pin status
CREATE OR REPLACE FUNCTION toggle_comment_pin(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_document_id UUID;
    v_is_pinned BOOLEAN;
    v_new_status BOOLEAN;
BEGIN
    -- Get the document_id and current pin status
    SELECT document_id, is_pinned INTO v_document_id, v_is_pinned
    FROM document_comments
    WHERE id = p_comment_id;
    
    IF v_document_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission (document owner or admin)
    IF NOT EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = v_document_id
        AND (
            d.created_by = auth.uid() OR
            d.owner_id = auth.uid() OR
            public.has_role(auth.uid(), 'regional_admin') OR
            (public.has_role(auth.uid(), 'property_manager') AND 
             public.has_property_access(auth.uid(), d.property_id))
        )
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Toggle pin status
    v_new_status := NOT v_is_pinned;
    
    UPDATE document_comments
    SET is_pinned = v_new_status, updated_at = NOW()
    WHERE id = p_comment_id;
    
    RETURN v_new_status;
END;
$$;

-- Function to mark comment as resolved
CREATE OR REPLACE FUNCTION resolve_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_document_id UUID;
BEGIN
    -- Get the document_id
    SELECT document_id INTO v_document_id
    FROM document_comments
    WHERE id = p_comment_id;
    
    IF v_document_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission
    IF NOT EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = v_document_id
        AND (
            d.created_by = auth.uid() OR
            d.owner_id = auth.uid() OR
            public.has_role(auth.uid(), 'regional_admin') OR
            (public.has_role(auth.uid(), 'property_manager') AND 
             public.has_property_access(auth.uid(), d.property_id))
        )
    ) THEN
        RETURN FALSE;
    END IF;
    
    UPDATE document_comments
    SET is_resolved = TRUE, updated_at = NOW()
    WHERE id = p_comment_id;
    
    RETURN TRUE;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE document_comments IS 'Comments and discussion threads on documents with support for nested replies';
COMMENT ON COLUMN document_comments.parent_id IS 'Self-referencing foreign key for nested replies (NULL for top-level comments)';
COMMENT ON COLUMN document_comments.is_resolved IS 'Whether the comment thread has been resolved';
COMMENT ON COLUMN document_comments.is_pinned IS 'Whether the comment is pinned to the top';
