-- Phase 2c (rebuild, 2026-09-25): course lessons get their own table.
--
-- Lesson blocks were rows in `documents` (content_type = 'training_block'),
-- sharing a table - and its RLS, search, versioning and notification triggers -
-- with knowledge articles. That overlap caused the 2026-09-01 cross-tenant
-- leak, and with no foreign key to the course, deleting a course left its
-- blocks behind: 152 of 454 block rows pointed at courses that no longer exist.
--
-- * public.lessons: one row per lesson block, FK to courses (ON DELETE CASCADE).
--   Column names match the old block columns (training_module_id, block_type,
--   block_order, ...) so the player/builder contract is unchanged; ids are kept,
--   so lesson_progress.block_id and submission block ids stay valid.
-- * RLS: a lesson is readable exactly when its course is readable; writes need
--   the same rule as editing the course (_can_edit_training_module).
-- * training_content_blocks_v / training_module_documents_v are redefined over
--   lessons with identical columns, so the functions built on them keep working.
-- * All 454 old rows are archived; the 302 with a live course are migrated; the
--   old rows are deleted and documents can no longer hold lesson blocks.

CREATE TABLE public.lessons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_module_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title              text NOT NULL DEFAULT '',
  block_type         text NOT NULL,
  block_order        integer NOT NULL DEFAULT 0,
  content            text,
  content_ar         text,
  content_url        text,
  content_data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_mandatory       boolean NOT NULL DEFAULT true,
  points             integer,
  passing_score      integer,
  duration_seconds   integer,
  ai_generated       boolean NOT NULL DEFAULT false,
  ai_source_content  text,
  source_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  master_source_id   uuid,
  is_deleted         boolean NOT NULL DEFAULT false,
  created_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- Same set as the builder's ContentType (BuilderCanvas.tsx), which the AI
  -- course engine also clamps to.
  CONSTRAINT lessons_block_type_check CHECK (block_type IN
    ('text', 'image', 'video', 'document_link', 'audio', 'quiz', 'interactive',
     'sop_reference', 'assignment', 'practical', 'roleplay'))
);

COMMENT ON TABLE public.lessons IS 'Lesson blocks of a course (was documents.content_type = training_block until 2026-09-25).';

CREATE INDEX idx_lessons_course_order ON public.lessons (training_module_id, block_order);
CREATE INDEX idx_lessons_organization_id ON public.lessons (organization_id);

CREATE TRIGGER trg_set_org BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_training_child_org('training_module_id', 'courses');
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select ON public.lessons FOR SELECT TO authenticated
  USING (public.org_visible(organization_id)
         AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = training_module_id));
CREATE POLICY lessons_insert ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public._can_edit_training_module(training_module_id));
CREATE POLICY lessons_update ON public.lessons FOR UPDATE TO authenticated
  USING (public._can_edit_training_module(training_module_id))
  WITH CHECK (public._can_edit_training_module(training_module_id));
CREATE POLICY lessons_delete ON public.lessons FOR DELETE TO authenticated
  USING (public._can_edit_training_module(training_module_id));

REVOKE ALL ON public.lessons FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;

-- Archive every old block row, then migrate the ones whose course exists.
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE archive.documents_training_blocks_20260925 AS
  SELECT * FROM public.documents WHERE content_type = 'training_block';

INSERT INTO public.lessons (
  id, organization_id, training_module_id, title, block_type, block_order, content, content_ar,
  content_url, content_data, is_mandatory, points, passing_score, duration_seconds, ai_generated,
  ai_source_content, source_document_id, master_source_id, is_deleted, created_by, created_at, updated_at
)
SELECT d.id, d.organization_id, d.training_module_id, COALESCE(d.title, ''), d.block_type,
       COALESCE(d.block_order, 0), d.content, d.content_ar, d.content_url, COALESCE(d.content_data, '{}'::jsonb),
       COALESCE(d.is_mandatory, true), d.points, d.passing_score, d.duration_seconds, COALESCE(d.ai_generated, false),
       d.ai_source_content, d.linked_training_id, d.master_source_id, COALESCE(d.is_deleted, false),
       d.created_by, COALESCE(d.created_at, now()), COALESCE(d.updated_at, d.created_at, now())
  FROM public.documents d
 WHERE d.content_type = 'training_block'
   AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = d.training_module_id);

