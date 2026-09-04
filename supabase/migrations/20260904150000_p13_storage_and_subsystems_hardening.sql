-- ==============================================================================
-- Migration: 20260904150000_p13_storage_and_subsystems_hardening.sql
-- Description: Storage RLS Hardening & Multi-Tenant Object Scoping
-- Remediations:
--   1. Harden content-media, payslips, resumes, referral-cvs bucket policies on storage.objects
--   2. Allow announcement-attachments folder prefix to match tenant organization UUID or announcement ID
-- ==============================================================================

BEGIN;

-- Ensure buckets exist and are marked private
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('content-media', 'content-media', false),
  ('payslips', 'payslips', false),
  ('resumes', 'resumes', false),
  ('referral-cvs', 'referral-cvs', false),
  ('announcement-attachments', 'announcement-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==============================================================================
-- 1. BUCKET: content-media
-- ==============================================================================

DROP POLICY IF EXISTS "Public Access for Content Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to Content Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Content Media" ON storage.objects;
DROP POLICY IF EXISTS content_media_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS content_media_owner_update ON storage.objects;
DROP POLICY IF EXISTS content_media_owner_delete ON storage.objects;
DROP POLICY IF EXISTS content_media_select ON storage.objects;
DROP POLICY IF EXISTS content_media_insert ON storage.objects;
DROP POLICY IF EXISTS content_media_update ON storage.objects;
DROP POLICY IF EXISTS content_media_delete ON storage.objects;

CREATE POLICY content_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY content_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY content_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
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
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY content_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- ==============================================================================
-- 2. BUCKET: payslips
-- ==============================================================================

DROP POLICY IF EXISTS payslips_objects_select ON storage.objects;
DROP POLICY IF EXISTS payslips_objects_insert ON storage.objects;
DROP POLICY IF EXISTS payslips_select ON storage.objects;
DROP POLICY IF EXISTS payslips_insert ON storage.objects;
DROP POLICY IF EXISTS payslips_update ON storage.objects;
DROP POLICY IF EXISTS payslips_delete ON storage.objects;

CREATE POLICY payslips_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY payslips_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payslips'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY payslips_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'payslips'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY payslips_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- ==============================================================================
-- 3. BUCKET: resumes
-- ==============================================================================

DROP POLICY IF EXISTS resumes_select ON storage.objects;
DROP POLICY IF EXISTS resumes_insert ON storage.objects;
DROP POLICY IF EXISTS resumes_update ON storage.objects;
DROP POLICY IF EXISTS resumes_delete ON storage.objects;

CREATE POLICY resumes_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY resumes_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY resumes_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY resumes_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- ==============================================================================
-- 4. BUCKET: referral-cvs
-- ==============================================================================

DROP POLICY IF EXISTS referral_cvs_select_owner_or_hr ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_insert_own ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_select ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_insert ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_update ON storage.objects;
DROP POLICY IF EXISTS referral_cvs_delete ON storage.objects;

CREATE POLICY referral_cvs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'referral-cvs'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY referral_cvs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'referral-cvs'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY referral_cvs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'referral-cvs'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'referral-cvs'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY referral_cvs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'referral-cvs'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
        AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- ==============================================================================
-- 5. BUCKET: announcement-attachments
-- ==============================================================================

DROP POLICY IF EXISTS announcement_attachments_authenticated_select ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_owner_delete ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_select ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_update ON storage.objects;
DROP POLICY IF EXISTS announcement_attachments_delete ON storage.objects;

CREATE POLICY announcement_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND (
          (
            ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
            AND public.org_is_operational(((storage.foldername(name))[1])::uuid)
          )
          OR EXISTS (
            SELECT 1 FROM public.announcements a
            WHERE a.id = ((storage.foldername(objects.name))[1])::uuid
              AND public.org_visible(a.organization_id)
          )
        )
      )
    )
  );

CREATE POLICY announcement_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND (
          (
            ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
            AND public.is_tenant_content_editor(((storage.foldername(name))[1])::uuid)
          )
          OR EXISTS (
            SELECT 1 FROM public.announcements a
            WHERE a.id = ((storage.foldername(objects.name))[1])::uuid
              AND public.org_visible(a.organization_id)
              AND public.is_tenant_content_editor(a.organization_id)
          )
        )
      )
    )
  );

CREATE POLICY announcement_attachments_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND (
          (
            ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
            AND public.is_tenant_content_editor(((storage.foldername(name))[1])::uuid)
          )
          OR EXISTS (
            SELECT 1 FROM public.announcements a
            WHERE a.id = ((storage.foldername(objects.name))[1])::uuid
              AND public.org_visible(a.organization_id)
              AND public.is_tenant_content_editor(a.organization_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND (
      public.is_platform_operator()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND (
          (
            ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
            AND public.is_tenant_content_editor(((storage.foldername(name))[1])::uuid)
          )
          OR EXISTS (
            SELECT 1 FROM public.announcements a
            WHERE a.id = ((storage.foldername(objects.name))[1])::uuid
              AND public.org_visible(a.organization_id)
              AND public.is_tenant_content_editor(a.organization_id)
          )
        )
      )
    )
  );

CREATE POLICY announcement_attachments_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND (
      public.is_platform_operator()
      OR owner = auth.uid()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND (
          (
            ((storage.foldername(name))[1])::uuid = ANY(public.current_user_organization_ids())
            AND public.is_tenant_content_editor(((storage.foldername(name))[1])::uuid)
          )
          OR EXISTS (
            SELECT 1 FROM public.announcements a
            WHERE a.id = ((storage.foldername(objects.name))[1])::uuid
              AND public.org_visible(a.organization_id)
              AND public.is_tenant_content_editor(a.organization_id)
          )
        )
      )
    )
  );

COMMIT;
