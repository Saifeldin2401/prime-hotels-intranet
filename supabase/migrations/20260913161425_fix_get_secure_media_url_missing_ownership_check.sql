
-- get_secure_media_url only checked "is the caller authenticated" -- any logged-in user
-- from ANY tenant could pass any media_asset_id UUID and receive the storage bucket+path
-- for that asset regardless of which organization it belongs to, with no ownership or
-- visibility check. Add an org_visible()/uploaded_by/is_public check, matching the access
-- model already used elsewhere (search_sops, etc.), before returning the path.
CREATE OR REPLACE FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer DEFAULT 3600)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_storage_path text;
  v_storage_bucket text;
  v_organization_id uuid;
  v_uploaded_by uuid;
  v_is_public boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT storage_path, storage_bucket, organization_id, uploaded_by, COALESCE(is_public, false)
  INTO v_storage_path, v_storage_bucket, v_organization_id, v_uploaded_by, v_is_public
  FROM public.media_assets
  WHERE id = p_media_asset_id;

  IF v_storage_path IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    v_is_public
    OR v_uploaded_by = v_caller
    OR public.is_platform_operator()
    OR (v_organization_id IS NOT NULL AND public.org_visible(v_organization_id))
  ) THEN
    RAISE EXCEPTION 'Access denied: not authorized to view this media asset' USING ERRCODE = '42501';
  END IF;

  IF v_storage_path LIKE 'http%' THEN
    RETURN v_storage_path;
  END IF;

  RETURN json_build_object(
    'bucket', COALESCE(v_storage_bucket, 'media'),
    'path', v_storage_path
  )::text;
END;
$function$;
