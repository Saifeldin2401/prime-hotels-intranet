-- ============================================================================
-- Document Folders System
-- Hierarchical folder structure for organizing documents
-- ============================================================================

-- Create document folders table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_department ON document_folders(department_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_property ON document_folders(property_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON document_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_is_system ON document_folders(is_system) WHERE is_system = TRUE;

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_document_folders_updated_at ON document_folders;
CREATE TRIGGER update_document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View folders
-- Users can view folders if:
-- 1. They are regional admins or regional HR
-- 2. They have access to the property
-- 3. They belong to the department (if department-specific)
-- 4. System folders are visible to all authenticated users
CREATE POLICY "document_folders_select"
    ON document_folders FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        is_system = TRUE OR
        (
            property_id IS NOT NULL AND 
            public.has_property_access(auth.uid(), property_id)
        ) OR
        (
            department_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM user_departments ud
                WHERE ud.user_id = auth.uid() 
                AND ud.department_id = document_folders.department_id
            )
        ) OR
        created_by = auth.uid()
    );

-- RLS Policy: Create folders
-- Users can create folders if they have appropriate roles
CREATE POLICY "document_folders_insert"
    ON document_folders FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        (
            public.has_role(auth.uid(), 'property_manager') AND
            property_id IS NOT NULL AND
            public.has_property_access(auth.uid(), property_id)
        ) OR
        (
            public.has_role(auth.uid(), 'department_head') AND
            department_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM departments d
                JOIN user_departments ud ON d.id = ud.department_id
                WHERE d.id = document_folders.department_id 
                AND ud.user_id = auth.uid()
            )
        )
    );

-- RLS Policy: Update folders
-- Users can update non-system folders they created or have management rights to
CREATE POLICY "document_folders_update"
    ON document_folders FOR UPDATE
    TO authenticated
    USING (
        (
            is_system = FALSE AND
            (
                public.has_role(auth.uid(), 'regional_admin') OR
                (
                    public.has_role(auth.uid(), 'property_manager') AND
                    property_id IS NOT NULL AND
                    public.has_property_access(auth.uid(), property_id)
                ) OR
                (
                    public.has_role(auth.uid(), 'department_head') AND
                    department_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM departments d
                        JOIN user_departments ud ON d.id = ud.department_id
                        WHERE d.id = document_folders.department_id 
                        AND ud.user_id = auth.uid()
                    )
                ) OR
                created_by = auth.uid()
            )
        )
    );

-- RLS Policy: Delete folders
-- Only admins and creators can delete non-system folders
CREATE POLICY "document_folders_delete"
    ON document_folders FOR DELETE
    TO authenticated
    USING (
        is_system = FALSE AND
        (
            public.has_role(auth.uid(), 'regional_admin') OR
            (
                public.has_role(auth.uid(), 'property_manager') AND
                property_id IS NOT NULL AND
                public.has_property_access(auth.uid(), property_id)
            ) OR
            created_by = auth.uid()
        )
    );

-- Insert default system folders
INSERT INTO document_folders (name, description, is_system) VALUES
    ('All Documents', 'Root folder containing all documents', TRUE),
    ('Finance', 'Financial documents, reports, and records', TRUE),
    ('HR', 'Human resources documents and policies', TRUE),
    ('Operations', 'Operational procedures and documentation', TRUE),
    ('Maintenance', 'Maintenance records, schedules, and procedures', TRUE),
    ('Front Desk', 'Front desk procedures and guest-related documents', TRUE),
    ('Housekeeping', 'Housekeeping procedures and schedules', TRUE),
    ('F&B', 'Food and beverage documentation', TRUE)
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE document_folders IS 'Hierarchical folder structure for organizing documents by department and property';
COMMENT ON COLUMN document_folders.is_system IS 'System folders cannot be deleted and are visible to all users';
COMMENT ON COLUMN document_folders.parent_id IS 'Self-referencing foreign key for nested folder structure';
