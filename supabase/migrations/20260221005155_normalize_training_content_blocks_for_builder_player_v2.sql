-- Normalize legacy training content block rows for consistent builder/player behavior.
BEGIN;

-- Only affects rows if legacy enum values exist in this environment.
UPDATE public.training_content_blocks
SET type = 'quiz'::public.content_block_type
WHERE type::text = 'inline_quiz';

UPDATE public.training_content_blocks
SET type = 'text'::public.content_block_type
WHERE type::text = 'ai_generated';

UPDATE public.training_content_blocks
SET title = NULLIF(BTRIM(content), '')
WHERE (title IS NULL OR BTRIM(title) = '')
  AND type::text IN ('quiz','video','audio','image','document_link','interactive','sop_reference')
  AND content IS NOT NULL
  AND LENGTH(BTRIM(content)) <= 140;

COMMIT;

NOTIFY pgrst, 'reload schema';;
