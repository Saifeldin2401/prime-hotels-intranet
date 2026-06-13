-- Related Articles table for Unified Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_related_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL DEFAULT 'see_also', -- 'see_also', 'prerequisite', 'template'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, related_document_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_related_articles_doc ON knowledge_related_articles(document_id);

ALTER TABLE knowledge_related_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all relations" ON knowledge_related_articles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
;