-- Visual assets attached to a lesson block now reference lessons.
ALTER TABLE public.course_visual_assets DROP CONSTRAINT IF EXISTS course_visual_assets_content_block_id_fkey;
ALTER TABLE public.course_visual_assets
  ADD CONSTRAINT course_visual_assets_content_block_id_fkey
  FOREIGN KEY (content_block_id) REFERENCES public.lessons(id) ON DELETE SET NULL;

-- Views over lessons, same columns as before.
CREATE OR REPLACE VIEW public.training_content_blocks_v WITH (security_invoker = true) AS
SELECT id,
       training_module_id,
       block_type AS type,
       COALESCE(content, ''::text) AS content,
       block_order AS "order",
       created_at,
       content_url,
       content_data,
       is_mandatory,
       is_deleted,
       source_document_id,
       ai_generated,
       ai_source_content,
       title,
       duration_seconds,
       COALESCE(points, 0) AS points
  FROM public.lessons;

CREATE OR REPLACE VIEW public.training_module_documents_v WITH (security_invoker = true) AS
SELECT id, training_module_id, id AS document_id, is_mandatory AS is_required,
       created_at, updated_at
  FROM public.lessons
UNION ALL
SELECT id, training_module_id, id AS document_id, COALESCE(is_mandatory, true) AS is_required,
       created_at, COALESCE(updated_at, created_at) AS updated_at
  FROM public.documents
 WHERE content_type = 'training_resource';

DELETE FROM public.documents WHERE content_type = 'training_block';
ALTER TABLE public.documents
  ADD CONSTRAINT documents_no_lesson_blocks CHECK (content_type IS DISTINCT FROM 'training_block');

