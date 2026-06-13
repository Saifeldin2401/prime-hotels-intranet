-- =============================================================================
-- Migration: consolidate_quiz_engine
-- Purpose: Unify 16 scattered quiz-related tables into a single question-engine.
--
-- Strategy (all tables have 0 rows, so DROPs are safe):
--   1. ADD columns to existing `quizzes` and `quiz_attempts` (non-breaking)
--   2. CREATE unified_questions, unified_question_options, unified_quiz_questions,
--      unified_question_usages, unified_question_versions, unified_question_attempts,
--      unified_quiz_sessions tables
--   3. CREATE backward-compatible views (security_invoker) for old table names
--   4. DROP old tables (safe – all had 0 rows at migration time)
--   5. Enable RLS + policies on new tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Extend existing tables with domain discriminator
-- ---------------------------------------------------------------------------
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'core'
    CHECK (domain IN ('core','sop','knowledge','training','learning'));

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'core'
    CHECK (domain IN ('core','sop','knowledge','training','learning'));

-- ---------------------------------------------------------------------------
-- STEP 2a: Unified question bank
--   Absorbs: quiz_questions, training_quizzes, sop_quiz_questions,
--            knowledge_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_questions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_domain         text NOT NULL DEFAULT 'core'
    CHECK (source_domain IN ('core','sop','knowledge','training','learning')),
  question_text         text NOT NULL,
  question_text_ar      text,
  question_type         question_type NOT NULL DEFAULT 'mcq',
  difficulty            question_difficulty NOT NULL DEFAULT 'medium',
  status                question_status NOT NULL DEFAULT 'draft',
  correct_answer        text,
  explanation           text,
  explanation_ar        text,
  hint                  text,
  hint_ar               text,
  points                integer DEFAULT 1,
  estimated_time_seconds integer DEFAULT 30,
  linked_sop_id         uuid,
  linked_sop_section    text,
  training_module_id    uuid,
  training_section_id   text,
  source_document_id    uuid,
  tags                  text[] DEFAULT '{}',
  ai_generated          boolean DEFAULT false,
  ai_model_used         text,
  ai_confidence_score   numeric,
  ai_prompt_used        text,
  version               integer DEFAULT 1,
  reviewed_by           uuid,
  reviewed_at           timestamptz,
  review_notes          text,
  created_by            uuid,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

COMMENT ON TABLE public.unified_questions IS
  'Single question bank replacing: quiz_questions, training_quizzes, '
  'sop_quiz_questions, knowledge_questions. Discriminate via source_domain.';

-- ---------------------------------------------------------------------------
-- STEP 2b: Unified answer options
--   Absorbs: knowledge_question_options
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_question_options (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     uuid NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  option_text     text NOT NULL,
  option_text_ar  text,
  is_correct      boolean DEFAULT false,
  display_order   integer DEFAULT 0,
  feedback        text,
  feedback_ar     text,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.unified_question_options IS
  'Answer options for unified_questions. Replaces knowledge_question_options.';

-- ---------------------------------------------------------------------------
-- STEP 2c: Unified question-to-quiz JOIN table
--   Absorbs: learning_quiz_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_quiz_questions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id      uuid NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  display_order    integer DEFAULT 0,
  points_override  integer,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (quiz_id, question_id)
);

COMMENT ON TABLE public.unified_quiz_questions IS
  'Replaces learning_quiz_questions. Links any quiz to unified_questions.';

-- ---------------------------------------------------------------------------
-- STEP 2d: Unified question usages
--   Absorbs: knowledge_question_usages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_question_usages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id      uuid NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  usage_type       text NOT NULL,
  usage_entity_id  uuid NOT NULL,
  display_order    integer DEFAULT 0,
  is_required      boolean DEFAULT true,
  weight           numeric DEFAULT 1.0,
  created_at       timestamptz DEFAULT now()
);

COMMENT ON TABLE public.unified_question_usages IS
  'Replaces knowledge_question_usages.';

-- ---------------------------------------------------------------------------
-- STEP 2e: Unified question versions
--   Absorbs: knowledge_question_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_question_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     uuid NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  data_snapshot   jsonb NOT NULL,
  changed_by      uuid,
  changed_at      timestamptz DEFAULT now(),
  change_reason   text
);

