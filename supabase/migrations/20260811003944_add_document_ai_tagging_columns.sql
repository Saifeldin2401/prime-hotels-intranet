-- =============================================================================
-- Add the AI auto-tagging columns the app already reads but never had
-- =============================================================================
-- The `ai-document-tagger` edge function writes ai_tags / ai_category /
-- ai_summary / ai_processed_at onto public.documents, and the frontend reads
-- them (src/lib/types/documents.ts, DocumentPicker.tsx, KnowledgeEditor.tsx).
-- None of those four columns actually existed on public.documents, so the
-- edge function would have failed with PGRST204 had it ever been invoked.
-- =============================================================================

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS ai_tags text[],
    ADD COLUMN IF NOT EXISTS ai_category text,
    ADD COLUMN IF NOT EXISTS ai_summary text,
    ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;

COMMENT ON COLUMN public.documents.ai_tags IS 'Keyword tags derived by the ai-document-tagger edge function. Advisory metadata only - not an access control input.';
COMMENT ON COLUMN public.documents.ai_category IS 'Single best-guess category derived by the ai-document-tagger edge function.';
COMMENT ON COLUMN public.documents.ai_summary IS 'Short auto-generated summary derived by the ai-document-tagger edge function.';
COMMENT ON COLUMN public.documents.ai_processed_at IS 'When ai-document-tagger last processed this document. NULL = never tagged.';
