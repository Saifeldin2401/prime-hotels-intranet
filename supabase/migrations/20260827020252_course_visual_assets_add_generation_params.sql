-- The generate-course-image edge function writes these; without them every
-- persisted-asset insert was silently failing on this project.
ALTER TABLE public.course_visual_assets
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS steps INTEGER,
  ADD COLUMN IF NOT EXISTS guidance NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS seed BIGINT;
