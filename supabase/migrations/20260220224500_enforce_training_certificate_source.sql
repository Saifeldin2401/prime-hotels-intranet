-- Enforce that new training certificates always reference training context.

ALTER TABLE public.certificates
DROP CONSTRAINT IF EXISTS certificates_training_source_check;

ALTER TABLE public.certificates
ADD CONSTRAINT certificates_training_source_check
CHECK (
  certificate_type <> 'training'
  OR training_module_id IS NOT NULL
  OR training_progress_id IS NOT NULL
) NOT VALID;