COMMENT ON TABLE public.unified_question_versions IS
  'Replaces knowledge_question_versions. Audit trail for question edits.';

-- ---------------------------------------------------------------------------
-- STEP 2f: Unified per-question attempts
--   Absorbs: knowledge_question_attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_question_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  question_id         uuid NOT NULL REFERENCES public.unified_questions(id) ON DELETE CASCADE,
  session_id          uuid,
  selected_answer     text,
  selected_options    uuid[],
  is_correct          boolean,
  partial_score       numeric,
  context_type        text,
  context_entity_id   uuid,
  time_spent_seconds  integer,
  attempt_number      integer DEFAULT 1,
  hint_used           boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE public.unified_question_attempts IS
  'Per-question attempt log. Replaces knowledge_question_attempts. '
  'Quiz-level aggregates stay in quiz_attempts.';

-- ---------------------------------------------------------------------------
-- STEP 2g: Unified quiz sessions
--   Absorbs: knowledge_quiz_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_quiz_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  quiz_type           text NOT NULL,
  quiz_entity_id      uuid,
  started_at          timestamptz DEFAULT now(),
  completed_at        timestamptz,
  total_questions     integer DEFAULT 0,
  correct_answers     integer DEFAULT 0,
  total_points        integer DEFAULT 0,
  earned_points       integer DEFAULT 0,
  score_percentage    numeric,
  passed              boolean,
  time_limit_seconds  integer,
  passing_score       numeric
);

COMMENT ON TABLE public.unified_quiz_sessions IS
  'Replaces knowledge_quiz_sessions.';

-- ---------------------------------------------------------------------------
-- STEP 3: Backward-compatible views (security_invoker so RLS is honoured)
-- ---------------------------------------------------------------------------

-- 3a. knowledge_questions
CREATE OR REPLACE VIEW public.knowledge_questions
  WITH (security_invoker = true)
AS
SELECT
  id,
  question_text,
  question_text_ar,
  question_type,
  difficulty                  AS difficulty_level,
  correct_answer,
  explanation,
  explanation_ar,
  hint,
  hint_ar,
  linked_sop_id,
  linked_sop_section,
  NULL::uuid                  AS category_id,
  tags,
  estimated_time_seconds,
  points,
  ai_generated,
  ai_model_used,
  ai_confidence_score,
  ai_prompt_used,
  status,
  version,
  reviewed_by,
  reviewed_at,
  review_notes,
  created_by,
  created_at,
  updated_at,
  training_module_id,
  training_section_id
FROM public.unified_questions
WHERE source_domain = 'knowledge';

-- 3b. knowledge_question_options
CREATE OR REPLACE VIEW public.knowledge_question_options
  WITH (security_invoker = true)
AS
SELECT
  uqo.id,
  uqo.question_id,
  uqo.option_text,
  uqo.option_text_ar,
  uqo.is_correct,
  uqo.display_order,
  uqo.feedback,
  uqo.feedback_ar,
  uqo.created_at
FROM public.unified_question_options uqo
JOIN public.unified_questions uq ON uq.id = uqo.question_id
WHERE uq.source_domain = 'knowledge';

-- 3c. knowledge_question_attempts
CREATE OR REPLACE VIEW public.knowledge_question_attempts
  WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  question_id,
  session_id,
  selected_answer,
  selected_options,
  is_correct,
  partial_score,
  context_type,
  context_entity_id,
  time_spent_seconds,
  attempt_number,
  hint_used,
  created_at
FROM public.unified_question_attempts;

-- 3d. knowledge_question_usages
CREATE OR REPLACE VIEW public.knowledge_question_usages
  WITH (security_invoker = true)
AS
SELECT
  uqu.id,
  uqu.question_id,
  uqu.usage_type,
  uqu.usage_entity_id,
  uqu.display_order,
  uqu.is_required,
  uqu.weight,
  uqu.created_at
FROM public.unified_question_usages uqu
JOIN public.unified_questions uq ON uq.id = uqu.question_id
WHERE uq.source_domain = 'knowledge';

-- 3e. knowledge_question_versions
CREATE OR REPLACE VIEW public.knowledge_question_versions
  WITH (security_invoker = true)
AS
SELECT
  uqv.id,
  uqv.question_id,
  uqv.version_number,
  uqv.data_snapshot,
  uqv.changed_by,
  uqv.changed_at,
  uqv.change_reason
