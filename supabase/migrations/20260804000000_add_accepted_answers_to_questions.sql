-- Add accepted_answers to unified_questions so fill_blank/scenario free-text
-- questions can accept multiple valid phrasings (e.g. "15 mins" vs "15 minutes")
-- instead of requiring an exact string match against correct_answer.

ALTER TABLE public.unified_questions
  ADD COLUMN IF NOT EXISTS accepted_answers text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.unified_questions.accepted_answers IS
  'Additional accepted free-text answers for fill_blank/scenario questions, '
  'matched alongside correct_answer using normalized (case/punctuation-insensitive) comparison.';

-- Propagate the new column through the knowledge_questions read-compat view.
CREATE OR REPLACE VIEW public.knowledge_questions
  WITH (security_invoker = true)
AS
SELECT
  id,
  question_text,
  question_text_ar,
  question_type,
  difficulty                  AS difficulty_level,
  correct_answer,
  explanation,
  explanation_ar,
  hint,
  hint_ar,
  linked_sop_id,
  linked_sop_section,
  NULL::uuid                  AS category_id,
  tags,
  estimated_time_seconds,
  points,
  ai_generated,
  ai_model_used,
  ai_confidence_score,
  ai_prompt_used,
  status,
  version,
  reviewed_by,
  reviewed_at,
  review_notes,
  created_by,
  created_at,
  updated_at,
  training_module_id,
  training_section_id,
  accepted_answers
FROM public.unified_questions
WHERE source_domain = 'knowledge';
