BEGIN;

-- 1) Metadata columns for reliable KB author/editor/revision display
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS published_version_number integer,
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_published_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_updated_by_fkey'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_last_published_by_fkey'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_last_published_by_fkey
      FOREIGN KEY (last_published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_documents_updated_by ON public.documents(updated_by);
CREATE INDEX IF NOT EXISTS idx_documents_published_version_number ON public.documents(published_version_number);

-- 2) Snapshot table parity: keep description in versions too
ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS description text;

-- 3) Backfill metadata + baseline version rows
UPDATE public.documents
SET updated_by = COALESCE(updated_by, created_by)
WHERE updated_by IS NULL;

UPDATE public.document_versions dv
SET description = COALESCE(dv.description, (dv.metadata ->> 'description'), d.description)
FROM public.documents d
WHERE d.id = dv.document_id;

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
  description,
  content,
  status,
  metadata
)
SELECT
  d.id,
  GREATEST(COALESCE(d.current_version, 1), 1),
  d.file_url,
  COALESCE(d.storage_bucket, 'documents'),
  d.storage_path,
  'Baseline snapshot (KB hardening)',
  COALESCE(d.updated_by, d.created_by),
  d.title,
  d.description,
  d.content,
  d.status,
  jsonb_build_object(
    'source', 'kb_hardening_baseline',
    'captured_at', NOW(),
    'description', d.description
  )
FROM docs_missing_history d
ON CONFLICT (document_id, version_number) DO NOTHING;

UPDATE public.documents d
SET current_version = GREATEST(
  COALESCE(d.current_version, 1),
  COALESCE((
    SELECT MAX(dv.version_number)
    FROM public.document_versions dv
    WHERE dv.document_id = d.id
  ), 1)
)
WHERE TRUE;

UPDATE public.documents
SET published_version_number = current_version,
    last_published_at = COALESCE(last_published_at, updated_at),
    last_published_by = COALESCE(last_published_by, updated_by, created_by)
WHERE status = 'PUBLISHED'
  AND published_version_number IS NULL;

-- 4) Harden trigger so versions include description and publish pointer is stable
CREATE OR REPLACE FUNCTION public.capture_document_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_version integer;
  change_detected boolean;
  effective_actor uuid;
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN
    RETURN NEW;
  END IF;

  effective_actor := COALESCE(
    NEW.updated_by,
    (SELECT auth.uid()),
    OLD.updated_by,
    NEW.created_by,
    OLD.created_by
  );

  NEW.updated_by := COALESCE(NEW.updated_by, effective_actor);

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
    OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
    OR NEW.estimated_read_time IS DISTINCT FROM OLD.estimated_read_time;

  IF NOT change_detected THEN
    RETURN NEW;
  END IF;

  next_version := GREATEST(COALESCE(OLD.current_version, 1), 1) + 1;
  NEW.current_version := next_version;

  IF NEW.status = 'PUBLISHED' THEN
    NEW.published_version_number := next_version;
    NEW.last_published_at := NOW();
    NEW.last_published_by := COALESCE(effective_actor, NEW.last_published_by, OLD.last_published_by);
  ELSE
    NEW.published_version_number := COALESCE(OLD.published_version_number, NEW.published_version_number);
    NEW.last_published_at := COALESCE(OLD.last_published_at, NEW.last_published_at);
    NEW.last_published_by := COALESCE(OLD.last_published_by, NEW.last_published_by);
  END IF;

  INSERT INTO public.document_versions (
    document_id,
    version_number,
    file_url,
    storage_bucket,
    storage_path,
    change_summary,
    created_by,
    title,
    description,
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
    COALESCE(effective_actor, NEW.created_by, OLD.created_by),
    COALESCE(NEW.title, OLD.title),
    COALESCE(NEW.description, OLD.description),
    COALESCE(NEW.content, OLD.content),
    COALESCE(NEW.status, OLD.status),
    jsonb_build_object(
      'source', 'documents_trigger',
      'captured_at', NOW(),
      'captured_by', COALESCE(effective_actor::text, NEW.created_by::text, OLD.created_by::text),
      'description', COALESCE(NEW.description, OLD.description)
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
    description = EXCLUDED.description,
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

-- 5) One-time cleanup for legacy knowledge-base orphan rows
DELETE FROM public.document_versions dv
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = dv.document_id
);

DELETE FROM public.document_department_access dda
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = dda.document_id AND COALESCE(d.is_deleted, false) = false
);

DELETE FROM public.document_acknowledgments da
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = da.document_id AND COALESCE(d.is_deleted, false) = false
);

DELETE FROM public.document_bookmarks b
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = b.document_id AND COALESCE(d.is_deleted, false) = false
);

DELETE FROM public.document_feedback f
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = f.document_id AND COALESCE(d.is_deleted, false) = false
);

DELETE FROM public.sop_comments c
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.id = c.document_id AND COALESCE(d.is_deleted, false) = false
);

COMMIT;

NOTIFY pgrst, 'reload schema';;
