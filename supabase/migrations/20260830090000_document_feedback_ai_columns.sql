-- ============================================================================
-- document_feedback — AI analysis columns
-- ----------------------------------------------------------------------------
-- The auto-analyze-feedback edge function reads/writes these columns, but the
-- migration that added them (migrations/archive/*_extend_document_feedback_ai)
-- was never applied to the live project — so every invocation errored on the
-- first scoped SELECT and returned 403. This re-adds them (idempotent).
-- ============================================================================

ALTER TABLE public.document_feedback
  ADD COLUMN IF NOT EXISTS ai_analysis_status  TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_sentiment         TEXT,
  ADD COLUMN IF NOT EXISTS ai_themes            TEXT[],
  ADD COLUMN IF NOT EXISTS ai_actionable_item   TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at       TIMESTAMPTZ;

-- Fast lookup of the work queue (rows still awaiting analysis).
CREATE INDEX IF NOT EXISTS document_feedback_ai_pending_idx
  ON public.document_feedback (ai_analysis_status)
  WHERE ai_analysis_status IS DISTINCT FROM 'completed';
