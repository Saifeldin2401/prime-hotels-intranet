
-- Fix get_secure_document_url to not call non-existent storage.create_signed_url
-- Instead, construct the public URL directly since the documents bucket is public,
-- or return the raw storage_bucket + storage_path for the frontend to generate a signed URL.
CREATE OR REPLACE FUNCTION public.get_secure_document_url(document_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc record;
  v_storage_path text;
  v_bucket text;
  v_host text;
BEGIN
  SELECT d.id, d.file_url, d.storage_bucket, d.storage_path
  INTO doc
  FROM public.documents d
  WHERE d.id = document_id
  LIMIT 1;

  IF doc IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  IF NOT public.can_view_document(document_id) THEN
    RAISE EXCEPTION 'Not authorized to access this document';
  END IF;

  v_bucket := COALESCE(NULLIF(doc.storage_bucket, ''), 'documents');
  v_storage_path := COALESCE(
    NULLIF(doc.storage_path, ''),
    public.extract_storage_path_from_url(doc.file_url, v_bucket)
  );

  -- If we have bucket + path, construct the public storage URL directly
  IF v_storage_path IS NOT NULL AND length(trim(v_storage_path)) > 0 THEN
    v_host := COALESCE(
      NULLIF((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
      'dhbfaclkfysqwfppuxxa.supabase.co'
    );

    RETURN format(
      'https://%s/storage/v1/object/public/%s/%s',
      v_host,
      v_bucket,
      ltrim(v_storage_path, '/')
    );
  END IF;

  -- Content-only knowledge base documents may have no file_url. Return NULL.
  IF doc.file_url IS NULL OR length(trim(doc.file_url)) = 0 THEN
    RETURN NULL;
  END IF;

  -- If file_url is already a full URL, return it as-is
  IF doc.file_url ~* '^https?://' THEN
    RETURN doc.file_url;
  END IF;

  -- Fallback: construct URL from relative path
  v_host := COALESCE(
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
    'dhbfaclkfysqwfppuxxa.supabase.co'
  );

  RETURN format(
    'https://%s/storage/v1/object/public/%s/%s',
    v_host,
    v_bucket,
    ltrim(doc.file_url, '/')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_secure_document_url(uuid) TO authenticated;
;
