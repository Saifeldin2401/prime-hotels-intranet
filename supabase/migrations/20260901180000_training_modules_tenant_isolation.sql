-- Phase 2 (security): training_modules had NO tenant isolation. Migration 20260901140000 §9
-- (which would have added it) never ran, and 20260901160000 skipped the table. It carried only
-- the non-org-scoped p5_training_modules_* policies -> any org's content editor could
-- read/write every other org's training modules. training_modules holds the only real course
-- data in the system today.
--
-- The write policy keeps the legacy global editor checks (is_content_author / is_training_manager)
-- as a TRANSITIONAL OR, but always ANDed with the org-membership predicate, so a global
-- training_manager can now only edit modules in their own org. Phase 3 (role unification)
-- removes the legacy checks once organization_memberships roles are the sole vocabulary.

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p5_training_modules_select ON public.training_modules;
DROP POLICY IF EXISTS p5_training_modules_insert ON public.training_modules;
DROP POLICY IF EXISTS p5_training_modules_update ON public.training_modules;
DROP POLICY IF EXISTS p5_training_modules_delete ON public.training_modules;
DROP POLICY IF EXISTS multitenant_training_modules_select ON public.training_modules;
DROP POLICY IF EXISTS multitenant_training_modules_write ON public.training_modules;

CREATE POLICY "multitenant_training_modules_select" ON public.training_modules
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (
        status = 'published'
        OR created_by = auth.uid()
        OR public.is_tenant_content_editor(organization_id)
        OR public.is_content_author()
        OR public.is_training_manager()
      )
    )
  )
);

CREATE POLICY "multitenant_training_modules_write" ON public.training_modules
FOR ALL TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (
      public.is_tenant_content_editor(organization_id)
      OR public.is_content_author()
      OR public.is_training_manager()
      OR created_by = auth.uid()
    )
  )
)
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (
      public.is_tenant_content_editor(organization_id)
      OR public.is_content_author()
      OR public.is_training_manager()
    )
  )
);
