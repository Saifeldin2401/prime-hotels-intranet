-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 1 of 6: COURSE STRUCTURE
--
--   courses         <- from public.training_modules (1 row per module)
--   course_modules  <- the "section" grouping the Training Builder reconstructs
--                      from documents.content_data.section (blueprintToBlocks.ts)
--   lessons         <- one per blueprint lesson (module_id + lesson_id in
--                      documents.content_data), link -> course_modules
--   lesson_blocks   <- one per documents row (content_type='training_block'),
--                      typed block + JSON payload + order, link -> lessons
--
-- The legacy tables (training_modules, documents) are LEFT IN PLACE. This
-- migration only adds the new relational shape; the data move lives in
-- supabase/migrations/data/backfill_learning_domain.sql (never auto-run).
--
-- Idempotent: safe to re-run. RLS enabled on every new table.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared helper: who may author/curate learning content.
-- SECURITY DEFINER + pinned search_path so it can be used inside RLS predicates
-- without recursion into user_roles' own policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_learning_editor(p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user
      AND (ur.role)::text = ANY (ARRAY[
        'super_admin','corporate_admin','regional_admin',
        'regional_hr','property_manager','property_hr','department_head'
      ])
  );
$$;

COMMENT ON FUNCTION public.is_learning_editor(uuid) IS
  'True when the user holds a role allowed to create/edit courses, lessons, assessments and objectives.';

-- ---------------------------------------------------------------------------
-- Enum: lesson_block_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.lesson_block_type AS ENUM (
    'text','video','image','embed','callout','activity','knowledge_check'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                       TEXT NOT NULL,
  slug                        TEXT,
  description                 TEXT,
  summary                     TEXT,
  status                      TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','in_review','published','archived')),
  difficulty_level            TEXT DEFAULT 'beginner',
  category                    TEXT,
  content_language            TEXT,
  estimated_duration_minutes  INTEGER,
  passing_score_percentage    INTEGER NOT NULL DEFAULT 80,
  certificate_enabled         BOOLEAN NOT NULL DEFAULT true,
  allow_retake                BOOLEAN NOT NULL DEFAULT true,
  max_attempts                INTEGER,
  department_id               UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  property_id                 UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  blueprint                   JSONB,
  quality_score               INTEGER,
  -- provenance: the training_modules row this course was migrated from
  source_training_module_id   UUID UNIQUE REFERENCES public.training_modules(id) ON DELETE SET NULL,
  created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted                  BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_key
  ON public.courses (lower(slug)) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS courses_status_idx      ON public.courses (status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS courses_department_idx  ON public.courses (department_id);
CREATE INDEX IF NOT EXISTS courses_property_idx    ON public.courses (property_id);

COMMENT ON TABLE public.courses IS 'Top-level learning container. Migrated 1:1 from public.training_modules.';

-- ---------------------------------------------------------------------------
-- course_modules  (the "section")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  -- section id string used by the Training Builder (documents.content_data.section.id)
  legacy_section_key TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_modules_course_idx ON public.course_modules (course_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS course_modules_course_section_key
  ON public.course_modules (course_id, legacy_section_key) WHERE legacy_section_key IS NOT NULL;

COMMENT ON TABLE public.course_modules IS 'Ordered grouping of lessons within a course (the Builder "section").';

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_module_id           UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title                      TEXT NOT NULL,
  title_ar                   TEXT,
  summary                    TEXT,
  position                   INTEGER NOT NULL DEFAULT 0,
  estimated_duration_seconds INTEGER,
  is_mandatory               BOOLEAN NOT NULL DEFAULT true,
  -- blueprint lesson id (documents.content_data.lesson_id) for round-tripping
  legacy_lesson_key          TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_module_idx ON public.lessons (course_module_id, position);

COMMENT ON TABLE public.lessons IS 'A single lesson; ordered within a course_module.';

-- ---------------------------------------------------------------------------
-- lesson_blocks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id        UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_type       public.lesson_block_type NOT NULL DEFAULT 'text',
  position         INTEGER NOT NULL DEFAULT 0,
  title            TEXT,
  title_ar         TEXT,
  -- typed content. text/callout: {html, html_ar}; video/image: {url, caption,
  -- caption_ar, alt_text}; embed: {url, provider}; activity: {prompt, kind};
  -- knowledge_check: {assessment_id} or inline {questions:[...]}.
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_mandatory     BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER,
  points           INTEGER NOT NULL DEFAULT 0,
  -- provenance: the documents row (content_type='training_block') this came from
  source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_blocks_lesson_idx ON public.lesson_blocks (lesson_id, position);
CREATE INDEX IF NOT EXISTS lesson_blocks_type_idx   ON public.lesson_blocks (block_type);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_blocks_source_document_key
  ON public.lesson_blocks (source_document_id) WHERE source_document_id IS NOT NULL;

COMMENT ON TABLE public.lesson_blocks IS 'Typed, ordered content block belonging to a lesson. Replaces documents rows with content_type=''training_block''.';

-- ---------------------------------------------------------------------------
-- updated_at trigger (self-contained, used by every learning-domain table)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.learning_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses','course_modules','lessons','lesson_blocks'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
--   read  : any authenticated user may read published, non-deleted content;
--           editors may read everything.
--   write : editors only (INSERT/UPDATE/DELETE), enforced with WITH CHECK.
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks  ENABLE ROW LEVEL SECURITY;

-- courses
DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select ON public.courses
  FOR SELECT TO authenticated
  USING ((status = 'published' AND is_deleted = false) OR public.is_learning_editor());

DROP POLICY IF EXISTS courses_write ON public.courses;
CREATE POLICY courses_write ON public.courses
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

-- course_modules
DROP POLICY IF EXISTS course_modules_select ON public.course_modules;
CREATE POLICY course_modules_select ON public.course_modules
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.courses c
               WHERE c.id = course_id AND c.status = 'published' AND c.is_deleted = false)
  );

DROP POLICY IF EXISTS course_modules_write ON public.course_modules;
CREATE POLICY course_modules_write ON public.course_modules
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

-- lessons
DROP POLICY IF EXISTS lessons_select ON public.lessons;
CREATE POLICY lessons_select ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = course_module_id AND c.status = 'published' AND c.is_deleted = false
    )
  );

DROP POLICY IF EXISTS lessons_write ON public.lessons;
CREATE POLICY lessons_write ON public.lessons
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

-- lesson_blocks
DROP POLICY IF EXISTS lesson_blocks_select ON public.lesson_blocks;
CREATE POLICY lesson_blocks_select ON public.lesson_blocks
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.course_modules cm ON cm.id = l.course_module_id
      JOIN public.courses c ON c.id = cm.course_id
      WHERE l.id = lesson_id AND c.status = 'published' AND c.is_deleted = false
    )
  );

DROP POLICY IF EXISTS lesson_blocks_write ON public.lesson_blocks;
CREATE POLICY lesson_blocks_write ON public.lesson_blocks
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());
