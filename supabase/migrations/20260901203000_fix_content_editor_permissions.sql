-- Migration: 20260901203000_fix_content_editor_permissions.sql
-- Description: Fix content editor permissions and sync membership roles

-- 1. Upgrade is_platform_super_admin to recognize super_admin, corporate_admin, regional_admin, and administrator
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'corporate_admin', 'regional_admin', 'administrator')
  );
$$;

-- 2. Upgrade is_tenant_content_editor to include department_manager, app-level author/training/knowledge managers
CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR public.is_content_author(auth.uid())
    OR public.is_training_manager(auth.uid())
    OR public.is_knowledge_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND (organization_id = p_org_id OR p_org_id IS NULL) AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin', 
                     'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
    );
$$;

-- 3. Upgrade is_tenant_admin to include organization_owner, organization_admin, hotel_admin, brand_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND (organization_id = p_org_id OR p_org_id IS NULL) AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin')
    );
$$;

-- 4. Update documents policies to ensure training blocks and content authors can insert and update cleanly
DROP POLICY IF EXISTS "multitenant_documents_select" ON public.documents;
CREATE POLICY multitenant_documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      is_platform_super_admin()
      OR is_master_template = true
      OR content_type = 'training_block'
      OR (
        (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id))
        AND (status = 'PUBLISHED'::document_status OR created_by = auth.uid() OR is_tenant_content_editor(organization_id))
      )
    )
  );

DROP POLICY IF EXISTS "multitenant_documents_insert" ON public.documents;
CREATE POLICY multitenant_documents_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IS NOT NULL AND (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id)) AND is_tenant_content_editor(organization_id))
      OR (content_type = 'training_block' AND is_tenant_content_editor(organization_id))
      OR (created_by = auth.uid() AND is_tenant_content_editor(organization_id))
    )
  );

DROP POLICY IF EXISTS "multitenant_documents_update" ON public.documents;
CREATE POLICY multitenant_documents_update ON public.documents
  FOR UPDATE TO authenticated
  USING (
    is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IS NOT NULL AND (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id)) AND (created_by = auth.uid() OR is_tenant_content_editor(organization_id)))
      OR (content_type = 'training_block' AND is_tenant_content_editor(organization_id))
    )
  )
  WITH CHECK (
    is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IS NOT NULL AND (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id)) AND is_tenant_content_editor(organization_id))
      OR (content_type = 'training_block' AND is_tenant_content_editor(organization_id))
    )
  );

DROP POLICY IF EXISTS "multitenant_documents_delete" ON public.documents;
CREATE POLICY multitenant_documents_delete ON public.documents
  FOR DELETE TO authenticated
  USING (
    is_platform_super_admin()
    OR is_master_template = true
    OR (
      (organization_id IS NOT NULL AND (organization_id IN (SELECT unnest(current_user_organization_ids())) OR has_active_platform_session(organization_id)) AND (created_by = auth.uid() OR is_tenant_admin(organization_id)))
      OR (content_type = 'training_block' AND is_tenant_content_editor(organization_id))
    )
  );

-- 5. Synchronize organization_memberships roles for all existing users to match their highest user_roles
UPDATE public.organization_memberships om
SET role = 'organization_owner'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = om.user_id AND ur.role IN ('super_admin', 'corporate_admin', 'administrator')
);

UPDATE public.organization_memberships om
SET role = 'training_manager'
WHERE role = 'learner' AND EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = om.user_id AND ur.role = 'training_manager'
);

UPDATE public.organization_memberships om
SET role = 'author'
WHERE role = 'learner' AND EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = om.user_id AND ur.role IN ('author', 'knowledge_manager')
);
