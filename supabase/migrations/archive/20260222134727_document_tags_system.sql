-- ============================================================================
-- Document Tags System
-- Tagging functionality for categorizing and filtering documents
-- ============================================================================

-- Create document tags table
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document tag assignments table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS document_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, tag_id)
);

-- Create GIN index for tag name search (for faster text searches)
CREATE INDEX IF NOT EXISTS idx_document_tags_name_gin ON document_tags USING GIN (name gin_trgm_ops);

-- Standard indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_tags_created_by ON document_tags(created_by);
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_document ON document_tag_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_tag ON document_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_assignments_lookup ON document_tag_assignments(document_id, tag_id);

-- Enable Row Level Security
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View tags
-- All authenticated users can view tags
CREATE POLICY "document_tags_select"
    ON document_tags FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');

-- RLS Policy: Create tags
-- Users with appropriate roles can create tags
CREATE POLICY "document_tags_insert"
    ON document_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        public.has_role(auth.uid(), 'property_manager') OR
        public.has_role(auth.uid(), 'department_head')
    );

-- RLS Policy: Update tags
-- Users can update tags they created, admins can update any
CREATE POLICY "document_tags_update"
    ON document_tags FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        created_by = auth.uid()
    );

-- RLS Policy: Delete tags
-- Users can delete tags they created, admins can delete any
CREATE POLICY "document_tags_delete"
    ON document_tags FOR DELETE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        created_by = auth.uid()
    );

-- RLS Policy: View tag assignments
-- Users can view assignments for documents they have access to
CREATE POLICY "document_tag_assignments_select"
    ON document_tag_assignments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_tag_assignments.document_id
            AND (
                public.has_role(auth.uid(), 'regional_admin') OR
                public.has_role(auth.uid(), 'regional_hr') OR
                d.created_by = auth.uid() OR
                (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- RLS Policy: Create tag assignments
-- Users who can edit documents can assign tags
CREATE POLICY "document_tag_assignments_insert"
    ON document_tag_assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_tag_assignments.document_id
            AND (
                d.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'regional_admin') OR
                (public.has_role(auth.uid(), 'property_manager') AND 
                 public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- RLS Policy: Delete tag assignments
-- Users who can edit documents can remove tag assignments
CREATE POLICY "document_tag_assignments_delete"
    ON document_tag_assignments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_tag_assignments.document_id
            AND (
                d.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'regional_admin') OR
                (public.has_role(auth.uid(), 'property_manager') AND 
                 public.has_property_access(auth.uid(), d.property_id))
            )
        )
    );

-- Insert default tags
INSERT INTO document_tags (name, color) VALUES
    ('Important', '#EF4444'),      -- Red
    ('Draft', '#F59E0B'),          -- Amber
    ('Approved', '#10B981'),       -- Green
    ('Pending Review', '#6366F1'), -- Indigo
    ('Confidential', '#8B5CF6'),   -- Purple
    ('Archived', '#6B7280'),       -- Gray
    ('Policy', '#0EA5E9'),         -- Sky
    ('Procedure', '#14B8A6'),      -- Teal
    ('Template', '#F97316'),       -- Orange
    ('Reference', '#84CC16')       -- Lime
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE document_tags IS 'Tags for categorizing and filtering documents';
COMMENT ON TABLE document_tag_assignments IS 'Many-to-many relationship between documents and tags';
COMMENT ON COLUMN document_tags.color IS 'Hex color code for tag display (e.g., #3B82F6)';
;
