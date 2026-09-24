-- ============================================================================
-- COURSE SOURCE DOCUMENTS
-- ----------------------------------------------------------------------------
-- When a user grounds AI course generation on a document (uploaded file or a
-- Knowledge Base / Document Library file), that original document is linked to
-- the generated course automatically — as part of the workflow, not a manual
-- step.
--
--   Source Document : the original the AI read to build the course.
--   Course Resource : a document intentionally published to learners.
--
-- This table records the link + useful provenance. The physical file lives ONCE
-- in `public.documents` (+ storage); this only references it.
--
--   * ON DELETE CASCADE on training_module_id -> deleting the course removes the
--     LINK, never the file.
--   * ON DELETE CASCADE on document_id -> if the file is hard-deleted from the
--     repository, dangling links go with it.
--   * Removing a link (DELETE FROM course_source_documents ...) leaves the file
--     untouched in the central repository.
--   * Visibility/access follows `documents` RLS: an internal/private SOP used as
--     a source does NOT become learner-visible just because it was linked. The
--     learner-facing query below runs under the learner's own RLS, so a file
--     they cannot read simply does not appear.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_source_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id  UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  document_id         UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  relationship        TEXT NOT NULL DEFAULT 'source'
                        CHECK (relationship IN ('source', 'resource')),
  is_primary          BOOLEAN NOT NULL DEFAULT false,
  original_filename   TEXT,
  file_type           TEXT,
  file_size           BIGINT,
  attached_by         UUID,
  attached_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  generation_job_id   UUID,
  UNIQUE (training_module_id, document_id)
);

CREATE INDEX IF NOT EXISTS course_source_documents_module_idx
  ON public.course_source_documents (training_module_id);
CREATE INDEX IF NOT EXISTS course_source_documents_document_idx
  ON public.course_source_documents (document_id);

COMMENT ON TABLE public.course_source_documents IS
  'Links a generated course to the document(s) that grounded it (source) or that are published to learners (resource). The file lives once in public.documents.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_source_documents ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can see the module. The learner-facing UI additionally joins
-- `documents` under the caller's RLS so private source files stay hidden.
DROP POLICY IF EXISTS course_source_documents_select ON public.course_source_documents;
CREATE POLICY course_source_documents_select ON public.course_source_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.training_modules tm WHERE tm.id = training_module_id)
  );

-- Write: the module's creator, or a training / corporate / super admin.
DROP POLICY IF EXISTS course_source_documents_write ON public.course_source_documents;
CREATE POLICY course_source_documents_write ON public.course_source_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.training_modules tm
      WHERE tm.id = training_module_id
        AND (
          tm.created_by = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = (SELECT auth.uid())
              AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','property_manager','property_hr'])
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_modules tm
      WHERE tm.id = training_module_id
        AND (
          tm.created_by = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = (SELECT auth.uid())
              AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','property_manager','property_hr'])
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- get_course_source_documents(module) — link rows + the document fields the
-- caller is allowed to see. SECURITY INVOKER so `documents` RLS still applies:
-- a private source file the caller cannot read comes back with nulls for the
-- protected fields (still shows it exists to an admin, hidden data to a learner).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_course_source_documents(p_training_module_id uuid)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  relationship text,
  is_primary boolean,
  original_filename text,
  file_type text,
  file_size bigint,
  attached_by uuid,
  attached_at timestamptz,
  doc_title text,
  doc_visibility text,
  doc_file_url text,
  doc_content_type text,
  caller_can_access boolean
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT
    csd.id,
    csd.document_id,
    csd.relationship,
    csd.is_primary,
    csd.original_filename,
    csd.file_type,
    csd.file_size,
    csd.attached_by,
    csd.attached_at,
    d.title,
    d.visibility::text,
    d.file_url,
    d.content_type,
    (d.id IS NOT NULL) AS caller_can_access
  FROM public.course_source_documents csd
  LEFT JOIN public.documents d ON d.id = csd.document_id
  WHERE csd.training_module_id = p_training_module_id
  ORDER BY csd.is_primary DESC, csd.attached_at ASC;
$function$;

REVOKE ALL ON FUNCTION public.get_course_source_documents(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_course_source_documents(uuid) TO authenticated;
