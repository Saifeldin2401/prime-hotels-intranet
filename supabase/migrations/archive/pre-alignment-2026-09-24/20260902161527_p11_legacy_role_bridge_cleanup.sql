-- ============================================================================
-- P11: close residual legacy-role bridging gaps found after the P0-P10
-- multi-tenant remediation.
--
-- 1. is_tenant_admin()/is_tenant_content_editor(): a NULL org_id argument was
--    treated as "pass for any tenant admin" instead of "platform-admin only"
--    (`organization_id = p_org_id OR p_org_id IS NULL`). This let any
--    tenant's administrator manage platform-global rows (NULL
--    organization_id) through every policy/RPC calling these helpers,
--    including brands, publish_document_to_kb, remove_document_from_kb, and
--    set_document_internal.
-- 2. brands: redundant legacy has_role(...,'corporate_admin') write policies
--    bypassed the org-scoped brands_tenant_isolation_admin policy entirely,
--    letting any tenant administrator edit any organization's brand rows.
-- 3. Platform-global config tables (confirmed no organization_id column) had
--    two mirror-image problems from the legacy->canonical role migration:
--    dead policies referencing legacy role literals no longer present in
--    user_roles.role (locking management out entirely, e.g.
--    password_reset_requests admin visibility), and has_role()-based checks
--    that still resolve true for ANY tenant's administrator (roles_satisfying
--    deliberately maps administrator up through corporate_admin/super_admin).
--    Both are fixed the same way: platform-wide config is manageable by true
--    platform super admins only, never by a tenant-scoped role.
--
-- Applied live 2026-09-02 (schema_migrations 20260902161527); this file is the
-- repo record of that change. All statements are idempotent.
-- ============================================================================

-- 1. Close the NULL-org bypass in the two shared tenant-admin helpers.
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_org_id IS NULL THEN public.is_platform_super_admin()
    ELSE
      public.is_platform_super_admin()
      OR public.has_active_platform_session(p_org_id)
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE user_id = auth.uid()
          AND organization_id = p_org_id
          AND is_active = true
          AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin')
          AND public.org_is_operational(organization_id)
      )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_org_id IS NULL THEN public.is_platform_super_admin()
    ELSE
      public.is_platform_super_admin()
      OR public.has_active_platform_session(p_org_id)
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE user_id = auth.uid()
          AND organization_id = p_org_id
          AND is_active = true
          AND role IN ('organization_owner', 'organization_admin', 'brand_admin', 'hotel_admin',
                       'department_manager', 'training_manager', 'knowledge_manager', 'author', 'instructor')
          AND public.org_is_operational(organization_id)
      )
  END;
$function$;

-- 2. brands: drop the redundant legacy policies. brands_tenant_isolation_admin
--    (is_platform_super_admin() OR is_tenant_admin(organization_id)) already
--    covers admin writes with correct tenant scoping now that (1) is fixed.
DROP POLICY IF EXISTS brands_modify_admin_delete ON public.brands;
DROP POLICY IF EXISTS brands_modify_admin_insert ON public.brands;
DROP POLICY IF EXISTS brands_modify_admin_update ON public.brands;

-- 3. Platform-global config tables: lock management to true platform super
--    admins. None of these tables carry an organization_id column, so no
--    tenant role should ever satisfy their write/sensitive-read policies.

-- system_wiki
DROP POLICY IF EXISTS system_wiki_manage_delete ON public.system_wiki;
DROP POLICY IF EXISTS system_wiki_manage_insert ON public.system_wiki;
DROP POLICY IF EXISTS system_wiki_manage_update ON public.system_wiki;
CREATE POLICY system_wiki_manage_delete ON public.system_wiki
  FOR DELETE TO authenticated
  USING (public.is_platform_super_admin());
CREATE POLICY system_wiki_manage_insert ON public.system_wiki
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_super_admin());
CREATE POLICY system_wiki_manage_update ON public.system_wiki
  FOR UPDATE TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- ai_models
DROP POLICY IF EXISTS ai_models_write ON public.ai_models;
CREATE POLICY ai_models_write ON public.ai_models
  FOR ALL TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- ai_agent_policies
DROP POLICY IF EXISTS ai_agent_policies_write ON public.ai_agent_policies;
CREATE POLICY ai_agent_policies_write ON public.ai_agent_policies
  FOR ALL TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- role_permissions
DROP POLICY IF EXISTS role_permissions_manage_delete ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_manage_insert ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_manage_update ON public.role_permissions;
CREATE POLICY role_permissions_manage_delete ON public.role_permissions
  FOR DELETE TO public
  USING (public.is_platform_super_admin());
CREATE POLICY role_permissions_manage_insert ON public.role_permissions
  FOR INSERT TO public
  WITH CHECK (public.is_platform_super_admin());
CREATE POLICY role_permissions_manage_update ON public.role_permissions
  FOR UPDATE TO public
  USING (public.is_platform_super_admin());

-- achievement_definitions
DROP POLICY IF EXISTS achievement_definitions_manage_admin_delete ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_manage_admin_insert ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_manage_admin_update ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_select ON public.achievement_definitions;
CREATE POLICY achievement_definitions_manage_admin_delete ON public.achievement_definitions
  FOR DELETE TO authenticated
  USING (public.is_platform_super_admin());
CREATE POLICY achievement_definitions_manage_admin_insert ON public.achievement_definitions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_super_admin());
CREATE POLICY achievement_definitions_manage_admin_update ON public.achievement_definitions
  FOR UPDATE TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
CREATE POLICY achievement_definitions_select ON public.achievement_definitions
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_platform_super_admin());

-- motivational_content
DROP POLICY IF EXISTS motivational_content_manage_delete ON public.motivational_content;
DROP POLICY IF EXISTS motivational_content_manage_insert ON public.motivational_content;
DROP POLICY IF EXISTS motivational_content_manage_update ON public.motivational_content;
CREATE POLICY motivational_content_manage_delete ON public.motivational_content
  FOR DELETE TO public
  USING (public.is_platform_super_admin());
CREATE POLICY motivational_content_manage_insert ON public.motivational_content
  FOR INSERT TO public
  WITH CHECK (public.is_platform_super_admin());
CREATE POLICY motivational_content_manage_update ON public.motivational_content
  FOR UPDATE TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- failed_login_attempts
DROP POLICY IF EXISTS failed_login_admin_all ON public.failed_login_attempts;
CREATE POLICY failed_login_admin_all ON public.failed_login_attempts
  FOR ALL TO authenticated
  USING (public.is_platform_super_admin());

-- notification_email_templates
DROP POLICY IF EXISTS admins_read_notification_email_templates ON public.notification_email_templates;
CREATE POLICY admins_read_notification_email_templates ON public.notification_email_templates
  FOR SELECT TO authenticated
  USING (public.is_platform_super_admin());

-- password_reset_requests — was silently broken via has_role_optimized()
-- against legacy role literals that no longer exist in user_roles.role.
DROP POLICY IF EXISTS password_reset_requests_admin_select ON public.password_reset_requests;
CREATE POLICY password_reset_requests_admin_select ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_super_admin());
