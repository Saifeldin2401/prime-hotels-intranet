-- =============================================================================
-- MIGRATION: drop_redundant_tables
-- Applied: 2026-06-14
-- Purpose: Drop 4 redundant, 0-row tables with NO frontend references.
--   designations           -> overlaps job_titles (id, title/name, department_id);
--                             job_titles has 90 rows + role mappings, designations 0.
--   notification_templates  -> duplicate of notification_email_templates (16 rows, active).
--   sop_tags                -> superseded by document_tags + document_tag_assignments
--                             after the SOP -> documents consolidation.
--   sop_categories          -> superseded by document_folders / categories.
--
-- CASCADE on sop_categories also drops the FK learning_quizzes.category_id ->
-- sop_categories (learning_quizzes is 0-row, so no data is affected; the column
-- remains, only the constraint is removed).
--
-- Rollback: restore from pre-migration snapshot. All dropped tables were 0-row,
-- so no data is lost; only the empty definitions are removed.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS public.designations           CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.sop_tags               CASCADE;
DROP TABLE IF EXISTS public.sop_categories         CASCADE;

COMMIT;
