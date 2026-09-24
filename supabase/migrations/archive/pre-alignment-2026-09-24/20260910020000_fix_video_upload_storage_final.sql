-- ==============================================================================
-- Migration: fix_video_upload_storage_final
-- Description: Final, idempotent fix for video upload across all upload paths
--
-- Problem: Three conflicting migrations (P13 hardening, Phase 59 tenant isolation,
--          and a prior fix attempt) created storage.objects RLS policies incompatible
--          with the frontend's actual storage path formats.
--
-- Fixes:
--   1. Ensures media, content-media, training-content buckets are public with
--      500MB limit and full media MIME types
--   2. Rewrites content-media INSERT policy to allow user_id-prefixed paths
--   3. Rewrites training-content INSERT policy to allow 'training/' prefix paths
--   4. Fixes media bucket policies for user_id-prefixed paths
--   5. Adds permissive media_assets INSERT policy for authenticated users
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. BUCKETS: Ensure all three exist and are configured correctly
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true, 524288000, -- 500 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    'video/ogg','video/avi','video/x-msvideo','video/3gpp',
    'audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 524288000,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media', 'content-media', true, 524288000,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    'video/ogg','video/avi','video/x-msvideo','video/3gpp',
    'audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 524288000,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-content', 'training-content', true, 524288000,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    'video/ogg','video/avi','video/x-msvideo','video/3gpp',
    'audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 524288000,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ──────────────────────────────────────────────────────────────────────
-- 2. CONTENT-MEDIA storage.objects RLS policies
--    Frontend path: {user_id}/images/... or {user_id}/videos/...
--    Also supports: {org_id}/... for tenant-scoped uploads
-- ──────────────────────────────────────────────────────────────────────

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
      -- Platform operators can upload anywhere
      public.is_platform_operator()
      -- User's own folder (user_id as first path segment)
      OR (storage.foldername(name))[1] = (auth.uid())::text
      -- Org-scoped path: first segment is an org UUID the user belongs to
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
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
      )
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- 3. TRAINING-CONTENT storage.objects RLS policies
--    Frontend path: training/videos/{uuid}.ext  (legacy)
--    Also supports: {org_id}/training/videos/... (org-scoped)
--    Also supports: {user_id}/... (direct user folder)
-- ──────────────────────────────────────────────────────────────────────

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
      -- Platform operators can upload anywhere
      public.is_platform_operator()
      -- Legacy path: training/videos/..., training/images/..., training/audios/...
      OR (storage.foldername(name))[1] = 'training'
      -- User's own folder
      OR (storage.foldername(name))[1] = (auth.uid())::text
      -- Org-scoped path
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
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
      )
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
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
      )
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- 4. MEDIA bucket storage.objects RLS policies
--    Frontend path (useMedia.ts): {user_id}/video/{uuid8}/{filename}
-- ──────────────────────────────────────────────────────────────────────

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
      -- User's own folder
      (storage.foldername(name))[1] = (auth.uid())::text
      -- Platform operators
      OR public.is_platform_operator()
      -- Org-scoped path
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
      )
    )
  );

DROP POLICY IF EXISTS "Media bucket update policy" ON storage.objects;
CREATE POLICY "Media bucket update policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR public.is_platform_operator()
    )
  );

DROP POLICY IF EXISTS "Media bucket delete policy" ON storage.objects;
CREATE POLICY "Media bucket delete policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = (auth.uid())::text
      OR public.is_platform_operator()
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- 5. MEDIA_ASSETS table INSERT policy
--    Allow any authenticated user to insert if uploaded_by = auth.uid()
--    or if they have tenant access to the organization_id
-- ──────────────────────────────────────────────────────────────────────

-- Drop restrictive baseline policy that requires admin roles
DROP POLICY IF EXISTS media_assets_insert ON public.media_assets;
-- Drop prior fix attempt policy name
DROP POLICY IF EXISTS media_assets_insert_multi_tenant ON public.media_assets;

CREATE POLICY media_assets_insert ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    OR has_tenant_access(organization_id)
    OR public.is_platform_operator()
  );
