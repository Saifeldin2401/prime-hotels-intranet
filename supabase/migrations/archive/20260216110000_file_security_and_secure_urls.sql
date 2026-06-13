-- Phase 2: File security scanning + secure URL support

BEGIN;

-- Track file scan results for auditability and incident response.
CREATE TABLE IF NOT EXISTS public.file_security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  storage_bucket text,
  storage_path text,
  sha256 text,
  scan_engine text NOT NULL DEFAULT 'edge-heuristic-v1',
  scan_status text NOT NULL DEFAULT 'clean' CHECK (scan_status IN ('clean', 'suspicious', 'infected', 'error')),
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  detection_summary text,
  scan_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_user_created
  ON public.file_security_scans(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_status_created
  ON public.file_security_scans(scan_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_sha256
  ON public.file_security_scans(sha256);

ALTER TABLE public.file_security_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_security_scans_select ON public.file_security_scans;
CREATE POLICY file_security_scans_select
  ON public.file_security_scans
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS file_security_scans_insert ON public.file_security_scans;
CREATE POLICY file_security_scans_insert
  ON public.file_security_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  );

-- Preserve legacy file_url/file_path but store canonical private object path.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'documents',
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'documents',
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.maintenance_attachments
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'maintenance-attachments',
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE OR REPLACE FUNCTION public.extract_storage_path_from_url(p_url text, p_bucket text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  clean_url text;
  regex_pattern text;
  extracted text;
BEGIN
  IF p_url IS NULL OR length(trim(p_url)) = 0 THEN
    RETURN NULL;
  END IF;

  clean_url := split_part(trim(p_url), '?', 1);

  IF clean_url ~* '^https?://' THEN
    regex_pattern := '^.*?/storage/v1/object/(?:public|sign)/' || regexp_replace(coalesce(p_bucket, ''), '([.[\]{}()*+?^$|\\-])', '\\\1', 'g') || '/?';
    extracted := regexp_replace(clean_url, regex_pattern, '');
    IF extracted = clean_url THEN
      RETURN NULL;
    END IF;
    RETURN NULLIF(ltrim(extracted, '/'), '');
  END IF;

  RETURN NULLIF(ltrim(clean_url, '/'), '');
END;
$$;

UPDATE public.documents
SET storage_path = public.extract_storage_path_from_url(file_url, 'documents')
WHERE storage_path IS NULL
  AND file_url IS NOT NULL;

UPDATE public.document_versions
SET storage_path = public.extract_storage_path_from_url(file_url, 'documents')
WHERE storage_path IS NULL
  AND file_url IS NOT NULL;

UPDATE public.maintenance_attachments
SET storage_path = public.extract_storage_path_from_url(file_path, 'maintenance-attachments')
WHERE storage_path IS NULL
  AND file_path IS NOT NULL;

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

  IF doc.file_url IS NULL OR length(trim(doc.file_url)) = 0 THEN
    RAISE EXCEPTION 'Document file URL is missing';
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

CREATE OR REPLACE FUNCTION public.get_secure_document_version_url(p_version_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v record;
  v_storage_path text;
  v_signed_url text;
BEGIN
  SELECT
    dv.id,
    dv.document_id,
    dv.file_url,
    dv.storage_bucket,
    dv.storage_path
  INTO v
  FROM public.document_versions dv
  WHERE dv.id = p_version_id
  LIMIT 1;

  IF v IS NULL THEN
    RAISE EXCEPTION 'Document version not found';
  END IF;

  IF NOT public.can_view_document(v.document_id) THEN
    RAISE EXCEPTION 'Not authorized to access this document version';
  END IF;

  v_storage_path := COALESCE(
    NULLIF(v.storage_path, ''),
    public.extract_storage_path_from_url(v.file_url, COALESCE(NULLIF(v.storage_bucket, ''), 'documents'))
  );

  IF v_storage_path IS NOT NULL THEN
    SELECT storage.create_signed_url(
      COALESCE(NULLIF(v.storage_bucket, ''), 'documents'),
      v_storage_path,
      3600
    )
    INTO v_signed_url;
    IF v_signed_url IS NOT NULL AND length(trim(v_signed_url)) > 0 THEN
      RETURN v_signed_url;
    END IF;
  END IF;

  RETURN v.file_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secure_maintenance_attachment_url(p_attachment_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v record;
  v_storage_path text;
  v_signed_url text;
BEGIN
  SELECT
    ma.id,
    ma.ticket_id,
    ma.uploaded_by_id,
    ma.file_path,
    ma.storage_bucket,
    ma.storage_path,
    mt.reported_by_id,
    mt.assigned_to_id,
    mt.property_id
  INTO v
  FROM public.maintenance_attachments ma
  JOIN public.maintenance_tickets mt ON mt.id = ma.ticket_id
  WHERE ma.id = p_attachment_id
  LIMIT 1;

  IF v IS NULL THEN
    RAISE EXCEPTION 'Attachment not found';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    auth.uid() = v.uploaded_by_id
    OR auth.uid() = v.reported_by_id
    OR auth.uid() = v.assigned_to_id
    OR EXISTS (
      SELECT 1
      FROM public.user_properties up
      WHERE up.user_id = auth.uid()
        AND up.property_id = v.property_id
    )
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this attachment';
  END IF;

  v_storage_path := COALESCE(
    NULLIF(v.storage_path, ''),
    public.extract_storage_path_from_url(v.file_path, COALESCE(NULLIF(v.storage_bucket, ''), 'maintenance-attachments'))
  );

  IF v_storage_path IS NOT NULL THEN
    SELECT storage.create_signed_url(
      COALESCE(NULLIF(v.storage_bucket, ''), 'maintenance-attachments'),
      v_storage_path,
      3600
    )
    INTO v_signed_url;
    IF v_signed_url IS NOT NULL AND length(trim(v_signed_url)) > 0 THEN
      RETURN v_signed_url;
    END IF;
  END IF;

  RETURN v.file_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_secure_document_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_document_version_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_maintenance_attachment_url(uuid) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';;
