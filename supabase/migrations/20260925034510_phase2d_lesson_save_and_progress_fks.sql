-- Phase 2d (rebuild, 2026-09-25): stable lesson ids and real progress keys.
--
-- 1. The course builder saved by deleting every lesson of the course and
--    re-inserting them from the browser, so every lesson got a new id on every
--    save. Learners' lesson_progress (keyed by block id) silently pointed at
--    nothing after any edit - found live: progress recorded at 13:15, course
--    re-saved at 13:21 - and approved practical submissions stopped matching,
--    which can block completion. The delete + insert was also not atomic.
--    -> save_course_lessons(course, lessons[]): one transaction that updates
--       lessons by id, inserts new ones and deletes only the removed ones.
-- 2. lesson_progress.block_id gets a real FK to lessons (3 orphaned rows,
--    left behind by the old save, are archived first).
-- 3. training_progress.training_id is polymorphic (course or quiz by
--    lp_content_type) with no FK. 9 rows had no type; all point at courses.
--    lp_content_type becomes NOT NULL + CHECK, and generated course_id /
--    quiz_id columns carry real FKs. ON DELETE RESTRICT: progress is
--    compliance evidence, so a course/quiz with progress is archived
--    (is_deleted), never hard-deleted.

-- ---------------------------------------------------------------------------
-- 1. Atomic lesson save
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_course_lessons(p_course_id uuid, p_lessons jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid;
  v_item jsonb;
  v_id uuid;
  v_type text;
  v_source uuid;
  v_keep uuid[] := '{}';
  v_inserted integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_order integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501', HINT = 'AUTH_REQUIRED';
  END IF;

  SELECT organization_id INTO v_org
    FROM public.courses WHERE id = p_course_id AND COALESCE(is_deleted, false) = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found' USING ERRCODE = 'P0002', HINT = 'LESSON_COURSE_NOT_FOUND';
  END IF;

  IF NOT public._can_edit_training_module(p_course_id) THEN
    RAISE EXCEPTION 'You are not allowed to edit this course' USING ERRCODE = '42501', HINT = 'LESSON_NOT_ALLOWED';
  END IF;

  IF p_lessons IS NULL OR jsonb_typeof(p_lessons) <> 'array' THEN
    RAISE EXCEPTION 'Lessons must be a list' USING ERRCODE = '22023', HINT = 'LESSON_INVALID_PAYLOAD';
  END IF;
  IF jsonb_array_length(p_lessons) > 500 THEN
    RAISE EXCEPTION 'A course can have at most 500 lessons' USING ERRCODE = '22023', HINT = 'LESSON_TOO_MANY';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_lessons) LOOP
    v_type := v_item ->> 'type';
    IF v_type IS NULL OR v_type NOT IN ('text', 'image', 'video', 'document_link', 'audio', 'quiz', 'interactive',
                                        'sop_reference', 'assignment', 'practical', 'roleplay') THEN
      RAISE EXCEPTION 'Unknown lesson type: %', COALESCE(v_type, '(none)') USING ERRCODE = '22023', HINT = 'LESSON_INVALID_TYPE';
    END IF;

    -- Only link documents the organization can actually use.
    v_source := public._safe_uuid(v_item ->> 'source_document_id');
    IF v_source IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.documents d
       WHERE d.id = v_source AND (d.organization_id = v_org OR d.is_master_template)
    ) THEN
      v_source := NULL;
    END IF;

    v_id := public._safe_uuid(v_item ->> 'id');
    IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.lessons WHERE id = v_id AND training_module_id = p_course_id) THEN
      UPDATE public.lessons SET
        title              = COALESCE(NULLIF(btrim(v_item ->> 'title'), ''), 'Content block'),
        block_type         = v_type,
        block_order        = v_order,
        content            = COALESCE(v_item ->> 'content', ''),
        content_ar         = NULLIF(v_item ->> 'content_ar', ''),
        content_url        = NULLIF(v_item ->> 'content_url', ''),
        content_data       = COALESCE(v_item -> 'content_data', '{}'::jsonb),
        is_mandatory       = COALESCE((v_item ->> 'is_mandatory')::boolean, true),
        duration_seconds   = (v_item ->> 'duration_seconds')::integer,
        points             = (v_item ->> 'points')::integer,
        source_document_id = v_source,
        is_deleted         = false
      WHERE id = v_id;
      v_updated := v_updated + 1;
    ELSE
      INSERT INTO public.lessons (
        organization_id, training_module_id, title, block_type, block_order, content, content_ar,
        content_url, content_data, is_mandatory, duration_seconds, points, source_document_id, created_by
      ) VALUES (
        v_org, p_course_id, COALESCE(NULLIF(btrim(v_item ->> 'title'), ''), 'Content block'), v_type, v_order,
        COALESCE(v_item ->> 'content', ''), NULLIF(v_item ->> 'content_ar', ''), NULLIF(v_item ->> 'content_url', ''),
        COALESCE(v_item -> 'content_data', '{}'::jsonb), COALESCE((v_item ->> 'is_mandatory')::boolean, true),
        (v_item ->> 'duration_seconds')::integer, (v_item ->> 'points')::integer, v_source, auth.uid()
      )
      RETURNING id INTO v_id;
      v_inserted := v_inserted + 1;
    END IF;

    v_keep := v_keep || v_id;
    v_order := v_order + 1;
  END LOOP;

  DELETE FROM public.lessons
   WHERE training_module_id = p_course_id AND NOT (id = ANY (v_keep));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated, 'inserted', v_inserted, 'deleted', v_deleted,
    'lesson_ids', to_jsonb(v_keep)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_course_lessons(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_course_lessons(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. lesson_progress -> lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archive.lesson_progress_orphans_20260925 AS
  SELECT * FROM public.lesson_progress lp
   WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lp.block_id);
DELETE FROM public.lesson_progress lp
 WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lp.block_id);

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_block_id_fkey
  FOREIGN KEY (block_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_block_id ON public.lesson_progress (block_id);

-- ---------------------------------------------------------------------------
-- 3. training_progress: typed, with real foreign keys
-- ---------------------------------------------------------------------------
-- Some writers (course enrolment, progress upserts) omit lp_content_type; that
-- is how the 9 untyped rows appeared. Infer it from what training_id points
-- at, before the NOT NULL check, instead of trusting every caller.
CREATE OR REPLACE FUNCTION public.validate_training_progress_training_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lp_content_type IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.courses WHERE id = NEW.training_id) THEN
      NEW.lp_content_type := 'module';
    ELSIF EXISTS (SELECT 1 FROM public.quizzes WHERE id = NEW.training_id) THEN
      NEW.lp_content_type := 'quiz';
    END IF;
  END IF;

  IF NEW.lp_content_type = 'module' THEN
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = NEW.training_id) THEN
      RAISE EXCEPTION 'training_progress.training_id % does not reference an existing course', NEW.training_id;
    END IF;
  ELSIF NEW.lp_content_type = 'quiz' THEN
    IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE id = NEW.training_id) THEN
      RAISE EXCEPTION 'training_progress.training_id % does not reference an existing quiz', NEW.training_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.training_progress tp
   SET lp_content_type = 'module'
 WHERE tp.lp_content_type IS NULL
   AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = tp.training_id);

ALTER TABLE public.training_progress ALTER COLUMN lp_content_type SET NOT NULL;
ALTER TABLE public.training_progress
  ADD CONSTRAINT training_progress_content_type_check CHECK (lp_content_type IN ('module', 'quiz'));

ALTER TABLE public.training_progress
  ADD COLUMN course_id uuid GENERATED ALWAYS AS (CASE WHEN lp_content_type = 'module' THEN training_id END) STORED
    REFERENCES public.courses(id) ON DELETE RESTRICT,
  ADD COLUMN quiz_id uuid GENERATED ALWAYS AS (CASE WHEN lp_content_type = 'quiz' THEN training_id END) STORED
    REFERENCES public.quizzes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_training_progress_course_id ON public.training_progress (course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_progress_quiz_id ON public.training_progress (quiz_id) WHERE quiz_id IS NOT NULL;
