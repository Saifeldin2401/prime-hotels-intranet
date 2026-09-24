ALTER TABLE public.course_source_documents
  ADD COLUMN IF NOT EXISTS section_ref TEXT;

COMMENT ON COLUMN public.course_source_documents.section_ref IS
  'Optional per-section attribution pointer: NULL=course-level, or module:<id> / lesson:<id> / block:<id>.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_source_documents'::regclass
      AND conname  = 'course_source_documents_training_module_id_document_id_key'
  ) THEN
    ALTER TABLE public.course_source_documents
      DROP CONSTRAINT course_source_documents_training_module_id_document_id_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_source_documents'::regclass
      AND conname  = 'course_source_documents_module_doc_section_key'
  ) THEN
    ALTER TABLE public.course_source_documents
      ADD CONSTRAINT course_source_documents_module_doc_section_key
      UNIQUE NULLS NOT DISTINCT (training_module_id, document_id, section_ref);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS course_source_documents_section_ref_idx
  ON public.course_source_documents (section_ref) WHERE section_ref IS NOT NULL;