FROM public.unified_question_versions uqv
JOIN public.unified_questions uq ON uq.id = uqv.question_id
WHERE uq.source_domain = 'knowledge';

-- 3f. knowledge_quiz_sessions
CREATE OR REPLACE VIEW public.knowledge_quiz_sessions
  WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  quiz_type,
  quiz_entity_id,
  started_at,
  completed_at,
  total_questions,
  correct_answers,
  total_points,
  earned_points,
  score_percentage,
  passed,
  time_limit_seconds,
  passing_score
FROM public.unified_quiz_sessions;

-- 3g. learning_quiz_questions (JOIN table replaced by unified_quiz_questions)
CREATE OR REPLACE VIEW public.learning_quiz_questions
  WITH (security_invoker = true)
AS
SELECT
  uqq.id,
  uqq.quiz_id,
  uqq.question_id,
  uqq.display_order,
  uqq.points_override,
  uqq.created_at
FROM public.unified_quiz_questions uqq
JOIN public.quizzes q ON q.id = uqq.quiz_id
WHERE q.domain = 'learning';

-- 3h. sop_quiz_questions
CREATE OR REPLACE VIEW public.sop_quiz_questions
  WITH (security_invoker = true)
AS
SELECT
  uq.id,
  uq.linked_sop_id                         AS sop_document_id,
  uq.question_text,
  uq.question_type::text                   AS question_type,
  NULL::jsonb                              AS options,
  uq.correct_answer,
  uq.points,
  (row_number() OVER (
    PARTITION BY uq.linked_sop_id
    ORDER BY uq.created_at
  ) - 1)::integer                          AS order_index,
  uq.created_at,
  uq.updated_at
FROM public.unified_questions uq
WHERE uq.source_domain = 'sop';

-- 3i. sop_quiz_attempts
CREATE OR REPLACE VIEW public.sop_quiz_attempts
  WITH (security_invoker = true)
AS
SELECT
  qa.id,
  qa.quiz_id                               AS sop_document_id,
  qa.user_id,
  COALESCE(qa.score, 0)::numeric           AS score,
  0                                        AS total_points,
  COALESCE(qa.score, 0)::numeric           AS percentage,
  qa.passed,
  qa.answers,
  qa.started_at,
  qa.completed_at,
  NULL::text                               AS certificate_url,
  qa.started_at                            AS created_at
FROM public.quiz_attempts qa
WHERE qa.domain = 'sop';

-- 3j. training_quizzes
CREATE OR REPLACE VIEW public.training_quizzes
  WITH (security_invoker = true)
AS
SELECT
  uq.id,
  uq.training_module_id,
  uq.question_text                         AS question,
  uq.question_type                         AS type,
  NULL::text[]                             AS options,
  uq.correct_answer,
  row_number() OVER (
    PARTITION BY uq.training_module_id
    ORDER BY uq.created_at
  )::integer                               AS "order",
  uq.created_at,
  false                                    AS is_deleted
FROM public.unified_questions uq
WHERE uq.source_domain = 'training';

-- 3k. training_quiz_attempts
CREATE OR REPLACE VIEW public.training_quiz_attempts
  WITH (security_invoker = true)
AS
SELECT
  qa.id,
  qa.user_id,
  qa.quiz_id                               AS module_id,
  qa.score,
  qa.score                                 AS max_score,
  qa.passed,
  1                                        AS attempt_number,
  qa.started_at,
  qa.completed_at,
  qa.answers
FROM public.quiz_attempts qa
WHERE qa.domain = 'training';

-- ---------------------------------------------------------------------------
-- STEP 4: Drop old tables (all had 0 rows; safe to drop)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  old_tables text[] := ARRAY[
    'quiz_questions',
    'sop_quiz_questions',
    'sop_quiz_attempts',
    'training_quizzes',
    'training_quiz_attempts',
    'knowledge_questions',
    'knowledge_question_options',
    'knowledge_question_attempts',
    'knowledge_question_usages',
    'knowledge_question_versions',
    'knowledge_quiz_sessions',
    'learning_quiz_questions'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY old_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND table_type = 'BASE TABLE'
    ) THEN
      EXECUTE format('DROP TABLE public.%I CASCADE', tbl);
      RAISE NOTICE 'Dropped old table: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 5: Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_unified_questions_domain
  ON public.unified_questions(source_domain);

