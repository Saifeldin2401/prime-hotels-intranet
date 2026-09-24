-- Migration: 20260827110000_course_visual_assets_add_generation_params.sql
-- Description: The generate-course-image edge function writes width/height/steps/
--   guidance/seed on the asset row; without these columns every persisted-asset
--   insert silently failed (caught, degraded to an in-memory-only asset).

ALTER TABLE public.course_visual_assets
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS steps INTEGER,
  ADD COLUMN IF NOT EXISTS guidance NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS seed BIGINT;
