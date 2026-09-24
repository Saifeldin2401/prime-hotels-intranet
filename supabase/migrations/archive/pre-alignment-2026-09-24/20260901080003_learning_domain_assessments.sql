-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 3 of 6: ASSESSMENTS
--
--   assessments           a quiz/exam definition. formative|summative, placed
--                         against a lesson | module | course | path |
--                         certification. Migrated from public.learning_quizzes.
--   assessment_questions  binds an assessment to rows in the existing
--                         public.unified_questions engine (explicit list), OR
--                         the assessment draws from a bank via
--                         assessments.question_bank_id + pool_draw_count.
--
-- The unified_* question engine (unified_questions / _options / _attempts /
-- _quiz_sessions) is unchanged and remains the runtime for delivery & grading.
-- learning_quizzes is LEFT IN PLACE. Idempotent. RLS enabled.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.assessment_type AS ENUM ('formative','summative');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_placement AS ENUM ('lesson','module','course','path','certification');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  assessment_type    public.assessment_type NOT NULL DEFAULT 'formative',
  placement          public.assessment_placement NOT NULL DEFAULT 'lesson',
  -- polymorphic target resolved by `placement`:
  --   lesson        -> public.lessons.id
  --   module        -> public.course_modules.id
  --   course        -> public.courses.id
  --   path          -> public.training_paths.id
  --   certification -> external certification id (no local table yet)
  -- intentionally NOT a FK (target table varies); integrity enforced in app +
  -- the CHECK below keeps it non-null for the local placements.
  placement_ref_id   UUID,
  time_limit_minutes INTEGER,
  max_attempts       INTEGER,
  passing_score      INTEGER NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  randomization      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {questions:bool, options:bool, seed:int}
  -- pool binding (used when assessment_questions has no explicit rows)
  question_bank_id   UUID,
  pool_draw_count    INTEGER,
  show_feedback      BOOLEAN NOT NULL DEFAULT true,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','pending_review','published','archived')),
  -- provenance
  source_quiz_id     UUID UNIQUE REFERENCES public.learning_quizzes(id) ON DELETE SET NULL,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted         BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT assessments_placement_ref_present
    CHECK (placement = 'certification' OR placement_ref_id IS NOT NULL),
  CONSTRAINT assessments_pool_shape
    CHECK ((question_bank_id IS NULL) = (pool_draw_count IS NULL))
);

CREATE INDEX IF NOT EXISTS assessments_placement_idx ON public.assessments (placement, placement_ref_id);
CREATE INDEX IF NOT EXISTS assessments_status_idx    ON public.assessments (status) WHERE is_deleted = false;

COMMENT ON TABLE public.assessments IS 'Quiz/exam definition. Delivery + grading run on the unified_* engine.';

-- ---------------------------------------------------------------------------
-- assessment_questions  (explicit question list)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  display_order  INTEGER NOT NULL DEFAULT 0,
  points_override INTEGER,
  is_required    BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

CREATE INDEX IF NOT EXISTS assessment_questions_assessment_idx ON public.assessment_questions (assessment_id, display_order);
CREATE INDEX IF NOT EXISTS assessment_questions_question_idx   ON public.assessment_questions (question_id);

COMMENT ON TABLE public.assessment_questions IS 'Explicit binding of an assessment to unified_questions rows (mirrors unified_quiz_questions).';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_assessments_touch ON public.assessments;
CREATE TRIGGER trg_assessments_touch BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessments_select ON public.assessments;
CREATE POLICY assessments_select ON public.assessments
  FOR SELECT TO authenticated
  USING ((status = 'published' AND is_deleted = false) OR public.is_learning_editor());

DROP POLICY IF EXISTS assessments_write ON public.assessments;
CREATE POLICY assessments_write ON public.assessments
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

DROP POLICY IF EXISTS assessment_questions_select ON public.assessment_questions;
CREATE POLICY assessment_questions_select ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.assessments a
               WHERE a.id = assessment_id AND a.status = 'published' AND a.is_deleted = false)
  );

DROP POLICY IF EXISTS assessment_questions_write ON public.assessment_questions;
CREATE POLICY assessment_questions_write ON public.assessment_questions
  FOR ALL TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());
