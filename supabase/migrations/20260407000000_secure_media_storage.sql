-- Migration: Secure Media Storage and Access Logging
-- Date: 2026-04-07
-- Description: Implements comprehensive security for media uploads including
-- private bucket configuration, RLS policies, and access logging

BEGIN;

-- =============================================================================
-- 1. CREATE MEDIA STORAGE BUCKET (PRIVATE BY DEFAULT)
-- =============================================================================

-- Create the media bucket if it doesn't exist (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false, -- Private bucket (no public access)
  524288000, -- 500MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

-- =============================================================================
-- 2. STORAGE RLS POLICIES FOR MEDIA BUCKET
-- =============================================================================

-- Enable RLS on storage.objects (commented out to avoid owner permission error)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Media bucket select policy" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket update policy" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket delete policy" ON storage.objects;

-- Policy: Users can view media files if they have property access or uploaded the file
CREATE POLICY "Media bucket select policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    -- User uploaded the file
    (storage.foldername(name))[1] = auth.uid()::text
    -- Or user has access to the property (checked via media_assets table)
    OR EXISTS (
      SELECT 1 FROM media_assets ma
      WHERE ma.storage_path = storage.objects.name
      AND (
        ma.is_public = true
        OR ma.uploaded_by = auth.uid()
        OR ma.property_id IS NULL
        OR public.has_property_access(auth.uid(), ma.property_id)
        OR public.has_role_optimized('regional_admin'::public.app_role)
        OR public.has_role_optimized('corporate_admin'::public.app_role)
      )
    )
  )
);

-- Policy: Authenticated users can upload to media bucket
CREATE POLICY "Media bucket insert policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.extension(name)) IN (
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'webm', 'mov',
    'mp3', 'wav', 'ogg',
    'pdf', 'doc', 'docx', 'txt'
  )
);

-- Policy: Users can only update their own uploads
CREATE POLICY "Media bucket update policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only delete their own uploads (or admins)
CREATE POLICY "Media bucket delete policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
  )
);

