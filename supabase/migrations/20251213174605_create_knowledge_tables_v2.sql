-- Create sop_categories table
CREATE TABLE IF NOT EXISTS sop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    parent_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sop_comments table
CREATE TABLE IF NOT EXISTS sop_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES sop_comments(id) ON DELETE CASCADE,
    is_question BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sop_bookmarks table
CREATE TABLE IF NOT EXISTS sop_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Create sop_feedback table
CREATE TABLE IF NOT EXISTS sop_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Create sop_role_assignments table for required reading (without roles FK)
CREATE TABLE IF NOT EXISTS sop_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    role_name TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add linked_sop_id to learning_quizzes if it doesn't exist
ALTER TABLE learning_quizzes ADD COLUMN IF NOT EXISTS linked_sop_id UUID REFERENCES sop_documents(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_role_assignments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "categories_select" ON sop_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "comments_select" ON sop_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON sop_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON sop_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON sop_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_select" ON sop_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert" ON sop_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete" ON sop_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "feedback_select" ON sop_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert" ON sop_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_update" ON sop_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "role_assignments_select" ON sop_role_assignments FOR SELECT TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sop_comments_document ON sop_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_sop_bookmarks_user ON sop_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_feedback_document ON sop_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_sop_role_assignments_document ON sop_role_assignments(document_id);;
