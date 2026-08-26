-- Migration: 20260826110000_course_visual_assets.sql
-- Description: Creates course_visual_assets table for AI-generated visuals orchestrated by Main AI

-- 1. Create table for course visual assets
CREATE TABLE IF NOT EXISTS public.course_visual_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  content_block_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'content-media',
  title TEXT NOT NULL,
  title_ar TEXT,
  alt_text TEXT NOT NULL,
  alt_text_ar TEXT,
  caption TEXT,
  caption_ar TEXT,
  educational_purpose TEXT NOT NULL DEFAULT 'concept_illustration',
  visual_concept TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  visual_style TEXT NOT NULL DEFAULT 'educational_illustration',
  placement TEXT NOT NULL DEFAULT 'concept_explanation',
  provider TEXT NOT NULL DEFAULT 'openrouter',
  model TEXT NOT NULL DEFAULT 'recraft/recraft-v3:free',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'disabled')),
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_course_visual_assets_course ON public.course_visual_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_course_visual_assets_lesson ON public.course_visual_assets(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_visual_assets_status ON public.course_visual_assets(status);

-- 3. Enable RLS
ALTER TABLE public.course_visual_assets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "course_visual_assets_select" ON public.course_visual_assets;
CREATE POLICY "course_visual_assets_select" ON public.course_visual_assets
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "course_visual_assets_insert" ON public.course_visual_assets;
CREATE POLICY "course_visual_assets_insert" ON public.course_visual_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'property_manager', 'department_head', 'manager')
    )
  );

DROP POLICY IF EXISTS "course_visual_assets_update" ON public.course_visual_assets;
CREATE POLICY "course_visual_assets_update" ON public.course_visual_assets
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'property_manager', 'department_head', 'manager')
    )
  );

DROP POLICY IF EXISTS "course_visual_assets_delete" ON public.course_visual_assets;
CREATE POLICY "course_visual_assets_delete" ON public.course_visual_assets
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'property_manager', 'department_head', 'manager')
    )
  );

-- 5. Ensure Storage Bucket content-media exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
