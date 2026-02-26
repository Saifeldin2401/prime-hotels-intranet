-- Reclassify legacy orphaned "training" certificates that have no training linkage.
-- This keeps historical rows while enforcing strict training certificate integrity going forward.

UPDATE public.certificates
SET
  certificate_type = 'achievement',
  description = trim(
    both from concat_ws(
      E'\n',
      nullif(description, ''),
      'Auto-migrated from orphan training certificate on 2026-02-20.'
    )
  ),
  updated_at = now()
WHERE certificate_type = 'training'
  AND training_module_id IS NULL
  AND training_progress_id IS NULL;

ALTER TABLE public.certificates
VALIDATE CONSTRAINT certificates_training_source_check;;
