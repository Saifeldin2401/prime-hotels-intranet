-- Create microlearning_content table
CREATE TABLE IF NOT EXISTS microlearning_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER,
    thumbnail_url TEXT,
    category TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE microlearning_content ENABLE ROW LEVEL SECURITY;

-- Add linked_sop_id to learning_quizzes
ALTER TABLE learning_quizzes 
ADD COLUMN IF NOT EXISTS linked_sop_id UUID REFERENCES sop_documents(id);

-- RLS Policies for microlearning_content
CREATE POLICY "Microlearning viewable by authenticated users"
    ON microlearning_content FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Microlearning manageable by admins and managers"
    ON microlearning_content FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'property_manager', 'department_head')
        )
    );
;
