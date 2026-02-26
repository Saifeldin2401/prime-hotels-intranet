-- Add missing columns to sop_documents for full content type support
ALTER TABLE sop_documents
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS linked_quiz_id UUID REFERENCES learning_quizzes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_training_id UUID REFERENCES training_modules(id) ON DELETE SET NULL;

-- Create related articles table for cross-linking
CREATE TABLE IF NOT EXISTS knowledge_related_articles (
    document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    related_document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL DEFAULT 'see_also' CHECK (relation_type IN ('see_also', 'prerequisite', 'supersedes', 'updated_by')),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (document_id, related_document_id),
    CHECK (document_id != related_document_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_related_articles_document ON knowledge_related_articles(document_id);
CREATE INDEX IF NOT EXISTS idx_related_articles_related ON knowledge_related_articles(related_document_id);

-- Enable RLS
ALTER TABLE knowledge_related_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read related articles
CREATE POLICY "Anyone can view related articles"
ON knowledge_related_articles FOR SELECT
USING (true);

-- RLS Policy: Only admins and authors can manage related articles
CREATE POLICY "Admins can manage related articles"
ON knowledge_related_articles FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager')
    )
);

-- Add comment for documentation
COMMENT ON TABLE knowledge_related_articles IS 'Links between related knowledge base articles for cross-referencing';
COMMENT ON COLUMN sop_documents.video_url IS 'URL for video content type';
COMMENT ON COLUMN sop_documents.checklist_items IS 'JSON array of checklist items for interactive checklists';
COMMENT ON COLUMN sop_documents.faq_items IS 'JSON array of FAQ Q&A pairs';;
