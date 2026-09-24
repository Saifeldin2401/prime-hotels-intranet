-- ============================================================================
-- APPLY ON STAGING FIRST  --  DATA BACKFILL, NOT A SCHEMA MIGRATION
-- ----------------------------------------------------------------------------
-- This file is NOT picked up by `supabase db push` / the migration runner. It
-- lives in supabase/migrations/data/ on purpose. Run it by hand, once, AFTER
-- migrations 20260901080001..20260901080006 are applied:
--
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/data/backfill_learning_domain.sql
--
-- It moves the (small) live data set into the new learning domain model:
--
--     training_modules (non-deleted)          -> courses
--     documents (content_type='training_block')-> course_modules + lessons + lesson_blocks
--     learning_quizzes (non-deleted)          -> assessments (+ assessment_questions)
--     training_progress (non-deleted)         -> enrollments + lesson_progress + learning_events
--     training_modules.blueprint.*Objectives  -> learning_objectives
--
-- Everything runs inside ONE transaction and every step is guarded so re-running
-- is a no-op (provenance columns + ON CONFLICT). Row-count assertions at the end
-- ROLL BACK the whole thing if the shapes drifted from what was measured
-- (2026-09-01): 7 courses, 24 KB docs, 20 quizzes, ~11 resolvable progress rows.
--
-- Legacy tables are NOT touched or dropped here. Retirement is a later step
-- (see docs/domain-model-migration.md, "Cutover plan").
-- ============================================================================

BEGIN;

-- Fail fast if the target schema is not in place.
DO $$
BEGIN
  IF to_regclass('public.courses') IS NULL
     OR to_regclass('public.lesson_blocks') IS NULL
     OR to_regclass('public.assessments') IS NULL
     OR to_regclass('public.enrollments') IS NULL
     OR to_regclass('public.learning_objectives') IS NULL THEN
    RAISE EXCEPTION 'Learning-domain migrations 20260901080001..6 must be applied before this backfill.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. courses  <-  training_modules (not deleted)
--     provenance: courses.source_training_module_id  (UNIQUE)  -> idempotent
-- ---------------------------------------------------------------------------
INSERT INTO public.courses (
  title, description, status, difficulty_level, category, content_language,
  estimated_duration_minutes, passing_score_percentage, certificate_enabled,
  allow_retake, max_attempts, department_id, property_id, blueprint,
  quality_score, source_training_module_id, created_by, updated_by,
  created_at, updated_at, is_deleted
)
SELECT
  tm.title,
  tm.description,
  CASE lower(coalesce(tm.status,'draft'))
    WHEN 'published' THEN 'published'
    WHEN 'archived'  THEN 'archived'
    WHEN 'in_review' THEN 'in_review'
    WHEN 'review'    THEN 'in_review'
    ELSE 'draft'
  END,
  coalesce(tm.difficulty_level, 'beginner'),
  tm.category,
  tm.content_language,
  tm.estimated_duration_minutes,
  coalesce(tm.passing_score_percentage, 80),
  coalesce(tm.certificate_enabled, true),
  coalesce(tm.allow_retake, true),
  tm.max_attempts,
  tm.department_id,
  tm.property_id,
  tm.blueprint,
  tm.quality_score,
  tm.id,
  tm.created_by,
  tm.updated_by,
  coalesce(tm.created_at, now()),
  coalesce(tm.updated_at, now()),
  false
FROM public.training_modules tm
WHERE tm.is_deleted = false
ON CONFLICT (source_training_module_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. course_modules  <-  distinct sections inside the training_block documents
--     Builder rows carry content_data.section_id / section_title / section_order.
--     Docs with no section become one synthetic "Course Content" section.
--     provenance key: (course_id, legacy_section_key)
-- ---------------------------------------------------------------------------
WITH tb AS (
  SELECT
    d.*,
    c.id AS course_id,
    coalesce(d.content_data->>'section_id', '__default__')            AS section_key,
    coalesce(NULLIF(d.content_data->>'section_title',''), 'Course Content') AS section_title,
    coalesce((d.content_data->>'section_order')::int, 0)              AS section_order,
    NULLIF(d.content_data->>'section_description','')                 AS section_description
  FROM public.documents d
  JOIN public.courses c ON c.source_training_module_id = d.training_module_id
  WHERE d.content_type = 'training_block'
)
INSERT INTO public.course_modules (course_id, title, description, position, legacy_section_key)
SELECT DISTINCT ON (course_id, section_key)
  course_id, section_title, section_description, section_order, section_key
FROM tb
ORDER BY course_id, section_key, section_order
ON CONFLICT (course_id, legacy_section_key) WHERE legacy_section_key IS NOT NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. lessons  <-  one lesson per course_module (the Builder has no lesson layer
--     between section and block; this preserves ordering losslessly).
--     provenance key: (course_module_id, legacy_lesson_key='__section__')
-- ---------------------------------------------------------------------------
INSERT INTO public.lessons (course_module_id, title, summary, position, is_mandatory, legacy_lesson_key)
SELECT cm.id, cm.title, cm.description, 0, true, '__section__'
FROM public.course_modules cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.lessons l
  WHERE l.course_module_id = cm.id AND l.legacy_lesson_key = '__section__'
);

