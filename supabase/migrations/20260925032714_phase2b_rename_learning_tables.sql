-- Phase 2b (rebuild, 2026-09-25): one vocabulary for the learning domain.
--
--   training_modules          -> courses
--   training_module_versions  -> course_versions
--   learning_quizzes          -> quizzes
--   training_assignment_rules -> assignments
--   training_block_progress   -> lesson_progress
--
-- (docs/product/PRODUCT_DEFINITION.md, decision 3.) Postgres carries foreign
-- keys, indexes, policies, views, grants and the realtime publication across a
-- rename. What it does not carry is text: function bodies and trigger
-- arguments that name the tables. Both are rewritten below. Column names
-- (training_module_id, ...) and RPC names are unchanged in this step.

ALTER TABLE public.training_modules          RENAME TO courses;
ALTER TABLE public.training_module_versions  RENAME TO course_versions;
ALTER TABLE public.learning_quizzes          RENAME TO quizzes;
ALTER TABLE public.training_assignment_rules RENAME TO assignments;
ALTER TABLE public.training_block_progress   RENAME TO lesson_progress;

CREATE OR REPLACE FUNCTION pg_temp.rename_learning_tables(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(p_text,
    '\mtraining_module_versions\M', 'course_versions', 'g'),
    '\mtraining_modules\M', 'courses', 'g'),
    '\mlearning_quizzes\M', 'quizzes', 'g'),
    '\mtraining_assignment_rules\M', 'assignments', 'g'),
    '\mtraining_block_progress\M', 'lesson_progress', 'g');
$$;

-- Function bodies (CREATE OR REPLACE keeps owner, grants and SECURITY DEFINER).
DO $$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT p.oid
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind IN ('f', 'p')
       AND pg_get_functiondef(p.oid) ~ '\m(training_modules|training_module_versions|learning_quizzes|training_assignment_rules|training_block_progress)\M'
  LOOP
    v_def := pg_temp.rename_learning_tables(pg_get_functiondef(r.oid));
    EXECUTE v_def;
  END LOOP;
END $$;

-- Trigger arguments that name a parent table (organization fill triggers).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT t.oid, t.tgname, c.oid AS relid, pg_get_triggerdef(t.oid) AS def
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND NOT t.tgisinternal
       AND pg_get_triggerdef(t.oid) ~ '''[^'']*\m(training_modules|training_module_versions|learning_quizzes|training_assignment_rules|training_block_progress)\M'
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %s', r.tgname, r.relid::regclass);
    EXECUTE pg_temp.rename_learning_tables(r.def);
  END LOOP;
END $$;
