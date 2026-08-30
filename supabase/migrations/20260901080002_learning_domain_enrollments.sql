-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 2 of 6: LEARNER PROGRESS
--
-- Splits public.training_progress (24 columns, 1 row per user x module) into:
--
--   enrollments      identity + lifecycle + final outcome of a learner in a
--                    course. 1 row per (user, course).
--   lesson_progress  per-lesson completion state under an enrollment.
--                    (legacy training_progress had no per-lesson granularity,
--                    so the backfill seeds one summary row per enrollment.)
--   learning_events  append-only activity/telemetry stream. Absorbs the
--                    last_session_id / last_block_index / time_spent bumps /
--                    metadata that used to be mutated in place on
--                    training_progress.
--
-- training_progress is LEFT IN PLACE. Idempotent. RLS enabled.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('not_started','in_progress','completed','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id                   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assignment_id               UUID,
  status                      public.enrollment_status NOT NULL DEFAULT 'not_started',
  progress_percentage         INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  score_percentage            NUMERIC,
  passed                      BOOLEAN,
  certificate_url             TEXT,
  enrolled_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at                  TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  expires_at                  TIMESTAMPTZ,
  acknowledged_at             TIMESTAMPTZ,
  last_activity_at            TIMESTAMPTZ DEFAULT now(),
  metadata                    JSONB,
  -- provenance: the training_progress row this enrollment was migrated from
  source_training_progress_id UUID UNIQUE REFERENCES public.training_progress(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted                  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS enrollments_user_idx   ON public.enrollments (user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments (course_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON public.enrollments (status);

COMMENT ON TABLE public.enrollments IS 'A learner''s participation in a course. Migrated from public.training_progress.';

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id       UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id           UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status              public.enrollment_status NOT NULL DEFAULT 'not_started',
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  last_block_id       UUID REFERENCES public.lesson_blocks(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_idx ON public.lesson_progress (enrollment_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx     ON public.lesson_progress (lesson_id);

COMMENT ON TABLE public.lesson_progress IS 'Per-lesson completion state under an enrollment.';

-- ---------------------------------------------------------------------------
-- learning_events  (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id   UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id       UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  lesson_block_id UUID REFERENCES public.lesson_blocks(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  session_id      UUID,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_events_user_idx       ON public.learning_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS learning_events_enrollment_idx ON public.learning_events (enrollment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS learning_events_type_idx       ON public.learning_events (event_type);

COMMENT ON TABLE public.learning_events IS 'Append-only learner activity stream (lesson_viewed, block_completed, quiz_submitted, ...).';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['enrollments','lesson_progress'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.learning_touch_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS: learners see/modify only their own rows; editors see everything.
-- learning_events is insert-append only for learners (no update/delete).
-- ---------------------------------------------------------------------------
ALTER TABLE public.enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

-- enrollments
DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
CREATE POLICY enrollments_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_learning_editor());

DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
CREATE POLICY enrollments_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_learning_editor());

DROP POLICY IF EXISTS enrollments_update ON public.enrollments;
CREATE POLICY enrollments_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_learning_editor())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_learning_editor());

DROP POLICY IF EXISTS enrollments_delete ON public.enrollments;
CREATE POLICY enrollments_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.is_learning_editor());

-- lesson_progress
DROP POLICY IF EXISTS lesson_progress_select ON public.lesson_progress;
CREATE POLICY lesson_progress_select ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.enrollments e
               WHERE e.id = enrollment_id AND e.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS lesson_progress_write ON public.lesson_progress;
CREATE POLICY lesson_progress_write ON public.lesson_progress
  FOR ALL TO authenticated
  USING (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.enrollments e
               WHERE e.id = enrollment_id AND e.user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_learning_editor()
    OR EXISTS (SELECT 1 FROM public.enrollments e
               WHERE e.id = enrollment_id AND e.user_id = (SELECT auth.uid()))
  );

-- learning_events
DROP POLICY IF EXISTS learning_events_select ON public.learning_events;
CREATE POLICY learning_events_select ON public.learning_events
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_learning_editor());

DROP POLICY IF EXISTS learning_events_insert ON public.learning_events;
CREATE POLICY learning_events_insert ON public.learning_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_learning_editor());

DROP POLICY IF EXISTS learning_events_mutate ON public.learning_events;
CREATE POLICY learning_events_mutate ON public.learning_events
  FOR UPDATE TO authenticated
  USING (public.is_learning_editor())
  WITH CHECK (public.is_learning_editor());

DROP POLICY IF EXISTS learning_events_delete ON public.learning_events;
CREATE POLICY learning_events_delete ON public.learning_events
  FOR DELETE TO authenticated
  USING (public.is_learning_editor());
