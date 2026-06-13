-- Align documents schema with current app usage and advisor-reported missing FK indexes.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS last_published_by uuid,
  ADD COLUMN IF NOT EXISTS linked_training_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::regclass
      AND conname = 'documents_last_published_by_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_last_published_by_fkey
      FOREIGN KEY (last_published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::regclass
      AND conname = 'documents_linked_training_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_linked_training_id_fkey
      FOREIGN KEY (linked_training_id) REFERENCES public.training_modules(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_last_published_by
  ON public.documents(last_published_by);

CREATE INDEX IF NOT EXISTS idx_documents_linked_training_id
  ON public.documents(linked_training_id);
