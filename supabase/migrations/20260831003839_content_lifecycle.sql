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
CREATE UNIQUE INDEX IF NOT EXISTS content_reviews_one_open_per_content
  ON public.content_reviews (content_type, content_id)
  WHERE status = 'in_review';

ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reviews_select ON public.content_reviews;
CREATE POLICY content_reviews_select ON public.content_reviews
  FOR SELECT TO authenticated
  USING (
    submitted_by = (SELECT auth.uid())
    OR public.is_content_manager((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS content_reviews_insert ON public.content_reviews;
CREATE POLICY content_reviews_insert ON public.content_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (SELECT auth.uid())
    AND status = 'in_review'
  );

DROP POLICY IF EXISTS content_reviews_update ON public.content_reviews;
CREATE POLICY content_reviews_update ON public.content_reviews
  FOR UPDATE TO authenticated
  USING (public.is_content_manager((SELECT auth.uid())))
  WITH CHECK (public.is_content_manager((SELECT auth.uid())));

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

UPDATE public.training_modules  SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.documents         SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.learning_quizzes  SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

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

ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS source_change_flags_update ON public.source_change_flags;
CREATE POLICY source_change_flags_update ON public.source_change_flags
  FOR UPDATE TO authenticated
  USING (public.is_content_manager((SELECT auth.uid())))
  WITH CHECK (public.is_content_manager((SELECT auth.uid())));

REVOKE INSERT, DELETE ON public.source_change_flags FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.scan_source_change_flags()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_inserted integer;
  v_count integer;
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
  SELECT count(*) INTO v_count FROM ins;

  RETURN COALESCE(v_count, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_source_change_flags() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.scan_source_change_flags() TO authenticated;
