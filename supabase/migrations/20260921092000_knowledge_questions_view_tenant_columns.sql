-- The question library filters knowledge_questions by organization_id / is_master_template
-- (src/services/question/core.ts), but the view never exposed those columns, so every
-- tenant-scoped query failed with "column does not exist". Append them (CREATE OR REPLACE
-- VIEW may only add columns at the end). security_invoker keeps RLS evaluated per caller.
CREATE OR REPLACE VIEW public.knowledge_questions
WITH (security_invoker = true) AS
SELECT id,
    question_text,
    question_text_ar,
    question_type,
    difficulty AS difficulty_level,
    correct_answer,
    explanation,
    explanation_ar,
    hint,
    hint_ar,
    linked_sop_id,
    linked_sop_section,
    NULL::uuid AS category_id,
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
    accepted_answers,
    organization_id,
    is_master_template
FROM public.unified_questions
WHERE source_domain = 'knowledge'::text;
