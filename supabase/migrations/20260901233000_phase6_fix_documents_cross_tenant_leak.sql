
-- ============================================================================
-- Phase 6 — close cross-tenant leaks on `documents` introduced by the
-- multitenant_documents_* policy rewrite:
--   * SELECT leaked EVERY content_type='training_block' row to every tenant
--   * DELETE/UPDATE allowed ANY authenticated user to mutate is_master_template rows
-- Verified live: an org-B admin could read 264 of org-A's documents.
-- ============================================================================

DROP POLICY IF EXISTS multitenant_documents_select ON public.documents;
CREATE POLICY multitenant_documents_select ON public.documents FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    -- master templates are platform-owned reference content, readable to all tenants
    OR is_master_template = true
    -- everything else (training_block included) is strictly org-scoped
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

-- courses: the master-template SELECT branch is fine (platform reference content),
-- but harden the DELETE/UPDATE master branch is already AND is_platform_super_admin().
-- Add operational-org gate to the tenant SELECT branch for consistency.
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
