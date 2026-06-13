-- Migration: Training Builder Enhancement - Full Integration Schema
-- Adds references between training, knowledge base, questions, and quizzes

-- ============================================================================
-- 1. Enhance training_content_blocks with source document references
-- ============================================================================

-- Add source document reference for content pulled from knowledge base
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Add AI generation metadata
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS ai_source_content TEXT;

-- Add title and content_url columns if missing
ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS content_url TEXT;

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}';

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE training_content_blocks 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Index for finding content linked to a document
CREATE INDEX IF NOT EXISTS idx_training_content_source_doc 
ON training_content_blocks(source_document_id) 
WHERE source_document_id IS NOT NULL;

-- ============================================================================
-- 2. Enhance knowledge_questions with training module references
-- ============================================================================

-- Add training module reference to questions
ALTER TABLE knowledge_questions 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;

-- Add training section reference (for inline questions)
ALTER TABLE knowledge_questions 
ADD COLUMN IF NOT EXISTS training_section_id TEXT;

-- Index for finding questions linked to a module
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_training 
ON knowledge_questions(training_module_id) 
WHERE training_module_id IS NOT NULL;

-- ============================================================================
-- 3. Enhance learning_quizzes with training module and document references
-- ============================================================================

-- Add training module reference
ALTER TABLE learning_quizzes 
ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;

-- Add source document reference
ALTER TABLE learning_quizzes 
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Index for training-linked quizzes
CREATE INDEX IF NOT EXISTS idx_learning_quizzes_training 
ON learning_quizzes(training_module_id) 
WHERE training_module_id IS NOT NULL;

-- ============================================================================
-- 4. Create training_module_resources table for linked resources
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_module_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'quiz', 'video', 'external_link')),
    resource_id UUID,
    resource_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(training_module_id, resource_type, resource_id)
);

-- Enable RLS
ALTER TABLE training_module_resources ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "training_module_resources_select"
ON training_module_resources FOR SELECT
USING (true);

CREATE POLICY "training_module_resources_insert"
ON training_module_resources FOR INSERT
WITH CHECK (true);

CREATE POLICY "training_module_resources_update"
ON training_module_resources FOR UPDATE
USING (true);

CREATE POLICY "training_module_resources_delete"
ON training_module_resources FOR DELETE
USING (true);

-- ============================================================================
-- 5. Create content_templates table for pre-built templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('safety', 'policy', 'skill', 'onboarding', 'custom')),
    template_structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_content_templates_select"
ON training_content_templates FOR SELECT
USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('regional_admin', 'regional_hr')
));

-- ============================================================================
-- 6. Add inline_quiz content block type
-- ============================================================================

DO $$ 
BEGIN
    -- Add 'inline_quiz' to content_block_type enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'inline_quiz' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'inline_quiz';
    END IF;
    
    -- Add 'sop_reference' to content_block_type enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'sop_reference' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'sop_reference';
    END IF;
    
    -- Add 'ai_generated' to content_block_type enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ai_generated' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_block_type')
    ) THEN
        ALTER TYPE content_block_type ADD VALUE 'ai_generated';
    END IF;
END $$;

-- ============================================================================
-- 7. Insert default content templates
-- ============================================================================

INSERT INTO training_content_templates (name, description, category, template_structure) VALUES 
(
    'Safety Procedure',
    'Standard template for safety training with objectives, steps, warnings, and assessment',
    'safety',
    '{
        "sections": [
            {"type": "text", "title": "Learning Objectives", "description": "What you will learn"},
            {"type": "text", "title": "Procedure Steps", "description": "Step-by-step instructions"},
            {"type": "text", "title": "Safety Warnings", "description": "Important safety information"},
            {"type": "inline_quiz", "title": "Knowledge Check", "description": "Test your understanding"}
        ]
    }'::jsonb
),
(
    'Policy Overview',
    'Template for policy training with summary, details, FAQ, and assessment',
    'policy',
    '{
        "sections": [
            {"type": "text", "title": "Policy Summary", "description": "Brief overview"},
            {"type": "text", "title": "Detailed Policy", "description": "Full policy text"},
            {"type": "text", "title": "FAQ", "description": "Common questions"},
            {"type": "inline_quiz", "title": "Policy Assessment", "description": "Verify understanding"}
        ]
    }'::jsonb
),
(
    'Skill Training',
    'Template for hands-on skill training with introduction, demonstration, practice, and certification',
    'skill',
    '{
        "sections": [
            {"type": "text", "title": "Introduction", "description": "Skill overview"},
            {"type": "video", "title": "Demonstration", "description": "Watch how it is done"},
            {"type": "text", "title": "Practice Guide", "description": "Hands-on practice steps"},
            {"type": "inline_quiz", "title": "Certification Quiz", "description": "Get certified"}
        ]
    }'::jsonb
),
(
    'Onboarding Module',
    'Template for new employee onboarding with welcome, essentials, resources, and quiz',
    'onboarding',
    '{
        "sections": [
            {"type": "text", "title": "Welcome", "description": "Welcome message"},
            {"type": "text", "title": "Essentials", "description": "Must-know information"},
            {"type": "sop_reference", "title": "Key Documents", "description": "Important policies"},
            {"type": "inline_quiz", "title": "Quick Check", "description": "Confirm understanding"}
        ]
    }'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Create utility function to get related resources for a training module
-- ============================================================================

CREATE OR REPLACE FUNCTION get_training_module_related_resources(p_module_id UUID)
RETURNS TABLE (
    resource_type TEXT,
    resource_id UUID,
    title TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Get linked documents
    SELECT 
        'document'::TEXT,
        d.id,
        d.title,
        d.description
    FROM documents d
    WHERE d.id IN (
        SELECT DISTINCT source_document_id FROM training_content_blocks 
        WHERE training_module_id = p_module_id AND source_document_id IS NOT NULL
    )
    UNION ALL
    -- Get linked quizzes
    SELECT 
        'quiz'::TEXT,
        lq.id,
        lq.title,
        lq.description
    FROM learning_quizzes lq
    WHERE lq.training_module_id = p_module_id
    UNION ALL
    -- Get linked questions
    SELECT 
        'question'::TEXT,
        kq.id,
        kq.question_text,
        kq.explanation
    FROM knowledge_questions kq
    WHERE kq.training_module_id = p_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
