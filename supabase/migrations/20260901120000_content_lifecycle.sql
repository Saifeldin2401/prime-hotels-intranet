-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- CONTENT LIFECYCLE + REVIEW QUEUE  (shared governance layer)
--
-- Introduces one content-lifecycle state machine that spans the three
-- learning-platform content kinds:
--
--   course      -> public.training_modules
--   article     -> public.documents
--   assessment  -> public.learning_quizzes
--
-- What this migration adds:
--   1. content_status enum ....... draft | in_review | approved | published | archived
--   2. content_reviews ........... generic, per-submission review record + RLS
--   3. lifecycle columns ......... added to the 3 content tables (IF NOT EXISTS)
--   4. content_change_log ........ append-only audit trail, trigger-populated,
--                                  no direct INSERT for end users
--   5. source_change_flags ....... re-review flags raised when a course's
--                                  grounding document changes after the course
--                                  was last reviewed (+ the scanning function;
--                                  cron/trigger wiring is a follow-up, see note)
--
-- Idempotent: safe to re-run. All DDL guarded with IF NOT EXISTS / DO blocks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. content_status enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE public.content_status AS ENUM (
      'draft', 'in_review', 'approved', 'published', 'archived'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- helper: is the caller a content manager (training / knowledge / admin)?
-- Kept local to this migration's concerns; leans on the existing has_any_role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_content_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_any_role(
    _user_id,
    ARRAY[
      'super_admin', 'corporate_admin', 'regional_admin',
      'regional_hr', 'property_manager', 'property_hr'
    ]::app_role[]
  );
$function$;