-- Functions that read or wrote lesson blocks in documents.
CREATE OR REPLACE FUNCTION public.duplicate_training_module(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_new_module_id uuid;
    v_source public.courses%ROWTYPE;
BEGIN
    IF NOT public._can_edit_training_module(p_module_id) THEN
        RAISE EXCEPTION 'Not authorized to duplicate this module';
    END IF;

    SELECT * INTO v_source FROM public.courses WHERE id = p_module_id;
    IF v_source.id IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.courses (
        organization_id, title, description, estimated_duration_minutes, property_id, department_id,
        validity_period_days, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language,
        template_id, passing_score_percentage, status, category, difficulty_level,
        certificate_enabled, created_by
    )
    VALUES (
        v_source.organization_id, v_source.title || ' (Copy)', v_source.description, v_source.estimated_duration_minutes,
        v_source.property_id, v_source.department_id, v_source.validity_period_days,
        v_source.allow_retake, v_source.max_attempts, v_source.auto_advance, v_source.show_feedback,
        v_source.randomize_questions, v_source.show_answers, v_source.time_limit_minutes,
        v_source.audience, v_source.content_language, v_source.template_id,
        v_source.passing_score_percentage, 'draft', v_source.category, v_source.difficulty_level,
        v_source.certificate_enabled, auth.uid()
    )
    RETURNING id INTO v_new_module_id;

    INSERT INTO public.lessons (
        organization_id, training_module_id, title, block_type, block_order, content, content_ar,
        content_url, content_data, is_mandatory, points, passing_score, duration_seconds,
        ai_generated, ai_source_content, source_document_id, created_by
    )
    SELECT
        v_source.organization_id, v_new_module_id, l.title, l.block_type, l.block_order, l.content, l.content_ar,
        l.content_url, l.content_data, l.is_mandatory, l.points, l.passing_score, l.duration_seconds,
        l.ai_generated, l.ai_source_content, l.source_document_id, auth.uid()
      FROM public.lessons l
     WHERE l.training_module_id = p_module_id
       AND NOT l.is_deleted;

    RETURN v_new_module_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_training_module_related_resources(p_module_id uuid)
 RETURNS TABLE(resource_type text, resource_id uuid, title text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 'document', d.id, d.title, d.description
      FROM documents d
      WHERE d.id IN (
        SELECT DISTINCT l.source_document_id
        FROM lessons l
        WHERE l.training_module_id = p_module_id
          AND l.source_document_id IS NOT NULL
      )
    UNION ALL
    SELECT 'quiz', lq.id, lq.title, lq.description
      FROM quizzes lq WHERE lq.training_module_id = p_module_id
    UNION ALL
    SELECT 'question', kq.id, kq.question_text, kq.explanation
      FROM knowledge_questions kq WHERE kq.training_module_id = p_module_id;
END;
$function$;

DO $$
DECLARE
  v_def text := pg_get_functiondef('public.deploy_master_content(uuid,text,uuid)'::regprocedure);
BEGIN
  v_def := replace(v_def,
$old$        FROM public.documents d
        JOIN public.quizzes q ON q.id = public._safe_uuid(d.content_data ->> 'quiz_id')
       WHERE d.content_type = 'training_block' AND d.training_module_id = p_master_id
         AND d.block_type = 'quiz' AND NOT COALESCE(d.is_deleted, false)$old$,
$new$        FROM public.lessons d
        JOIN public.quizzes q ON q.id = public._safe_uuid(d.content_data ->> 'quiz_id')
       WHERE d.training_module_id = p_master_id
         AND d.block_type = 'quiz' AND NOT d.is_deleted$new$);
  v_def := replace(v_def,
$old$    INSERT INTO public.documents (
      id, training_module_id, content_type, block_type, block_order, title, content, content_ar, content_url,
      content_data, is_mandatory, duration_seconds, points, organization_id, scope_type, is_master_template,
      master_source_id, created_by, created_at, updated_at, is_deleted
    )
    SELECT
      gen_random_uuid(), v_new_id, 'training_block', block_type, block_order, title, content, content_ar, content_url,
      CASE WHEN block_type = 'quiz' AND v_quiz_map ? (content_data ->> 'quiz_id')
           THEN jsonb_set(content_data, '{quiz_id}', to_jsonb(v_quiz_map ->> (content_data ->> 'quiz_id')))
           ELSE content_data END,
      is_mandatory, duration_seconds, points, p_org_id, 'organization', false,
      id, auth.uid(), now(), now(), false
    FROM public.documents
    WHERE content_type = 'training_block' AND training_module_id = p_master_id AND COALESCE(is_deleted, false) = false;$old$,
$new$    INSERT INTO public.lessons (
      id, training_module_id, block_type, block_order, title, content, content_ar, content_url,
      content_data, is_mandatory, duration_seconds, points, organization_id,
      master_source_id, created_by, created_at, updated_at, is_deleted
    )
    SELECT
      gen_random_uuid(), v_new_id, block_type, block_order, title, content, content_ar, content_url,
      CASE WHEN block_type = 'quiz' AND v_quiz_map ? (content_data ->> 'quiz_id')
           THEN jsonb_set(content_data, '{quiz_id}', to_jsonb(v_quiz_map ->> (content_data ->> 'quiz_id')))
           ELSE content_data END,
      is_mandatory, duration_seconds, points, p_org_id,
      id, auth.uid(), now(), now(), false
    FROM public.lessons
    WHERE training_module_id = p_master_id AND NOT is_deleted;$new$);
  IF v_def ~ 'training_block' THEN
    RAISE EXCEPTION 'deploy_master_content still references training_block after rewrite';
  END IF;
  EXECUTE v_def;
END $$;
