-- ==============================================================================
-- Migration: 20260905230000_fix_video_upload_and_media_storage.sql
-- Description: Fix video uploads across training builder, media library, and content editor
-- Remediations:
--   1. Create and configure 'media' storage bucket (public, 500MB, full media MIME types)
--   2. Fix 'content-media' bucket (public = true, 500MB, full media MIME types)
--   3. Fix 'training-content' bucket (public = true, 500MB, video/audio/doc MIME types)
--   4. Fix storage.objects RLS policies for content-media, training-content, and media
--   5. Fix media_assets INSERT RLS policy to permit uploaded_by = auth.uid()
-- ==============================================================================

BEGIN;

-- 1. Buckets: create/update media, content-media, training-content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  524288000,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg', 'video/avi', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg', 'video/avi', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
WHERE id = 'content-media';

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg', 'video/avi', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
WHERE id = 'training-content';

-- 2. content-media RLS policies
DROP POLICY IF EXISTS content_media_select ON storage.objects;
CREATE POLICY content_media_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'content-media');

DROP POLICY IF EXISTS content_media_insert ON storage.objects;
CREATE POLICY content_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS content_media_update ON storage.objects;
CREATE POLICY content_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS content_media_delete ON storage.objects;
CREATE POLICY content_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- 3. training-content RLS policies
DROP POLICY IF EXISTS training_content_select ON storage.objects;
CREATE POLICY training_content_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'training-content');

DROP POLICY IF EXISTS training_content_insert ON storage.objects;
CREATE POLICY training_content_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-content'
    AND (
      public.is_platform_operator()
      OR (storage.foldername(name))[1] = 'training'
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
      )
    )
  );

DROP POLICY IF EXISTS training_content_update ON storage.objects;
CREATE POLICY training_content_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'training-content'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = 'training'
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS training_content_delete ON storage.objects;
CREATE POLICY training_content_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-content'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = 'training'
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

-- 4. media bucket RLS policies
DROP POLICY IF EXISTS "Media bucket select policy" ON storage.objects;
CREATE POLICY "Media bucket select policy" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Media bucket insert policy" ON storage.objects;
CREATE POLICY "Media bucket insert policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.is_platform_operator()
    )
  );

-- 5. media_assets table insert policy
DROP POLICY IF EXISTS media_assets_insert_multi_tenant ON public.media_assets;
CREATE POLICY media_assets_insert_multi_tenant ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    OR has_tenant_access(organization_id)
  );

COMMIT;
