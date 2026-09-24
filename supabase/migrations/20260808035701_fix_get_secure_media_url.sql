-- Fix get_secure_media_url: it called storage.create_signed_url(...), which does not
-- exist anywhere in this database (signed URLs can only be minted via the Storage HTTP
-- API, reachable from supabase-js, not from plain SQL). It also inserted into a
-- media_access_logs table that does not exist.
--
-- Mirrors the get_secure_document_url fix: return the bare private-bucket object path
-- and let the TypeScript caller mint a short-lived signed URL via
-- supabase.storage.from(bucket).createSignedUrl(path, ttl). Access logging now goes to
-- the unified system_events table (matching useMedia.ts's getSecureDownloadUrl pattern).

DROP FUNCTION IF EXISTS public.get_secure_media_url(uuid, integer);

CREATE FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
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

  IF v_asset.storage_path IS NULL OR length(trim(v_asset.storage_path)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Log access into the unified system_events table (the media_access_logs table
  -- referenced by the previous version of this function does not exist).
  INSERT INTO public.system_events (
    event_type,
    entity_type,
    entity_id,
    actor_id,
    property_id,
    metadata
  ) VALUES (
    'media_access',
    'media',
    p_media_asset_id,
    auth.uid(),
    v_asset.property_id,
    jsonb_build_object(
      'access_type', 'download',
      'expiry_seconds', p_expiry_seconds,
      'mime_type', v_asset.mime_type,
      'storage_bucket', v_asset.storage_bucket
    )
  );

  -- The 'media' storage bucket is private -- a bare object path (no scheme) means the
  -- caller must mint its own short-lived signed URL for it via
  -- supabase.storage.from(storage_bucket).createSignedUrl(storage_path, ttl).
  RETURN v_asset.storage_path;
END;
$function$;
