ALTER TABLE public.document_feedback
  ADD COLUMN IF NOT EXISTS ai_analysis_status  TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_sentiment         TEXT,
  ADD COLUMN IF NOT EXISTS ai_themes            TEXT[],
  ADD COLUMN IF NOT EXISTS ai_actionable_item   TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS document_feedback_ai_pending_idx
  ON public.document_feedback (ai_analysis_status)
  WHERE ai_analysis_status IS DISTINCT FROM 'completed';
