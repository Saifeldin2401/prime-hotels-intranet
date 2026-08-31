-- ============================================================================
-- Phase 6 — close cross-tenant leaks on `documents` / `courses` introduced by
-- the multitenant_*_ policy rewrite.
--   * documents SELECT leaked EVERY content_type='training_block' row to every
--     tenant (verified live: an org-B admin read 264 of org-A's documents).
--   * documents DELETE/UPDATE allowed ANY authenticated user to mutate
--     is_master_template rows (the master branch had no is_platform_super_admin()).
--   * added org_is_operational() gate to the tenant SELECT branch of both tables
--     so a suspended org's content stops rendering for its own members.
-- ============================================================================

DROP POLICY IF EXISTS multitenant_documents_select ON public.documents;
CREATE POLICY multitenant_documents_select ON public.documents FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids()))
       OR public.has_active_platform_session(organization_id))
      AND public.org_is_operational(organization_id)
      AND (
        status = 'PUBLISHED'::document_status
        OR created_by = (SELECT auth.uid())
        OR public.is_tenant_content_editor(organization_id)
      )
    )
  )
);

DROP POLICY IF EXISTS multitenant_documents_update ON public.documents;
CREATE POLICY multitenant_documents_update ON public.documents FOR UPDATE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids()))
         OR public.has_active_platform_session(organization_id))
    AND (created_by = (SELECT auth.uid()) OR public.is_tenant_content_editor(organization_id))
  )
);

DROP POLICY IF EXISTS multitenant_documents_delete ON public.documents;
CREATE POLICY multitenant_documents_delete ON public.documents FOR DELETE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids()))
         OR public.has_active_platform_session(organization_id))
    AND (created_by = (SELECT auth.uid()) OR public.is_tenant_admin(organization_id))
  )
);

DROP POLICY IF EXISTS multitenant_courses_select ON public.courses;
CREATE POLICY multitenant_courses_select ON public.courses FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids()))
       OR public.has_active_platform_session(organization_id))
      AND public.org_is_operational(organization_id)
      AND (status = 'published'::text OR created_by = (SELECT auth.uid()) OR public.is_tenant_content_editor(organization_id))
    )
  )
);