-- ---------------------------------------------------------------------------
-- 4. lesson_blocks  <-  one per training_block document row
--     provenance: lesson_blocks.source_document_id  (UNIQUE)  -> idempotent
-- ---------------------------------------------------------------------------
WITH tb AS (
  SELECT
    d.id, d.title, d.content, d.content_ar, d.content_url, d.block_type,
    d.block_order, d.duration_seconds, d.is_mandatory, d.points, d.content_data,
    c.id AS course_id,
    coalesce(d.content_data->>'section_id', '__default__') AS section_key
  FROM public.documents d
  JOIN public.courses c ON c.source_training_module_id = d.training_module_id
  WHERE d.content_type = 'training_block'
)
INSERT INTO public.lesson_blocks (
  lesson_id, block_type, position, title, payload, is_mandatory,
  duration_seconds, points, source_document_id
)
SELECT
  l.id,
  (CASE tb.block_type
     WHEN 'text'          THEN 'text'
     WHEN 'image'         THEN 'image'
     WHEN 'video'         THEN 'video'
     WHEN 'document_link' THEN 'embed'
     WHEN 'sop_reference' THEN 'embed'
     WHEN 'quiz'          THEN 'knowledge_check'
     WHEN 'audio'         THEN 'activity'
     WHEN 'interactive'   THEN 'activity'
     WHEN 'practical'     THEN 'activity'
     WHEN 'roleplay'      THEN 'activity'
     WHEN 'assignment'    THEN 'activity'
     ELSE 'text'
   END)::public.lesson_block_type,
  coalesce(tb.block_order, 0),
  tb.title,
  jsonb_strip_nulls(jsonb_build_object(
    'html',         tb.content,
    'html_ar',      tb.content_ar,
    'url',          tb.content_url,
    'legacy_block_type', tb.block_type,
    'quiz_id',      tb.content_data->>'quiz_id',
    'sop_id',       coalesce(tb.content_data->>'sop_id', tb.content_data->>'source_document_id'),
    'question_ids', tb.content_data->'question_ids',
    'component',    tb.content_data->>'component',
    'section_description', tb.content_data->>'section_description'
  )),
  coalesce(tb.is_mandatory, false),
  tb.duration_seconds,
  coalesce(tb.points, 0),
  tb.id
FROM tb
JOIN public.course_modules cm ON cm.course_id = tb.course_id AND cm.legacy_section_key = tb.section_key
JOIN public.lessons l ON l.course_module_id = cm.id AND l.legacy_lesson_key = '__section__'
ON CONFLICT (source_document_id) WHERE source_document_id IS NOT NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. assessments  <-  learning_quizzes (not deleted)
--     placement: 'course' when the quiz resolves to a migrated course via
--     training_module_id; otherwise 'certification' (ref-less) so the CHECK
--     passes and the row is still visible for manual re-placement.
--     provenance: assessments.source_quiz_id  (UNIQUE)  -> idempotent
-- ---------------------------------------------------------------------------
INSERT INTO public.assessments (
  title, description, assessment_type, placement, placement_ref_id,
  time_limit_minutes, max_attempts, passing_score, randomization, show_feedback,
  status, source_quiz_id, created_by, created_at, updated_at, is_deleted
)
SELECT
  lq.title,
  lq.description,
  'summative'::public.assessment_type,
  CASE WHEN c.id IS NOT NULL THEN 'course' ELSE 'certification' END::public.assessment_placement,
  c.id,
  lq.time_limit_minutes,
  lq.max_attempts,
  coalesce(lq.passing_score_percentage, 70),
  jsonb_build_object('questions', coalesce(lq.randomize_questions,false),
                     'options',   coalesce(lq.randomize_answers,false)),
  coalesce(lq.show_feedback_during, true),
  CASE lower(coalesce(lq.status::text,'draft'))
    WHEN 'published' THEN 'published'
    WHEN 'archived'  THEN 'archived'
    WHEN 'pending_review' THEN 'pending_review'
    ELSE 'draft'
  END,
  lq.id,
  lq.created_by,
  coalesce(lq.created_at, now()),
  coalesce(lq.updated_at, now()),
  false
