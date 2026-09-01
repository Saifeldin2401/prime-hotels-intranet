-- ==============================================================================
-- PRODUCTION SECURITY & RLS LOCKDOWN MIGRATION
-- ==============================================================================
-- 1. Sets fixed search_path = public, pg_temp on role-mutable functions
-- 2. Revokes public/anon execution on privileged SECURITY DEFINER functions
-- 3. Grants execute strictly to authenticated users and service_role
-- 4. Establishes tenant-isolated RLS policies on media_asset_usages & media_collection_items
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SECURE SEARCH PATH ON FUNCTIONS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._plan_rank(_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE _code WHEN 'starter' THEN 1 WHEN 'growth' THEN 2 WHEN 'enterprise' THEN 3 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_escalate_approvals()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_media_asset_with_usage(p_media_asset_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  filename text,
  public_url text,
  media_type media_type,
  category media_category,
  file_size_bytes bigint,
  mime_type text,
  duration_seconds integer,
  thumbnail_url text,
  tags text[],
  usage_count integer,
  last_used_at timestamp with time zone,
  uploaded_by uuid,
  uploader_name text,
  property_id uuid,
  property_name text,
  is_public boolean,
  created_at timestamp with time zone,
  usages jsonb
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.title,
    ma.description,
    ma.filename,
    ma.public_url,
    ma.media_type,
    ma.category,
    ma.file_size_bytes,
    ma.mime_type,
    ma.duration_seconds,
    ma.thumbnail_url,
    ma.tags,
    ma.usage_count,
    ma.last_used_at,
    ma.uploaded_by,
    p.full_name as uploader_name,
    ma.property_id,
    h.name as property_name,
    ma.is_public,
    ma.created_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', mau.id,
          'usage_type', mau.usage_type,
          'usage_entity_id', mau.usage_entity_id,
          'usage_entity_title', mau.usage_entity_title,
          'created_at', mau.created_at
        )
      )
      FROM media_asset_usages mau
      WHERE mau.media_asset_id = ma.id
      ),
      '[]'::jsonb
    ) as usages
  FROM media_assets ma
  LEFT JOIN profiles p ON p.id = ma.uploaded_by
  LEFT JOIN hotels h ON h.id = ma.property_id
  WHERE ma.id = p_media_asset_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. REVOKE ANON AND PUBLIC FROM PRIVILEGED FUNCTIONS & GRANT AUTHENTICATED
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  -- can_send_tenant_email
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_send_tenant_email') THEN
    REVOKE EXECUTE ON FUNCTION public.can_send_tenant_email(uuid, uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.can_send_tenant_email(uuid, uuid) TO authenticated, service_role;
  END IF;

  -- check_password_reuse
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_password_reuse') THEN
    REVOKE EXECUTE ON FUNCTION public.check_password_reuse(text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.check_password_reuse(text) TO authenticated, service_role;
  END IF;

  -- clear_failed_login_attempts
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clear_failed_login_attempts') THEN
    REVOKE EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts(text) TO authenticated, service_role;
  END IF;

  -- complete_password_reset
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_password_reset') THEN
    REVOKE EXECUTE ON FUNCTION public.complete_password_reset() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO authenticated, service_role;
  END IF;

  -- create_scoped_training_assignment
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_scoped_training_assignment') THEN
    REVOKE EXECUTE ON FUNCTION public.create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, uuid, text, uuid[], timestamp with time zone, text, text, boolean, boolean, integer[]) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.create_scoped_training_assignment(uuid, text, uuid, uuid, uuid, uuid, text, uuid[], timestamp with time zone, text, text, boolean, boolean, integer[]) TO authenticated, service_role;
  END IF;

  -- deploy_master_content
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'deploy_master_content') THEN
    REVOKE EXECUTE ON FUNCTION public.deploy_master_content(uuid, text, uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.deploy_master_content(uuid, text, uuid) TO authenticated, service_role;
  END IF;

  -- enforce_ai_credit
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_ai_credit') THEN
    REVOKE EXECUTE ON FUNCTION public.enforce_ai_credit() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.enforce_ai_credit() TO authenticated, service_role;
  END IF;

  -- enforce_hotel_entitlement
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_hotel_entitlement') THEN
    REVOKE EXECUTE ON FUNCTION public.enforce_hotel_entitlement() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.enforce_hotel_entitlement() TO authenticated, service_role;
  END IF;

  -- enforce_membership_entitlement
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_membership_entitlement') THEN
    REVOKE EXECUTE ON FUNCTION public.enforce_membership_entitlement() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.enforce_membership_entitlement() TO authenticated, service_role;
  END IF;

  -- evaluate_organization_quotas
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'evaluate_organization_quotas') THEN
    REVOKE EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) TO authenticated, service_role;
  END IF;

  -- get_assignable_learners
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_assignable_learners') THEN
    REVOKE EXECUTE ON FUNCTION public.get_assignable_learners(uuid, uuid, uuid, uuid, text, text, integer, integer) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_assignable_learners(uuid, uuid, uuid, uuid, text, text, integer, integer) TO authenticated, service_role;
  END IF;

  -- get_assignable_recipients_count
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_assignable_recipients_count') THEN
    REVOKE EXECUTE ON FUNCTION public.get_assignable_recipients_count(uuid, uuid, uuid, uuid, text, text, uuid[], text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_assignable_recipients_count(uuid, uuid, uuid, uuid, text, text, uuid[], text) TO authenticated, service_role;
  END IF;

  -- get_caller_assignment_scopes
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_caller_assignment_scopes') THEN
    REVOKE EXECUTE ON FUNCTION public.get_caller_assignment_scopes(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_caller_assignment_scopes(uuid) TO authenticated, service_role;
  END IF;

  -- get_platform_ai_operations
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_platform_ai_operations') THEN
    REVOKE EXECUTE ON FUNCTION public.get_platform_ai_operations() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_platform_ai_operations() TO authenticated, service_role;
  END IF;

  -- get_platform_global_search
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_platform_global_search') THEN
    REVOKE EXECUTE ON FUNCTION public.get_platform_global_search(text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_platform_global_search(text) TO authenticated, service_role;
  END IF;

  -- get_platform_operations_summary
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_platform_operations_summary') THEN
    REVOKE EXECUTE ON FUNCTION public.get_platform_operations_summary() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_platform_operations_summary() TO authenticated, service_role;
  END IF;

  -- get_platform_user_directory
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_platform_user_directory') THEN
    REVOKE EXECUTE ON FUNCTION public.get_platform_user_directory(text, uuid, text, integer, integer) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_platform_user_directory(text, uuid, text, integer, integer) TO authenticated, service_role;
  END IF;

  -- get_setting
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_setting') THEN
    REVOKE EXECUTE ON FUNCTION public.get_setting(uuid, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_setting(uuid, text) TO authenticated, service_role;
  END IF;

  -- get_tenant_email_context
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tenant_email_context') THEN
    REVOKE EXECUTE ON FUNCTION public.get_tenant_email_context(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.get_tenant_email_context(uuid) TO authenticated, service_role;
  END IF;

  -- match_knowledge_chunks
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_knowledge_chunks') THEN
    REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, text, integer, double precision, uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(extensions.vector, text, integer, double precision, uuid) TO authenticated, service_role;
  END IF;

  -- notification_policy_enabled
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notification_policy_enabled') THEN
    REVOKE EXECUTE ON FUNCTION public.notification_policy_enabled(uuid, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.notification_policy_enabled(uuid, text) TO authenticated, service_role;
  END IF;

  -- process_employee_transfer
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_employee_transfer') THEN
    REVOKE EXECUTE ON FUNCTION public.process_employee_transfer(uuid, uuid, uuid, text, text, uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.process_employee_transfer(uuid, uuid, uuid, text, text, uuid) TO authenticated, service_role;
  END IF;

  -- record_failed_login_attempt
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_failed_login_attempt') THEN
    REVOKE EXECUTE ON FUNCTION public.record_failed_login_attempt(text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(text) TO authenticated, service_role;
  END IF;

  -- retry_course_generation_job
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'retry_course_generation_job') THEN
    REVOKE EXECUTE ON FUNCTION public.retry_course_generation_job(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.retry_course_generation_job(uuid) TO authenticated, service_role;
  END IF;

  -- retry_failed_job
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'retry_failed_job') THEN
    REVOKE EXECUTE ON FUNCTION public.retry_failed_job(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.retry_failed_job(uuid) TO authenticated, service_role;
  END IF;

  -- sync_training_module_to_course
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_training_module_to_course') THEN
    REVOKE EXECUTE ON FUNCTION public.sync_training_module_to_course() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.sync_training_module_to_course() TO authenticated, service_role;
  END IF;

  -- trigger_auto_assign_new_hire
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_auto_assign_new_hire') THEN
    REVOKE EXECUTE ON FUNCTION public.trigger_auto_assign_new_hire() FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.trigger_auto_assign_new_hire() TO authenticated, service_role;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RLS POLICIES FOR MEDIA ASSET USAGES & MEDIA COLLECTION ITEMS
-- ------------------------------------------------------------------------------

-- Ensure RLS is active
ALTER TABLE public.media_asset_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;

-- media_asset_usages policies
DROP POLICY IF EXISTS "media_asset_usages_tenant_select" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_select" ON public.media_asset_usages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
        AND (
          ma.is_public = true
          OR ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = ma.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS "media_asset_usages_tenant_insert" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_insert" ON public.media_asset_usages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
        AND (
          ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = ma.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS "media_asset_usages_tenant_delete" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_delete" ON public.media_asset_usages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
        AND (
          ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = ma.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

-- media_collection_items policies
DROP POLICY IF EXISTS "media_collection_items_tenant_select" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_select" ON public.media_collection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_collections mc
      WHERE mc.id = media_collection_items.collection_id
        AND (
          mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = mc.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS "media_collection_items_tenant_insert" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_insert" ON public.media_collection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media_collections mc
      WHERE mc.id = media_collection_items.collection_id
        AND (
          mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = mc.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS "media_collection_items_tenant_delete" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_delete" ON public.media_collection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_collections mc
      WHERE mc.id = media_collection_items.collection_id
        AND (
          mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
          OR EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = (SELECT auth.uid())
              AND om.organization_id = mc.organization_id
              AND om.is_active = true
          )
          OR EXISTS (
            SELECT 1 FROM public.platform_users pu
            WHERE pu.user_id = (SELECT auth.uid())
              AND pu.is_active = true
          )
        )
    )
  );

COMMIT;
