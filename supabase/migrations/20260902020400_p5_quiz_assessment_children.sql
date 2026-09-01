-- ==============================================================================
-- P5 TENANCY — GROUP 4: quiz / assessment / competency children
-- ==============================================================================
-- Tables (all TENANT_VIA_PARENT):
--   unified_question_options   -> unified_questions.organization_id   (col only; RLS already correct from P1)
--   unified_question_usages    -> unified_questions.organization_id   (col only; RLS already correct from P1)
--   unified_question_versions  -> unified_questions.organization_id   (col only; RLS already correct from P1)
--   unified_quiz_questions     -> learning_quizzes.organization_id    (col only; RLS already gates org)
--   assessment_questions       -> assessments.organization_id         (col only; RLS already gates org)
--   practical_submissions      -> practical_assessments.organization_id (col only; RLS already gates org)
--   competency_levels          -> competencies.organization_id        (col only; RLS already gates org)
--   certificate_history        -> certificates.organization_id        (col + RLS lockdown)
--
-- For every table: ADD COLUMN organization_id + guarded FK -> organizations(id)
-- ON DELETE CASCADE, backfill from the parent (NULL parent -> LIT), index,
-- SET NOT NULL, BEFORE INSERT trigger to populate from the parent when NULL.
--
-- RLS:
--   * unified_question_{options,usages,versions}, unified_quiz_questions,
--     assessment_questions, practical_submissions, competency_levels:
--     existing policies already require org_visible() via the parent EXISTS
--     check (verified against live pg_policy) -> LEFT UNCHANGED per the phase
--     playbook step 7.
--   * certificate_history: BOTH live policies reference legacy user_roles role
--     names and the SELECT has no org predicate. Replaced with org-scoped
--     equivalents. No access broadened:
--       - SELECT: legacy global HR/admin roles -> is_tenant_people_admin /
--         is_tenant_admin scoped to organization_id; certificate-owner branch
--         preserved, now also same-org.
--       - INSERT: performed_by = auth.uid() preserved, now also requires
--         org_visible(organization_id) + WITH CHECK.
--     certificate_history stays append+select only (matches current shape and
--     the immutable-audit-log intent). No is_platform_super_admin() bypass —
--     the sibling `certificates` policies have none.
--
-- Rollback
--   BEGIN;
--     ALTER TABLE public.certificate_history       DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.competency_levels         DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.practical_submissions     DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.assessment_questions      DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.unified_quiz_questions    DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.unified_question_versions DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.unified_question_usages   DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.unified_question_options  DROP COLUMN IF EXISTS organization_id;
--     DROP FUNCTION IF EXISTS public.set_p5_org_from_parent();
--   COMMIT;
--   (restore previous certificate_history policies from git history)
--
-- Idempotent. Single transaction.
-- ==============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Shared BEFORE INSERT trigger fn: read organization_id from a parent row.
-- TG_ARGV[0] = parent table name, TG_ARGV[1] = local FK column name.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_p5_org_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  uuid;
  v_org    uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I', v_fk) INTO v_fkval USING NEW;

  IF v_fkval IS NOT NULL THEN
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', v_parent)
      INTO v_org USING v_fkval;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_p5_org_from_parent() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_p5_org_from_parent() TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- Generic per-child DDL via a DO block helper is avoided (dynamic FK naming);
-- each table is spelled out for clarity and idempotency.
-- --------------------------------------------------------------------------

