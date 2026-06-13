BEGIN;

CREATE OR REPLACE FUNCTION public.get_secure_document_url(document_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  doc record;
  v_storage_path text;
  v_signed_url text;
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

  v_storage_path := COALESCE(
    NULLIF(doc.storage_path, ''),
    public.extract_storage_path_from_url(doc.file_url, COALESCE(NULLIF(doc.storage_bucket, ''), 'documents'))
  );

  IF v_storage_path IS NOT NULL THEN
    SELECT storage.create_signed_url(
      COALESCE(NULLIF(doc.storage_bucket, ''), 'documents'),
      v_storage_path,
      3600
    )
    INTO v_signed_url;

    IF v_signed_url IS NOT NULL AND length(trim(v_signed_url)) > 0 THEN
      RETURN v_signed_url;
    END IF;
  END IF;

  -- Content-only knowledge base documents may have no file_url. Return NULL instead of throwing.
  IF doc.file_url IS NULL OR length(trim(doc.file_url)) = 0 THEN
    RETURN NULL;
  END IF;

  IF doc.file_url ~* '^https?://' THEN
    RETURN doc.file_url;
  END IF;

  v_host := COALESCE(
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
    'dhbfaclkfysqwfppuxxa.supabase.co'
  );

  RETURN format(
    'https://%s/storage/v1/object/public/%s/%s',
    v_host,
    COALESCE(NULLIF(doc.storage_bucket, ''), 'documents'),
    ltrim(doc.file_url, '/')
  );
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
