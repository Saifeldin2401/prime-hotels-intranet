-- Document versioning hardening:
-- 1) Store title/content/status snapshots per version.
-- 2) Auto-capture versions on document updates.
-- 3) Backfill baseline version rows for existing documents.

BEGIN;

ALTER TABLE public.document_versions
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS status public.document_status,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.document_versions dv
SET
  title = COALESCE(dv.title, d.title),
  content = COALESCE(dv.content, d.content),
  status = COALESCE(dv.status, d.status),
  metadata = COALESCE(dv.metadata, '{}'::jsonb)
FROM public.documents d
WHERE d.id = dv.document_id;

CREATE OR REPLACE FUNCTION public.capture_document_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_version integer;
  change_detected boolean;
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN
    RETURN NEW;
  END IF;

  change_detected :=
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.content IS DISTINCT FROM OLD.content
    OR NEW.content_ar IS DISTINCT FROM OLD.content_ar
    OR NEW.file_url IS DISTINCT FROM OLD.file_url
    OR NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket
    OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.checklist_items IS DISTINCT FROM OLD.checklist_items
    OR NEW.faq_items IS DISTINCT FROM OLD.faq_items
    OR NEW.video_url IS DISTINCT FROM OLD.video_url
    OR NEW.images IS DISTINCT FROM OLD.images
    OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
    OR NEW.valid_until IS DISTINCT FROM OLD.valid_until;

  IF NOT change_detected THEN
    RETURN NEW;
  END IF;

  next_version := GREATEST(COALESCE(OLD.current_version, 1), 1) + 1;
  NEW.current_version := next_version;

  INSERT INTO public.document_versions (
    document_id,
    version_number,
    file_url,
    storage_bucket,
    storage_path,
    change_summary,
    created_by,
    title,
    content,
    status,
    metadata
  )
  VALUES (
    OLD.id,
    next_version,
    NEW.file_url,
    COALESCE(NEW.storage_bucket, 'documents'),
    NEW.storage_path,
    'Auto-snapshot from document update',
    COALESCE((SELECT auth.uid()), NEW.created_by, OLD.created_by),
    COALESCE(NEW.title, OLD.title),
    COALESCE(NEW.content, OLD.content),
    COALESCE(NEW.status, OLD.status),
    jsonb_build_object(
      'source', 'documents_trigger',
      'captured_at', NOW(),
      'captured_by', COALESCE((SELECT auth.uid())::text, NEW.created_by::text, OLD.created_by::text)
    )
  )
  ON CONFLICT (document_id, version_number)
  DO UPDATE SET
    file_url = EXCLUDED.file_url,
    storage_bucket = EXCLUDED.storage_bucket,
    storage_path = EXCLUDED.storage_path,
    change_summary = EXCLUDED.change_summary,
    created_by = EXCLUDED.created_by,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_document_version ON public.documents;

CREATE TRIGGER trg_capture_document_version
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.capture_document_version();

WITH docs_missing_history AS (
  SELECT d.*
  FROM public.documents d
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.document_versions dv
    WHERE dv.document_id = d.id
  )
)
INSERT INTO public.document_versions (
  document_id,
  version_number,
  file_url,
  storage_bucket,
  storage_path,
  change_summary,
  created_by,
  title,
  content,
  status,
  metadata
)
SELECT
  d.id,
  1,
  d.file_url,
  COALESCE(d.storage_bucket, 'documents'),
  d.storage_path,
  'Baseline snapshot',
  d.created_by,
  d.title,
  d.content,
  d.status,
  jsonb_build_object(
    'source', 'baseline_backfill',
    'captured_at', NOW()
  )
FROM docs_missing_history d;

UPDATE public.documents
SET current_version = COALESCE(current_version, 1)
WHERE current_version IS NULL OR current_version < 1;

COMMIT;

NOTIFY pgrst, 'reload schema';;