CREATE INDEX IF NOT EXISTS idx_unified_questions_status
  ON public.unified_questions(status);

CREATE INDEX IF NOT EXISTS idx_unified_questions_training_module
  ON public.unified_questions(training_module_id)
  WHERE training_module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_questions_sop
  ON public.unified_questions(linked_sop_id)
  WHERE linked_sop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_question_options_question
  ON public.unified_question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_unified_quiz_questions_quiz
  ON public.unified_quiz_questions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_unified_quiz_questions_question
  ON public.unified_quiz_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_unified_question_attempts_user
  ON public.unified_question_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_unified_question_attempts_question
  ON public.unified_question_attempts(question_id);

CREATE INDEX IF NOT EXISTS idx_unified_question_usages_question
  ON public.unified_question_usages(question_id);

CREATE INDEX IF NOT EXISTS idx_unified_quiz_sessions_user
  ON public.unified_quiz_sessions(user_id);

-- ---------------------------------------------------------------------------
-- STEP 6: Enable Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.unified_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_question_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_quiz_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_question_usages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_question_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_question_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_quiz_sessions      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- STEP 7: RLS Policies
-- ---------------------------------------------------------------------------

-- unified_questions
CREATE POLICY "unified_questions_select" ON public.unified_questions
  FOR SELECT TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR (reviewed_by = (SELECT auth.uid()))
    OR (status = 'published')
    OR EXISTS (
      SELECT 1
      FROM public.unified_quiz_questions uqq
      JOIN public.quizzes q ON q.id = uqq.quiz_id
      WHERE uqq.question_id = unified_questions.id
        AND q.status = 'running'
    )
  );

CREATE POLICY "unified_questions_insert" ON public.unified_questions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "unified_questions_update" ON public.unified_questions
  FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  );

CREATE POLICY "unified_questions_delete" ON public.unified_questions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  );

-- unified_question_options
CREATE POLICY "unified_question_options_select" ON public.unified_question_options
  FOR SELECT TO authenticated
  USING (
    question_id IN (
      SELECT id FROM public.unified_questions WHERE status = 'published'
    )
    OR question_id IN (
      SELECT id FROM public.unified_questions
      WHERE created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.unified_quiz_questions uqq
      JOIN public.quizzes q ON q.id = uqq.quiz_id
      WHERE uqq.question_id = unified_question_options.question_id
        AND q.status = 'running'
    )
  );

CREATE POLICY "unified_question_options_manage" ON public.unified_question_options
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- unified_quiz_questions
CREATE POLICY "unified_quiz_questions_select" ON public.unified_quiz_questions
  FOR SELECT TO authenticated
  USING (
    (quiz_id IN (SELECT id FROM public.quizzes))
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  );

CREATE POLICY "unified_quiz_questions_manage" ON public.unified_quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text = ANY(ARRAY[
          'regional_admin','regional_hr','property_hr','department_head'
        ])
    )
  );

-- unified_question_usages
CREATE POLICY "unified_question_usages_select" ON public.unified_question_usages
  FOR SELECT TO authenticated
  USING (
    question_id IN (
      SELECT id FROM public.unified_questions WHERE status = 'published'
    )
  );

CREATE POLICY "unified_question_usages_manage" ON public.unified_question_usages
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM public.user_roles
      WHERE role::text = ANY(ARRAY[
        'regional_admin','regional_hr','property_hr','property_manager'
      ])
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM public.user_roles
      WHERE role::text = ANY(ARRAY[
        'regional_admin','regional_hr','property_hr','property_manager'
      ])
    )
  );

-- unified_question_versions
CREATE POLICY "unified_question_versions_select" ON public.unified_question_versions
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM public.user_roles
      WHERE role::text = ANY(ARRAY['regional_admin','regional_hr','property_hr'])
    )
  );

CREATE POLICY "unified_question_versions_insert" ON public.unified_question_versions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- unified_question_attempts
CREATE POLICY "unified_question_attempts_select" ON public.unified_question_attempts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "unified_question_attempts_insert" ON public.unified_question_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- unified_quiz_sessions
CREATE POLICY "unified_quiz_sessions_select" ON public.unified_quiz_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "unified_quiz_sessions_insert" ON public.unified_quiz_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "unified_quiz_sessions_update" ON public.unified_quiz_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