-- ========================= unified_question_options =========================
ALTER TABLE public.unified_question_options ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='unified_question_options'
      AND constraint_name='unified_question_options_organization_id_fkey'
  ) THEN
    ALTER TABLE public.unified_question_options
      ADD CONSTRAINT unified_question_options_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.unified_question_options t
   SET organization_id = COALESCE(
     (SELECT q.organization_id FROM public.unified_questions q WHERE q.id = t.question_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_question_options_organization_id
  ON public.unified_question_options (organization_id);

ALTER TABLE public.unified_question_options ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.unified_question_options;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.unified_question_options
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('unified_questions', 'question_id');

-- ========================= unified_question_usages =========================
ALTER TABLE public.unified_question_usages ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='unified_question_usages'
      AND constraint_name='unified_question_usages_organization_id_fkey'
  ) THEN
    ALTER TABLE public.unified_question_usages
      ADD CONSTRAINT unified_question_usages_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.unified_question_usages t
   SET organization_id = COALESCE(
     (SELECT q.organization_id FROM public.unified_questions q WHERE q.id = t.question_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_question_usages_organization_id
  ON public.unified_question_usages (organization_id);

ALTER TABLE public.unified_question_usages ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.unified_question_usages;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.unified_question_usages
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('unified_questions', 'question_id');

-- ========================= unified_question_versions =========================
ALTER TABLE public.unified_question_versions ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='unified_question_versions'
      AND constraint_name='unified_question_versions_organization_id_fkey'
  ) THEN
    ALTER TABLE public.unified_question_versions
      ADD CONSTRAINT unified_question_versions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.unified_question_versions t
   SET organization_id = COALESCE(
     (SELECT q.organization_id FROM public.unified_questions q WHERE q.id = t.question_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_question_versions_organization_id
  ON public.unified_question_versions (organization_id);

ALTER TABLE public.unified_question_versions ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.unified_question_versions;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.unified_question_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('unified_questions', 'question_id');

-- ========================= unified_quiz_questions =========================
ALTER TABLE public.unified_quiz_questions ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='unified_quiz_questions'
      AND constraint_name='unified_quiz_questions_organization_id_fkey'
  ) THEN
    ALTER TABLE public.unified_quiz_questions
      ADD CONSTRAINT unified_quiz_questions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.unified_quiz_questions t
   SET organization_id = COALESCE(
     (SELECT lq.organization_id FROM public.learning_quizzes lq WHERE lq.id = t.quiz_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_quiz_questions_organization_id
  ON public.unified_quiz_questions (organization_id);

ALTER TABLE public.unified_quiz_questions ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.unified_quiz_questions;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.unified_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('learning_quizzes', 'quiz_id');

-- ========================= assessment_questions =========================
ALTER TABLE public.assessment_questions ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='assessment_questions'
      AND constraint_name='assessment_questions_organization_id_fkey'
  ) THEN
    ALTER TABLE public.assessment_questions
      ADD CONSTRAINT assessment_questions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.assessment_questions t
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.assessments a WHERE a.id = t.assessment_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_questions_organization_id
  ON public.assessment_questions (organization_id);

ALTER TABLE public.assessment_questions ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.assessment_questions;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('assessments', 'assessment_id');

-- ========================= practical_submissions =========================
ALTER TABLE public.practical_submissions ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='practical_submissions'
      AND constraint_name='practical_submissions_organization_id_fkey'
  ) THEN
    ALTER TABLE public.practical_submissions
      ADD CONSTRAINT practical_submissions_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.practical_submissions t
   SET organization_id = COALESCE(
     (SELECT pa.organization_id FROM public.practical_assessments pa WHERE pa.id = t.assessment_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_practical_submissions_organization_id
  ON public.practical_submissions (organization_id);

ALTER TABLE public.practical_submissions ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.practical_submissions;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.practical_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('practical_assessments', 'assessment_id');

-- ========================= competency_levels =========================
ALTER TABLE public.competency_levels ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='competency_levels'
      AND constraint_name='competency_levels_organization_id_fkey'
  ) THEN
    ALTER TABLE public.competency_levels
      ADD CONSTRAINT competency_levels_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.competency_levels t
   SET organization_id = COALESCE(
     (SELECT c.organization_id FROM public.competencies c WHERE c.id = t.competency_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_competency_levels_organization_id
  ON public.competency_levels (organization_id);

ALTER TABLE public.competency_levels ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.competency_levels;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.competency_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('competencies', 'competency_id');

-- ========================= certificate_history =========================
ALTER TABLE public.certificate_history ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='certificate_history'
      AND constraint_name='certificate_history_organization_id_fkey'
  ) THEN
    ALTER TABLE public.certificate_history
      ADD CONSTRAINT certificate_history_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.certificate_history t
   SET organization_id = COALESCE(
     (SELECT c.organization_id FROM public.certificates c WHERE c.id = t.certificate_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_certificate_history_organization_id
  ON public.certificate_history (organization_id);

ALTER TABLE public.certificate_history ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.certificate_history;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.certificate_history
  FOR EACH ROW EXECUTE FUNCTION public.set_p5_org_from_parent('certificates', 'certificate_id');

-- ---- certificate_history RLS lockdown ------------------------------------
ALTER TABLE public.certificate_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_certificate_history_insert"            ON public.certificate_history;
DROP POLICY IF EXISTS "consolidated_certificate_history_select"     ON public.certificate_history;
DROP POLICY IF EXISTS "certificate_history_insert_same_org"         ON public.certificate_history;
DROP POLICY IF EXISTS "certificate_history_select_scoped"           ON public.certificate_history;
DROP POLICY IF EXISTS "certificate_history_service_role_all"        ON public.certificate_history;

-- SELECT: tenant people/admin for the row's org, OR the certificate owner.
CREATE POLICY "certificate_history_select_scoped" ON public.certificate_history
  FOR SELECT TO authenticated
  USING (
    public.org_visible(organization_id)
    AND (
      public.is_tenant_people_admin(organization_id)
      OR public.is_tenant_admin(organization_id)
      OR EXISTS (
        SELECT 1 FROM public.certificates c
        WHERE c.id = certificate_history.certificate_id
          AND c.user_id = (SELECT auth.uid())
      )
    )
  );

-- INSERT: unchanged actor check (performed_by = caller) + same-org.
CREATE POLICY "certificate_history_insert_same_org" ON public.certificate_history
  FOR INSERT TO authenticated
  WITH CHECK (
    performed_by = (SELECT auth.uid())
    AND public.org_visible(organization_id)
  );

CREATE POLICY "certificate_history_service_role_all" ON public.certificate_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
