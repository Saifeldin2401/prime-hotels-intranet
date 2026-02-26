-- Migration: Training Builder Integration v4 (fixed JSON INSERT syntax)

-- 1. Enhance training_content_blocks (if not already applied)
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS ai_source_content TEXT;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_training_content_source_doc ON training_content_blocks(source_document_id) WHERE source_document_id IS NOT NULL;

-- 2. Enhance knowledge_questions
ALTER TABLE knowledge_questions 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;
ALTER TABLE knowledge_questions 
ADD COLUMN IF NOT EXISTS training_section_id TEXT;
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_training ON knowledge_questions(training_module_id) WHERE training_module_id IS NOT NULL;

-- 3. Enhance learning_quizzes
ALTER TABLE learning_quizzes 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;
ALTER TABLE learning_quizzes 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_learning_quizzes_training ON learning_quizzes(training_module_id) WHERE training_module_id IS NOT NULL;

-- 4. Create training_module_resources table
CREATE TABLE IF NOT EXISTS training_module_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('document','quiz','video','external_link')),
    resource_id UUID,
    resource_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(training_module_id, resource_type, resource_id)
);
ALTER TABLE training_module_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_module_resources_select" ON training_module_resources FOR SELECT USING (true);
CREATE POLICY "training_module_resources_insert" ON training_module_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "training_module_resources_update" ON training_module_resources FOR UPDATE USING (true);
CREATE POLICY "training_module_resources_delete" ON training_module_resources FOR DELETE USING (true);

-- 5. Create training_content_templates table
CREATE TABLE IF NOT EXISTS training_content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('safety','policy','skill','onboarding','custom')),
    template_structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE training_content_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_content_templates_select" ON training_content_templates FOR SELECT USING (true);

-- 6. Insert default templates (JSON literals)
INSERT INTO training_content_templates (name, description, category, template_structure) VALUES
('Safety Procedure','Standard template for safety training','safety','{"sections":[{"type":"text","title":"Learning Objectives"},{"type":"text","title":"Procedure Steps"},{"type":"inline_quiz","title":"Knowledge Check"}]}'),
('Policy Overview','Template for policy training','policy','{"sections":[{"type":"text","title":"Policy Summary"},{"type":"text","title":"Detailed Policy"},{"type":"inline_quiz","title":"Policy Assessment"}]}'),
('Skill Training','Template for hands‑on skill training','skill','{"sections":[{"type":"text","title":"Introduction"},{"type":"video","title":"Demonstration"},{"type":"inline_quiz","title":"Certification Quiz"}]}')
ON CONFLICT DO NOTHING;

-- 7. Utility function
CREATE OR REPLACE FUNCTION get_training_module_related_resources(p_module_id UUID)
RETURNS TABLE (resource_type TEXT, resource_id UUID, title TEXT, description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'document', d.id, d.title, d.description FROM documents d WHERE d.id IN (SELECT DISTINCT source_document_id FROM training_content_blocks WHERE training_module_id = p_module_id AND source_document_id IS NOT NULL)
    UNION ALL
    SELECT 'quiz', lq.id, lq.title, lq.description FROM learning_quizzes lq WHERE lq.training_module_id = p_module_id
    UNION ALL
    SELECT 'question', kq.id, kq.question_text, kq.explanation FROM knowledge_questions kq WHERE kq.training_module_id = p_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