-- =============================================================================
-- 3. MEDIA ACCESS LOGGING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.media_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_type TEXT NOT NULL DEFAULT 'view' CHECK (access_type IN ('view', 'download', 'share')),
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for access logs
CREATE INDEX IF NOT EXISTS idx_media_access_logs_asset 
ON public.media_access_logs(media_asset_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_access_logs_user 
ON public.media_access_logs(accessed_by, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_access_logs_time 
ON public.media_access_logs(accessed_at DESC);

-- Enable RLS on access logs
ALTER TABLE public.media_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own access logs
DROP POLICY IF EXISTS media_access_logs_select ON public.media_access_logs;
CREATE POLICY media_access_logs_select
  ON public.media_access_logs FOR SELECT
  TO authenticated
  USING (
    accessed_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  );

-- Policy: System can insert access logs
DROP POLICY IF EXISTS media_access_logs_insert ON public.media_access_logs;
CREATE POLICY media_access_logs_insert
  ON public.media_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- 4. FUNCTION TO GET SECURE MEDIA URL WITH ACCESS LOGGING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_secure_media_url(
  p_media_asset_id UUID,
  p_expiry_seconds INTEGER DEFAULT 3600
)
RETURNS TABLE (
  signed_url TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_asset RECORD;
  v_signed_url TEXT;
BEGIN
  -- Get asset details
  SELECT 
    ma.id,
    ma.storage_bucket,
    ma.storage_path,
    ma.uploaded_by,
    ma.property_id,
    ma.is_public,
    ma.mime_type
  INTO v_asset
  FROM media_assets ma
  WHERE ma.id = p_media_asset_id
  AND ma.is_archived = false;

  -- Check if asset exists
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Media asset not found or archived';
  END IF;

  -- Check authorization
  IF NOT (
    v_asset.is_public
    OR v_asset.uploaded_by = auth.uid()
    OR v_asset.property_id IS NULL
    OR public.has_property_access(auth.uid(), v_asset.property_id)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this media asset';
  END IF;

  -- Generate signed URL
  SELECT storage.create_signed_url(
    v_asset.storage_bucket,
    v_asset.storage_path,
    p_expiry_seconds
  )
  INTO v_signed_url;

  IF v_signed_url IS NULL OR length(trim(v_signed_url)) = 0 THEN
    RAISE EXCEPTION 'Failed to generate secure URL';
  END IF;

  -- Log access (in background via async, but here we just insert)
  INSERT INTO media_access_logs (
    media_asset_id,
    accessed_by,
    access_type,
    metadata
  ) VALUES (
    p_media_asset_id,
    auth.uid(),
    'download',
    jsonb_build_object(
      'expiry_seconds', p_expiry_seconds,
      'mime_type', v_asset.mime_type
    )
  );

  RETURN QUERY SELECT v_signed_url, now() + (p_expiry_seconds || ' seconds')::interval;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_secure_media_url(UUID, INTEGER) TO authenticated;

-- =============================================================================
-- 5. FUNCTION TO CLEANUP ORPHANED STORAGE FILES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_media_files()
RETURNS TABLE (
  deleted_count INTEGER,
  errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_record RECORD;
BEGIN
  -- Only allow admins to run this
  IF NOT (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only administrators can run cleanup';
  END IF;

  -- Find storage objects without corresponding media_assets records
  FOR v_record IN 
    SELECT so.name, so.bucket_id
    FROM storage.objects so
    WHERE so.bucket_id = 'media'
    AND NOT EXISTS (
      SELECT 1 FROM media_assets ma 
      WHERE ma.storage_path = so.name
    )
    AND so.created_at < now() - interval '24 hours' -- Safety buffer
  LOOP
    BEGIN
      DELETE FROM storage.objects 
      WHERE name = v_record.name 
      AND bucket_id = v_record.bucket_id;
      
      v_deleted := v_deleted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 
        format('Failed to delete %s: %s', v_record.name, SQLERRM)
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_deleted, v_errors;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_media_files() TO authenticated;

-- =============================================================================
-- 6. ADD SECURITY FIELDS TO MEDIA_ASSETS TABLE
-- =============================================================================

-- Add columns for enhanced security tracking if they don't exist
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS virus_scan_status TEXT DEFAULT 'pending' 
  CHECK (virus_scan_status IN ('pending', 'clean', 'suspicious', 'infected', 'error')),
ADD COLUMN IF NOT EXISTS virus_scan_score INTEGER DEFAULT 0 
  CHECK (virus_scan_score >= 0 AND virus_scan_score <= 100),
ADD COLUMN IF NOT EXISTS sha256_hash TEXT,
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

-- Index for security queries
CREATE INDEX IF NOT EXISTS idx_media_assets_security 
ON public.media_assets(virus_scan_status, scanned_at);

CREATE INDEX IF NOT EXISTS idx_media_assets_hash 
ON public.media_assets(sha256_hash);

-- =============================================================================
-- 7. TRIGGER TO AUTO-DELETE STORAGE FILE ON MEDIA_ASSET DELETE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_delete_media_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete the associated storage object
  DELETE FROM storage.objects
  WHERE bucket_id = OLD.storage_bucket
  AND name = OLD.storage_path;
  
  RETURN OLD;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS auto_delete_media_storage_trigger ON public.media_assets;

-- Create trigger
CREATE TRIGGER auto_delete_media_storage_trigger
  AFTER DELETE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_delete_media_storage();

-- =============================================================================
-- 8. UPDATE MEDIA ASSETS TABLE FOR SECURE URL HANDLING
-- =============================================================================

-- Add content_disposition field for downloads
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS content_disposition TEXT DEFAULT 'inline'
  CHECK (content_disposition IN ('inline', 'attachment'));

-- Function to set content disposition header
CREATE OR REPLACE FUNCTION public.set_media_download_headers(
  p_media_asset_id UUID,
  p_disposition TEXT DEFAULT 'attachment'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_asset RECORD;
BEGIN
  -- Verify ownership or admin access
  SELECT * INTO v_asset
  FROM media_assets
  WHERE id = p_media_asset_id;

  IF v_asset IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (
    v_asset.uploaded_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  ) THEN
    RETURN false;
  END IF;

  UPDATE media_assets
  SET content_disposition = p_disposition
  WHERE id = p_media_asset_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_media_download_headers(UUID, TEXT) TO authenticated;

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