REVOKE ALL ON FUNCTION public.is_content_manager(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_content_manager(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. content_reviews -- one row per submission of a piece of content for review
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL CHECK (content_type IN ('course', 'article', 'assessment')),
  content_id    UUID NOT NULL,
  status        public.content_status NOT NULL DEFAULT 'in_review',
  submitted_by  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes  TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reviews_content_idx
  ON public.content_reviews (content_type, content_id);
CREATE INDEX IF NOT EXISTS content_reviews_status_idx
  ON public.content_reviews (status);
CREATE INDEX IF NOT EXISTS content_reviews_submitted_by_idx
  ON public.content_reviews (submitted_by);
-- At most one open (in_review) review per piece of content.
CREATE UNIQUE INDEX IF NOT EXISTS content_reviews_one_open_per_content
  ON public.content_reviews (content_type, content_id)
  WHERE status = 'in_review';

COMMENT ON TABLE public.content_reviews IS
  'Generic review-queue record: one row each time a course/article/assessment is submitted for review. Drives src/pages/manage/ContentReviewQueue.tsx.';

ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

-- Read: the author sees their own submissions; content managers see everything.
DROP POLICY IF EXISTS content_reviews_select ON public.content_reviews;
CREATE POLICY content_reviews_select ON public.content_reviews
  FOR SELECT TO authenticated
  USING (
    submitted_by = (SELECT auth.uid())
    OR public.is_content_manager((SELECT auth.uid()))
  );

-- Insert: authors may only submit in their own name, and only as in_review.
DROP POLICY IF EXISTS content_reviews_insert ON public.content_reviews;
CREATE POLICY content_reviews_insert ON public.content_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (SELECT auth.uid())
    AND status = 'in_review'
  );

-- Update: only content managers can move a review forward (approve / request
-- changes / publish / archive). Authors cannot self-approve.
DROP POLICY IF EXISTS content_reviews_update ON public.content_reviews;
CREATE POLICY content_reviews_update ON public.content_reviews
  FOR UPDATE TO authenticated
  USING (public.is_content_manager((SELECT auth.uid())))
  WITH CHECK (public.is_content_manager((SELECT auth.uid())));

-- No DELETE policy: review history is never removed.

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_content_reviews_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS content_reviews_touch ON public.content_reviews;
CREATE TRIGGER content_reviews_touch
  BEFORE UPDATE ON public.content_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_reviews_touch();

-- ---------------------------------------------------------------------------
-- 3. lifecycle columns on the three content tables
--    Only added where missing (documents already carries owner_id /
--    last_reviewed_at from earlier migrations).
-- ---------------------------------------------------------------------------
ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS lifecycle_status  public.content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS owner_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_due_on     DATE,
  ADD COLUMN IF NOT EXISTS expires_on        DATE,
  ADD COLUMN IF NOT EXISTS last_reviewed_at  TIMESTAMPTZ;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS lifecycle_status  public.content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS owner_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_due_on     DATE,
  ADD COLUMN IF NOT EXISTS expires_on        DATE,
  ADD COLUMN IF NOT EXISTS last_reviewed_at  TIMESTAMPTZ;

ALTER TABLE public.learning_quizzes
  ADD COLUMN IF NOT EXISTS lifecycle_status  public.content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS owner_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_due_on     DATE,
  ADD COLUMN IF NOT EXISTS expires_on        DATE,
  ADD COLUMN IF NOT EXISTS last_reviewed_at  TIMESTAMPTZ;

-- Backfill owner_id from the historical creator where we have one.
UPDATE public.training_modules  SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.documents         SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.learning_quizzes  SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. content_change_log -- append-only audit trail
--    End users have NO INSERT path. Rows arrive only through the SECURITY
--    DEFINER logging function, called by triggers.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_change_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type   TEXT NOT NULL CHECK (content_type IN ('course', 'article', 'assessment')),
  content_id     UUID NOT NULL,
  actor          UUID,
  change_summary TEXT NOT NULL,
  at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_change_log_content_idx
  ON public.content_change_log (content_type, content_id, at DESC);

COMMENT ON TABLE public.content_change_log IS
  'Append-only. No end-user INSERT/UPDATE/DELETE. Populated exclusively by public.log_content_change() via triggers.';

ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

-- Read: the piece of content''s submitters and content managers.
DROP POLICY IF EXISTS content_change_log_select ON public.content_change_log;
CREATE POLICY content_change_log_select ON public.content_change_log
  FOR SELECT TO authenticated
  USING (
    actor = (SELECT auth.uid())
    OR public.is_content_manager((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.content_reviews cr
      WHERE cr.content_type = content_change_log.content_type
        AND cr.content_id = content_change_log.content_id
        AND cr.submitted_by = (SELECT auth.uid())
    )
  );

-- Deliberately NO insert / update / delete policy: RLS denies all writes from
-- PostgREST. The logging function below is SECURITY DEFINER and bypasses this.
REVOKE INSERT, UPDATE, DELETE ON public.content_change_log FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_content_change(
  p_content_type   text,
  p_content_id     uuid,
  p_actor          uuid,
  p_change_summary text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  INSERT INTO public.content_change_log (content_type, content_id, actor, change_summary)
  VALUES (p_content_type, p_content_id, p_actor, p_change_summary);
$function$;

REVOKE ALL ON FUNCTION public.log_content_change(text, uuid, uuid, text) FROM public, anon;
-- Not granted to authenticated: only trigger functions (which run as owner) call it.

-- Trigger: every content_reviews insert/update writes a log line.
CREATE OR REPLACE FUNCTION public.tg_content_reviews_changelog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_summary text;
  v_actor   uuid := COALESCE(auth.uid(), NEW.reviewed_by, NEW.submitted_by);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := 'submitted for review';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_summary := format('review status %s -> %s', OLD.status, NEW.status)
                 || COALESCE(': ' || NULLIF(btrim(NEW.review_notes), ''), '');
  ELSE
    v_summary := 'review record updated';
  END IF;

  PERFORM public.log_content_change(NEW.content_type, NEW.content_id, v_actor, v_summary);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS content_reviews_changelog ON public.content_reviews;
CREATE TRIGGER content_reviews_changelog
  AFTER INSERT OR UPDATE ON public.content_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_content_reviews_changelog();

-- ---------------------------------------------------------------------------
-- 5. source_change_flags -- "your grounding document moved on, re-review"
--
-- When a course_source_documents source''s parent document.updated_at advances
-- past the course''s last_reviewed_at, we raise a flag so the course shows up
-- in the review queue again.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_change_flags (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id       UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  document_id              UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  source_updated_at        TIMESTAMPTZ NOT NULL,
  course_last_reviewed_at  TIMESTAMPTZ,
  flagged_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (training_module_id, document_id, source_updated_at)
);

CREATE INDEX IF NOT EXISTS source_change_flags_open_idx
  ON public.source_change_flags (training_module_id)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.source_change_flags IS
  'Open row = a course whose grounding document changed after the course was last reviewed. Raised by public.scan_source_change_flags().';

ALTER TABLE public.source_change_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_change_flags_select ON public.source_change_flags;
CREATE POLICY source_change_flags_select ON public.source_change_flags
  FOR SELECT TO authenticated
  USING (
    public.is_content_manager((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.training_modules tm
      WHERE tm.id = training_module_id
        AND (tm.created_by = (SELECT auth.uid()) OR tm.owner_id = (SELECT auth.uid()))
    )
  );

-- Managers can resolve (mark reviewed) a flag.
DROP POLICY IF EXISTS source_change_flags_update ON public.source_change_flags;
CREATE POLICY source_change_flags_update ON public.source_change_flags
  FOR UPDATE TO authenticated
  USING (public.is_content_manager((SELECT auth.uid())))
  WITH CHECK (public.is_content_manager((SELECT auth.uid())));

REVOKE INSERT, DELETE ON public.source_change_flags FROM authenticated, anon;

-- Scanner: insert a flag for every stale (source moved past last review) link
-- that does not already have an open flag for that exact source_updated_at.
-- Returns the number of new flags raised. SECURITY DEFINER so it can write the
-- table regardless of caller.
CREATE OR REPLACE FUNCTION public.scan_source_change_flags()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_inserted integer;
BEGIN
  WITH stale AS (
    SELECT
      csd.training_module_id,
      csd.document_id,
      d.updated_at            AS source_updated_at,
      tm.last_reviewed_at     AS course_last_reviewed_at
    FROM public.course_source_documents csd
    JOIN public.documents d          ON d.id = csd.document_id
    JOIN public.training_modules tm  ON tm.id = csd.training_module_id
    WHERE csd.relationship = 'source'
      AND tm.is_deleted IS NOT TRUE
      AND d.updated_at > COALESCE(tm.last_reviewed_at, tm.created_at)
  ),
  ins AS (
    INSERT INTO public.source_change_flags (
      training_module_id, document_id, source_updated_at, course_last_reviewed_at
    )
    SELECT training_module_id, document_id, source_updated_at, course_last_reviewed_at
    FROM stale
    ON CONFLICT (training_module_id, document_id, source_updated_at) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_source_change_flags() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.scan_source_change_flags() TO authenticated;

-- ---------------------------------------------------------------------------
-- FOLLOW-UP (not wired here, on purpose):
--
--   * Schedule the scanner. Either:
--       SELECT cron.schedule('scan-source-change-flags', '0 * * * *',
--                            $$SELECT public.scan_source_change_flags();$$);
--     (pg_cron is already used in this project -- see the AI ops cron jobs),
--     OR add an AFTER UPDATE trigger on public.documents that calls the scanner
--     for the affected document only.
--
--   * The review queue reads open source_change_flags to surface "needs
--     re-review" courses alongside pending content_reviews rows.
-- ---------------------------------------------------------------------------
