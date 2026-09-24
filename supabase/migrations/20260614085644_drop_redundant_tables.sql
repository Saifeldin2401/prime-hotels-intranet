BEGIN;
-- All 4 are 0-row, have NO frontend references, and are superseded:
--   designations          -> overlaps job_titles
--   notification_templates -> duplicate of notification_email_templates (active)
--   sop_tags              -> replaced by document_tags + document_tag_assignments
--   sop_categories        -> replaced by document_folders / categories
-- CASCADE on sop_categories drops the FK from learning_quizzes.category_id (0-row, harmless).
DROP TABLE IF EXISTS public.designations          CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.sop_tags              CASCADE;
DROP TABLE IF EXISTS public.sop_categories        CASCADE;
COMMIT;
