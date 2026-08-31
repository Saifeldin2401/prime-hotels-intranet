-- ============================================================================
-- §59 / §74 — Storage-layer tenant isolation.
--
-- (1) can_view_document() was the LEGACY property model: no organization_id
--     check, and has_role_optimized('corporate_admin'/'regional_admin'/
--     'regional_hr') returned TRUE unconditionally -> a corp/regional admin of
--     ANY org could read EVERY tenant's document files via the `documents`
--     storage bucket. Rewritten org-aware (org_visible + is_tenant_content_editor,
--     platform master content readable to all, operators via is_platform_super_admin).
-- (2) `training-content` bucket SELECT was `bucket_id = 'training-content'` with
--     no other predicate -> every authenticated user (any tenant) could read
--     every training video/PDF. Now: operator OR org-prefixed path
--     (training-content/{organization_id}/...) OR a `documents` row in the
--     caller's org referencing the object.
-- (3) sop-attachments / reports-exports SELECT gated on GLOBAL legacy roles ->
--     cross-tenant. Re-scoped to org-prefixed path + tenant admin, operator
--     escape hatch retained.
--
-- KNOWN FOLLOW-UP (not fixed here — would break course-image <img> rendering):
--   `content-media` is a PUBLIC bucket holding both tenant videos
--   ({user_id}/videos/*.mp4) and generated course images. Needs a public/private
--   split: course illustration images stay public-CDN, tenant-uploaded media
--   moves to a private, org-scoped bucket with signed URLs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_document(document_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE d record;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  SELECT id, organization_id, is_master_template, status, is_deleted, created_by, content_type
    INTO d FROM public.documents WHERE id = document_id LIMIT 1;
  IF d IS NULL OR d.is_deleted IS TRUE THEN RETURN false; END IF;
  IF public.is_platform_super_admin() THEN RETURN true; END IF;
  IF d.is_master_template IS TRUE THEN RETURN true; END IF;
  IF d.created_by = (SELECT auth.uid()) THEN RETURN true; END IF;
  IF NOT public.org_visible(d.organization_id) THEN RETURN false; END IF;
  IF public.is_tenant_content_editor(d.organization_id) THEN RETURN true; END IF;
  RETURN d.status = 'PUBLISHED'::public.document_status;
END;
$function$;

DROP POLICY IF EXISTS training_content_select ON storage.objects;
CREATE POLICY training_content_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'training-content'
  AND (
    public.is_platform_operator()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND ((storage.foldername(name))[1])::uuid = ANY (public.current_user_organization_ids())
      AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.documents dd
      WHERE (dd.file_url = objects.name OR dd.file_url LIKE '%/' || objects.name)
        AND public.org_visible(dd.organization_id)
    )
  )
);

DROP POLICY IF EXISTS training_content_insert ON storage.objects;
CREATE POLICY training_content_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'training-content'
  AND (
    public.is_platform_operator()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND ((storage.foldername(name))[1])::uuid = ANY (public.current_user_organization_ids())
      AND public.is_tenant_content_editor(((storage.foldername(name))[1])::uuid)
    )
  )
);

DROP POLICY IF EXISTS sop_attachments_select ON storage.objects;
CREATE POLICY sop_attachments_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sop-attachments'
  AND (
    public.is_platform_operator()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND ((storage.foldername(name))[1])::uuid = ANY (public.current_user_organization_ids())
      AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.documents dd
      WHERE (dd.file_url = objects.name OR dd.file_url LIKE '%/' || objects.name)
        AND public.org_visible(dd.organization_id)
    )
  )
);

DROP POLICY IF EXISTS reports_exports_select ON storage.objects;
CREATE POLICY reports_exports_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reports-exports'
  AND (
    public.is_platform_operator()
    OR (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND ((storage.foldername(name))[1])::uuid = ANY (public.current_user_organization_ids())
      AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid)
    )
  )
);
