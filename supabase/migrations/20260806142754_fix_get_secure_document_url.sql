CREATE OR REPLACE FUNCTION public.get_secure_document_url(document_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
BEGIN
  SELECT d.id, d.file_url
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

  -- Content-only knowledge base documents may have no file. Return NULL.
  IF doc.file_url IS NULL OR length(trim(doc.file_url)) = 0 THEN
    RETURN NULL;
  END IF;

  -- If this points at our own private 'documents' bucket, strip it down to the bare
  -- object path so the caller can generate a signed URL.
  IF doc.file_url ~* '/object/(public|sign|authenticated)/documents/' THEN
    RETURN regexp_replace(doc.file_url, '^.*/object/(public|sign|authenticated)/documents/', '');
  END IF;

  -- Anything else (a genuine external URL, or an already-bare path) is returned as-is.
  RETURN doc.file_url;
END;
$function$;
