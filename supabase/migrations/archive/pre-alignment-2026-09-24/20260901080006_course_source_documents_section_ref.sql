-- ============================================================================
-- APPLY ON STAGING FIRST
-- ----------------------------------------------------------------------------
-- Learning domain model, part 6 of 6: PER-SECTION SOURCE ATTRIBUTION
--
-- Extends public.course_source_documents so the same source file can be
-- attributed to more than one place inside a course:
--
--   section_ref TEXT  free-form section pointer. Convention:
--       NULL                         -> course-level source (unchanged behaviour)
--       'module:<course_module_id>'  -> grounded a specific module/section
--       'lesson:<lesson_id>'         -> grounded a specific lesson
--       'block:<lesson_block_id>'    -> grounded a specific block
--
-- The old UNIQUE (training_module_id, document_id) becomes
-- UNIQUE NULLS NOT DISTINCT (training_module_id, document_id, section_ref) so a
-- file may appear once per section but not be double-attributed to the same one.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.course_source_documents
  ADD COLUMN IF NOT EXISTS section_ref TEXT;

COMMENT ON COLUMN public.course_source_documents.section_ref IS
  'Optional per-section attribution pointer: NULL=course-level, or module:<id> / lesson:<id> / block:<id>.';

-- Swap the uniqueness rule.
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
