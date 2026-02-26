-- Knowledge Base Persistence Tables
-- Adds support for bookmarks, feedback, and categories for the main documents table

-- Bookmarks table
CREATE TABLE IF NOT EXISTS document_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS document_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_user ON document_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_document ON document_bookmarks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_feedback_document ON document_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_department ON document_categories(department_id);

-- Enable RLS
ALTER TABLE document_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Bookmarks: Own only
CREATE POLICY "Users can manage own bookmarks" ON document_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Feedback: View all, manage own
CREATE POLICY "Users can view all feedback" ON document_feedback
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own feedback" ON document_feedback
    FOR ALL USING (auth.uid() = user_id);

-- Categories: View all, manage by HR/Admins
CREATE POLICY "Users can view all categories" ON document_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories" ON document_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
;
