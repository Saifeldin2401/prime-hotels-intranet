-- SOPs are inherently sequences (fire evacuation steps, check-in procedure) and hospitality
-- has natural matching pairs (allergen -> dish, chemical -> surface) that the question bank
-- couldn't test before (only mcq/mcq_multi/true_false/fill_blank/scenario existed).
--
-- ordering: correct answer is unified_question_options sorted by display_order (no new column).
-- matching: each option row is one pair -- option_text is the left/prompt item, the new
-- match_value column is the right/answer item the learner must pair it with.

ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'ordering';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'matching';
