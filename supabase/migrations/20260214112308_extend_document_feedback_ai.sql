-- Extend document_feedback to support AI analysis (used by auto-analyze-feedback edge function).

alter table public.document_feedback
  add column if not exists ai_analysis_status text default 'pending',
  add column if not exists ai_sentiment text,
  add column if not exists ai_themes text[],
  add column if not exists ai_actionable_item text,
  add column if not exists ai_analyzed_at timestamptz;
;
