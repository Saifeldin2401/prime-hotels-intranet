-- The TrainingBuilder reads/writes these columns but they were missing from
-- training_modules, so saving AND publishing a module failed with PGRST204
-- ("column not found") — the core "create training" flow was fully broken.

ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Existing modules predate the status column; treat them as live/published so
-- they remain visible to learners.
UPDATE public.training_modules
SET status = 'published'
WHERE status = 'draft' AND is_deleted IS NOT TRUE;
