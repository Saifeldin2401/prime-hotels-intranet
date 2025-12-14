-- Knowledge Base Schema Enhancements
-- Transforms SOP module into centralized Knowledge Base

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Content type for different knowledge assets
DO $$ BEGIN
    CREATE TYPE knowledge_content_type AS ENUM (
        'sop',          -- Standard Operating Procedure
        'policy',       -- Policy document
        'guide',        -- How-to guide/article
        'checklist',    -- Interactive checklist
        'reference',    -- Quick reference card
        'faq',          -- FAQ/Q&A
        'video',        -- Video tutorial
        'visual'        -- Diagram/infographic
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Visibility scope for content targeting
DO $$ BEGIN
    CREATE TYPE knowledge_visibility AS ENUM (
        'global',              -- All properties, all roles
        'property',            -- Specific property only
        'department',          -- Specific department
        'role',                -- Specific role
        'property_department', -- Property + Department combo
        'custom'               -- Custom assignment rules
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Enhance sop_documents with Knowledge Base features
ALTER TABLE sop_documents 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visibility_scope knowledge_visibility DEFAULT 'global',
ADD COLUMN IF NOT EXISTS content_type knowledge_content_type DEFAULT 'sop',
ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reviewed_by UUID REFERENCES auth.users(id);

-- Add content HTML for simpler storage (alternative to versions for quick content)
ALTER TABLE sop_documents
ADD COLUMN IF NOT EXISTS content TEXT;

-- Create index for property-based queries
CREATE INDEX IF NOT EXISTS idx_sop_documents_property ON sop_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_visibility ON sop_documents(visibility_scope);
CREATE INDEX IF NOT EXISTS idx_sop_documents_content_type ON sop_documents(content_type);
CREATE INDEX IF NOT EXISTS idx_sop_documents_featured ON sop_documents(featured) WHERE featured = true;

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Comments and discussion threads on knowledge articles
CREATE TABLE IF NOT EXISTS sop_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES sop_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_question BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_comments_document ON sop_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_sop_comments_parent ON sop_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_sop_comments_user ON sop_comments(user_id);

-- Comment reactions/votes
CREATE TABLE IF NOT EXISTS sop_comment_votes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES sop_comments(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, comment_id)
);

-- Context triggers for surfacing relevant content
CREATE TABLE IF NOT EXISTS sop_context_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('task', 'checklist', 'training', 'page', 'maintenance', 'onboarding')),
    trigger_value TEXT NOT NULL, -- task type, page path, etc.
    priority INTEGER DEFAULT 0,
    show_as TEXT DEFAULT 'link' CHECK (show_as IN ('link', 'tooltip', 'modal', 'inline')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, trigger_type, trigger_value)
);

CREATE INDEX IF NOT EXISTS idx_sop_context_triggers_type ON sop_context_triggers(trigger_type, trigger_value);
CREATE INDEX IF NOT EXISTS idx_sop_context_triggers_document ON sop_context_triggers(document_id);

-- Role-specific assignments for required reading
CREATE TABLE IF NOT EXISTS sop_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT FALSE,
    due_days_after_assignment INTEGER, -- days after assignment to complete
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, role, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'), COALESCE(department_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX IF NOT EXISTS idx_sop_role_assignments_role ON sop_role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_sop_role_assignments_document ON sop_role_assignments(document_id);

-- User bookmarks for quick access
CREATE TABLE IF NOT EXISTS sop_bookmarks (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

-- View history for "recently viewed" and analytics
CREATE TABLE IF NOT EXISTS sop_view_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    view_duration_seconds INTEGER,
    scroll_depth_percent INTEGER,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_view_history_user ON sop_view_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sop_view_history_document ON sop_view_history(document_id);

-- Feedback/ratings on knowledge articles
CREATE TABLE IF NOT EXISTS sop_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE sop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_context_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_feedback ENABLE ROW LEVEL SECURITY;

-- Comments: Read all, write own
CREATE POLICY "Users can view all comments" ON sop_comments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create comments" ON sop_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON sop_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON sop_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks: Own only
CREATE POLICY "Users can manage own bookmarks" ON sop_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- View history: Own only
CREATE POLICY "Users can manage own view history" ON sop_view_history
    FOR ALL USING (auth.uid() = user_id);

-- Feedback: Read all, write own
CREATE POLICY "Users can view all feedback" ON sop_feedback
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own feedback" ON sop_feedback
    FOR ALL USING (auth.uid() = user_id);

-- Context triggers: Read all authenticated
CREATE POLICY "Users can view context triggers" ON sop_context_triggers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Role assignments: Read all, write for HR+
CREATE POLICY "Users can view role assignments" ON sop_role_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get required reading for a user
CREATE OR REPLACE FUNCTION get_required_reading(p_user_id UUID)
RETURNS TABLE (
    document_id UUID,
    title TEXT,
    content_type knowledge_content_type,
    is_acknowledged BOOLEAN,
    due_date DATE
) AS $$
DECLARE
    v_role TEXT;
    v_property_id UUID;
    v_department_id UUID;
BEGIN
    -- Get user's role and assignments
    SELECT role, property_id, department_id 
    INTO v_role, v_property_id, v_department_id
    FROM user_roles 
    WHERE user_id = p_user_id 
    LIMIT 1;

    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.content_type,
        EXISTS(
            SELECT 1 FROM sop_acknowledgments a 
            WHERE a.document_id = d.id 
            AND a.user_id = p_user_id
        ) AS is_acknowledged,
        (ra.created_at + (ra.due_days_after_assignment || ' days')::INTERVAL)::DATE AS due_date
    FROM sop_documents d
    JOIN sop_role_assignments ra ON d.id = ra.document_id
    WHERE ra.is_required = TRUE
    AND ra.role = v_role
    AND (ra.property_id IS NULL OR ra.property_id = v_property_id)
    AND (ra.department_id IS NULL OR ra.department_id = v_department_id)
    AND d.status = 'approved';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get contextual help for a trigger
CREATE OR REPLACE FUNCTION get_contextual_help(p_trigger_type TEXT, p_trigger_value TEXT)
RETURNS TABLE (
    document_id UUID,
    title TEXT,
    description TEXT,
    content_type knowledge_content_type,
    show_as TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.description,
        d.content_type,
        ct.show_as
    FROM sop_documents d
    JOIN sop_context_triggers ct ON d.id = ct.document_id
    WHERE ct.trigger_type = p_trigger_type
    AND ct.trigger_value = p_trigger_value
    AND d.status = 'approved'
    ORDER BY ct.priority DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_sop_view_count(p_document_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE sop_documents 
    SET view_count = COALESCE(view_count, 0) + 1 
    WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update comment timestamps
CREATE OR REPLACE FUNCTION update_sop_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sop_comments_modtime ON sop_comments;
CREATE TRIGGER update_sop_comments_modtime
BEFORE UPDATE ON sop_comments
FOR EACH ROW EXECUTE FUNCTION update_sop_comment_timestamp();
