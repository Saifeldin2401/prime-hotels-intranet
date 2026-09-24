DO $$ BEGIN
  CREATE TYPE public.assessment_type AS ENUM ('formative','summative');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_placement AS ENUM ('lesson','module','course','path','certification');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  assessment_type    public.assessment_type NOT NULL DEFAULT 'formative',
  placement          public.assessment_placement NOT NULL DEFAULT 'lesson',
  placement_ref_id   UUID,
  time_limit_minutes INTEGER,
  max_attempts       INTEGER,
  passing_score      INTEGER NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  randomization      JSONB NOT NULL DEFAULT '{}'::jsonb,
  question_bank_id   UUID,
  pool_draw_count    INTEGER,
  show_feedback      BOOLEAN NOT NULL DEFAULT true,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','pending_review','published','archived')),
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

DROP TRIGGER IF EXISTS trg_assessments_touch ON public.assessments;
CREATE TRIGGER trg_assessments_touch BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at();

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
