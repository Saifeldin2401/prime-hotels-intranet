-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 4 of 6: LEARNING OBJECTIVES
--
--   learning_objectives  a single measurable outcome statement (terminal or
--                        enabling), optionally scoped to a course and nested
--                        under a parent objective.
--   objective_links      many-to-many: an objective is taught/measured by a
--                        lesson, an assessment, or a specific question.
--
-- Seeded from training_modules.blueprint.terminalObjectives / enablingObjectives
-- and documents.content_data.learningOutcomes in the backfill script.
-- Idempotent. RLS enabled.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.objective_kind AS ENUM ('terminal','enabling');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.objective_link_type AS ENUM ('lesson','assessment','question');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- learning_objectives
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_objectives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT,
  statement           TEXT NOT NULL,
  statement_ar        TEXT,
  kind                public.objective_kind NOT NULL DEFAULT 'enabling',
  bloom_level         TEXT,
  course_id           UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_objective_id UUID REFERENCES public.learning_objectives(id) ON DELETE SET NULL,
  position            INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_objectives_course_idx ON public.learning_objectives (course_id, position);
CREATE INDEX IF NOT EXISTS learning_objectives_parent_idx ON public.learning_objectives (parent_objective_id);
CREATE UNIQUE INDEX IF NOT EXISTS learning_objectives_course_code_key
  ON public.learning_objectives (course_id, code) WHERE code IS NOT NULL;

COMMENT ON TABLE public.learning_objectives IS 'Measurable learning outcome (terminal/enabling), optionally course-scoped and hierarchical.';

-- ---------------------------------------------------------------------------
-- objective_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.objective_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  UUID NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  link_type     public.objective_link_type NOT NULL,
  lesson_id     UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- exactly one target, matching link_type
  CONSTRAINT objective_links_one_target CHECK (
    (link_type = 'lesson'     AND lesson_id IS NOT NULL AND assessment_id IS NULL AND question_id IS NULL) OR
    (link_type = 'assessment' AND assessment_id IS NOT NULL AND lesson_id IS NULL AND question_id IS NULL) OR
    (link_type = 'question'   AND question_id IS NOT NULL AND lesson_id IS NULL AND assessment_id IS NULL)
  ),
  UNIQUE (objective_id, lesson_id, assessment_id, question_id)
);

CREATE INDEX IF NOT EXISTS objective_links_objective_idx  ON public.objective_links (objective_id);
CREATE INDEX IF NOT EXISTS objective_links_lesson_idx     ON public.objective_links (lesson_id)     WHERE lesson_id     IS NOT NULL;
CREATE INDEX IF NOT EXISTS objective_links_assessment_idx ON public.objective_links (assessment_id) WHERE assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS objective_links_question_idx   ON public.objective_links (question_id)   WHERE question_id   IS NOT NULL;

COMMENT ON TABLE public.objective_links IS 'Maps a learning objective to the lesson / assessment / question that teaches or measures it.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_learning_objectives_touch ON public.learning_objectives;
CREATE TRIGGER trg_learning_objectives_touch BEFORE UPDATE ON public.learning_objectives
  FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: readable by any authenticated user whose course is published (or all,
-- for editors); writable by editors only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_links     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_objectives_select ON public.learning_objectives;
CREATE POLICY learning_objectives_select ON public.learning_objectives
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR course_id IS NULL
    OR EXISTS (SELECT 1 FROM public.courses c
               WHERE c.id = course_id AND c.status = 'published' AND c.is_deleted = false)
  );

DROP POLICY IF EXISTS learning_objectives_write ON public.learning_objectives;
CREATE POLICY learning_objectives_write ON public.learning_objectives
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

DROP POLICY IF EXISTS objective_links_select ON public.objective_links;
CREATE POLICY objective_links_select ON public.objective_links
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.learning_objectives o
               WHERE o.id = objective_id
                 AND (o.course_id IS NULL
                      OR EXISTS (SELECT 1 FROM public.courses c
                                 WHERE c.id = o.course_id AND c.status = 'published' AND c.is_deleted = false)))
  );

DROP POLICY IF EXISTS objective_links_write ON public.objective_links;
CREATE POLICY objective_links_write ON public.objective_links
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());