FROM public.learning_quizzes lq
LEFT JOIN public.courses c ON c.source_training_module_id = lq.training_module_id
WHERE coalesce(lq.is_deleted, false) = false
ON CONFLICT (source_quiz_id) DO NOTHING;

-- 5b. assessment_questions  <-  unified_quiz_questions for the migrated quizzes
INSERT INTO public.assessment_questions (assessment_id, question_id, display_order, points_override, is_required)
SELECT a.id, uqq.question_id, coalesce(uqq.display_order, 0), uqq.points_override, true
FROM public.unified_quiz_questions uqq
JOIN public.assessments a ON a.source_quiz_id = uqq.quiz_id
JOIN public.unified_questions q ON q.id = uqq.question_id      -- drop dangling refs
ON CONFLICT (assessment_id, question_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. enrollments  <-  training_progress (not deleted) whose training_id
--     resolves to a migrated course.
--     provenance: enrollments.source_training_progress_id (UNIQUE)
-- ---------------------------------------------------------------------------
INSERT INTO public.enrollments (
  user_id, course_id, assignment_id, status, progress_percentage,
  score_percentage, passed, certificate_url, enrolled_at, started_at,
  completed_at, acknowledged_at, last_activity_at, metadata,
  source_training_progress_id, created_at, updated_at, is_deleted
)
SELECT
  tp.user_id,
  c.id,
  tp.assignment_id,
  tp.status::text::public.enrollment_status,
  coalesce(tp.progress_percentage, 0),
  tp.score_percentage,
  tp.passed,
  tp.certificate_url,
  coalesce(tp.created_at, now()),
  tp.started_at,
  tp.completed_at,
  tp.acknowledged_at,
  coalesce(tp.last_activity_at, tp.last_accessed_at, now()),
  tp.metadata,
  tp.id,
  coalesce(tp.created_at, now()),
  coalesce(tp.updated_at, now()),
  false
FROM public.training_progress tp
JOIN public.courses c ON c.source_training_module_id = tp.training_id
WHERE coalesce(tp.is_deleted, false) = false
ON CONFLICT (user_id, course_id) DO NOTHING;

-- 6b. lesson_progress  <-  ONE summary row per enrollment, pinned to the first
--     lesson of the course. Legacy training_progress had no per-lesson
--     granularity; per-lesson state starts accruing post-cutover.
INSERT INTO public.lesson_progress (
  enrollment_id, lesson_id, status, progress_percentage, time_spent_seconds,
  started_at, completed_at, last_activity_at
)
SELECT
  e.id,
  first_lesson.lesson_id,
  e.status,
  e.progress_percentage,
  coalesce(tp.time_spent_seconds, 0),
  e.started_at,
  e.completed_at,
  e.last_activity_at
FROM public.enrollments e
JOIN public.training_progress tp ON tp.id = e.source_training_progress_id
JOIN LATERAL (
  SELECT l.id AS lesson_id
  FROM public.lessons l
  JOIN public.course_modules cm ON cm.id = l.course_module_id
  WHERE cm.course_id = e.course_id
  ORDER BY cm.position, l.position
  LIMIT 1
) first_lesson ON true
ON CONFLICT (enrollment_id, lesson_id) DO NOTHING;

-- 6c. learning_events  <-  one migration-snapshot event per training_progress
--     row, carrying the session / cursor / metadata that used to be mutated
--     in place on training_progress.
INSERT INTO public.learning_events (
  user_id, enrollment_id, course_id, event_type, session_id, payload, occurred_at
)
SELECT
  e.user_id,
  e.id,
  e.course_id,
  'legacy_progress_snapshot',
  tp.last_session_id,
  jsonb_strip_nulls(jsonb_build_object(
    'last_block_id',      tp.last_block_id,
    'last_block_index',   tp.last_block_index,
    'time_spent_seconds', tp.time_spent_seconds,
    'quiz_score',         tp.quiz_score,
    'lp_content_type',    tp.lp_content_type,
    'metadata',           tp.metadata
  )),
  coalesce(tp.last_activity_at, tp.updated_at, now())
FROM public.enrollments e
JOIN public.training_progress tp ON tp.id = e.source_training_progress_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_events le
  WHERE le.enrollment_id = e.id AND le.event_type = 'legacy_progress_snapshot'
);

-- ---------------------------------------------------------------------------
-- 7. learning_objectives  <-  blueprint terminalObjectives / enablingObjectives
--     (arrays of strings). Keyed by (course_id, code) where code = 'T1'/'E2'...
-- ---------------------------------------------------------------------------
INSERT INTO public.learning_objectives (course_id, code, statement, kind, position, created_by)
SELECT
  c.id,
  'T' || obj.ord,
  obj.val,
  'terminal'::public.objective_kind,
  obj.ord,
  c.created_by
FROM public.courses c
CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(c.blueprint->'terminalObjectives','[]'::jsonb))
  WITH ORDINALITY AS obj(val, ord)
WHERE c.blueprint IS NOT NULL
ON CONFLICT (course_id, code) WHERE code IS NOT NULL DO NOTHING;

INSERT INTO public.learning_objectives (course_id, code, statement, kind, position, created_by)
SELECT
  c.id,
  'E' || obj.ord,
  obj.val,
  'enabling'::public.objective_kind,
  100 + obj.ord,
  c.created_by
FROM public.courses c
CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(c.blueprint->'enablingObjectives','[]'::jsonb))
  WITH ORDINALITY AS obj(val, ord)
WHERE c.blueprint IS NOT NULL
ON CONFLICT (course_id, code) WHERE code IS NOT NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- ASSERTIONS  --  any failure rolls back the whole transaction
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_src_modules   int;
  v_courses       int;
  v_src_tb        int;
  v_blocks        int;
  v_src_quiz      int;
  v_assessments   int;
  v_src_progress  int;
  v_enrollments   int;
BEGIN
  SELECT count(*) INTO v_src_modules FROM public.training_modules WHERE is_deleted = false;
  SELECT count(*) INTO v_courses     FROM public.courses WHERE source_training_module_id IS NOT NULL;
  IF v_courses <> v_src_modules THEN
    RAISE EXCEPTION 'courses backfill mismatch: % source modules -> % courses', v_src_modules, v_courses;
  END IF;

  SELECT count(*) INTO v_src_tb FROM public.documents d
    WHERE d.content_type = 'training_block'
      AND d.training_module_id IN (SELECT id FROM public.training_modules WHERE is_deleted = false);
  SELECT count(*) INTO v_blocks FROM public.lesson_blocks WHERE source_document_id IS NOT NULL;
  IF v_blocks <> v_src_tb THEN
    RAISE EXCEPTION 'lesson_blocks backfill mismatch: % source training_block docs -> % blocks', v_src_tb, v_blocks;
  END IF;

  SELECT count(*) INTO v_src_quiz    FROM public.learning_quizzes WHERE coalesce(is_deleted,false) = false;
  SELECT count(*) INTO v_assessments FROM public.assessments WHERE source_quiz_id IS NOT NULL;
  IF v_assessments <> v_src_quiz THEN
    RAISE EXCEPTION 'assessments backfill mismatch: % source quizzes -> % assessments', v_src_quiz, v_assessments;
  END IF;

  SELECT count(*) INTO v_src_progress FROM public.training_progress tp
    JOIN public.courses c ON c.source_training_module_id = tp.training_id
    WHERE coalesce(tp.is_deleted,false) = false;
  SELECT count(*) INTO v_enrollments FROM public.enrollments WHERE source_training_progress_id IS NOT NULL;
  IF v_enrollments <> v_src_progress THEN
    RAISE EXCEPTION 'enrollments backfill mismatch: % resolvable progress rows -> % enrollments', v_src_progress, v_enrollments;
  END IF;

  RAISE NOTICE 'backfill OK: % courses, % lesson_blocks, % assessments, % enrollments, % objectives',
    v_courses, v_blocks, v_assessments, v_enrollments,
    (SELECT count(*) FROM public.learning_objectives);
END $$;

COMMIT;
