
CREATE OR REPLACE FUNCTION public._plan_rank(_code text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp
AS $$ SELECT CASE _code WHEN 'starter' THEN 1 WHEN 'growth' THEN 2 WHEN 'enterprise' THEN 3 ELSE 0 END; $$;

CREATE OR REPLACE FUNCTION public.check_and_escalate_approvals()
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$ BEGIN RETURN; END; $$;

CREATE OR REPLACE FUNCTION public.get_media_asset_with_usage(p_media_asset_id uuid)
RETURNS TABLE(
  id uuid, title text, description text, filename text, public_url text,
  media_type media_type, category media_category, file_size_bytes bigint, mime_type text,
  duration_seconds integer, thumbnail_url text, tags text[], usage_count integer,
  last_used_at timestamp with time zone, uploaded_by uuid, uploader_name text,
  property_id uuid, property_name text, is_public boolean, created_at timestamp with time zone, usages jsonb)
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT ma.id, ma.title, ma.description, ma.filename, ma.public_url, ma.media_type, ma.category,
    ma.file_size_bytes, ma.mime_type, ma.duration_seconds, ma.thumbnail_url, ma.tags, ma.usage_count,
    ma.last_used_at, ma.uploaded_by, p.full_name as uploader_name, ma.property_id, h.name as property_name,
    ma.is_public, ma.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', mau.id,'usage_type', mau.usage_type,
      'usage_entity_id', mau.usage_entity_id,'usage_entity_title', mau.usage_entity_title,'created_at', mau.created_at))
      FROM media_asset_usages mau WHERE mau.media_asset_id = ma.id), '[]'::jsonb) as usages
  FROM media_assets ma
  LEFT JOIN profiles p ON p.id = ma.uploaded_by
  LEFT JOIN hotels h ON h.id = ma.property_id
  WHERE ma.id = p_media_asset_id;
END;
$$;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'can_send_tenant_email','check_password_reuse','clear_failed_login_attempts','complete_password_reset',
      'create_scoped_training_assignment','deploy_master_content','enforce_ai_credit','enforce_hotel_entitlement',
      'enforce_membership_entitlement','evaluate_organization_quotas','get_assignable_learners','get_assignable_recipients_count',
      'get_caller_assignment_scopes','get_platform_ai_operations','get_platform_global_search','get_platform_operations_summary',
      'get_platform_user_directory','get_setting','get_tenant_email_context','match_knowledge_chunks','notification_policy_enabled',
      'process_employee_transfer','record_failed_login_attempt','retry_course_generation_job','retry_failed_job',
      'sync_training_module_to_course','trigger_auto_assign_new_hire')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public, anon', fn.proname, pg_get_function_identity_arguments(fn.oid));
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', fn.proname, pg_get_function_identity_arguments(fn.oid));
  END LOOP;
END;
$$;

ALTER TABLE public.media_asset_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_asset_usages_tenant_select" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_select" ON public.media_asset_usages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.media_assets ma
    WHERE ma.id = media_asset_usages.media_asset_id
      AND (ma.is_public = true
        OR ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = ma.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));

DROP POLICY IF EXISTS "media_asset_usages_tenant_insert" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_insert" ON public.media_asset_usages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.media_assets ma
    WHERE ma.id = media_asset_usages.media_asset_id
      AND (ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = ma.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));

DROP POLICY IF EXISTS "media_asset_usages_tenant_delete" ON public.media_asset_usages;
CREATE POLICY "media_asset_usages_tenant_delete" ON public.media_asset_usages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.media_assets ma
    WHERE ma.id = media_asset_usages.media_asset_id
      AND (ma.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = ma.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));

DROP POLICY IF EXISTS "media_collection_items_tenant_select" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_select" ON public.media_collection_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.media_collections mc
    WHERE mc.id = media_collection_items.collection_id
      AND (mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = mc.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));

DROP POLICY IF EXISTS "media_collection_items_tenant_insert" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_insert" ON public.media_collection_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.media_collections mc
    WHERE mc.id = media_collection_items.collection_id
      AND (mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = mc.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));

DROP POLICY IF EXISTS "media_collection_items_tenant_delete" ON public.media_collection_items;
CREATE POLICY "media_collection_items_tenant_delete" ON public.media_collection_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.media_collections mc
    WHERE mc.id = media_collection_items.collection_id
      AND (mc.organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR EXISTS (SELECT 1 FROM public.organization_memberships om
          WHERE om.user_id = (SELECT auth.uid()) AND om.organization_id = mc.organization_id AND om.is_active = true)
        OR EXISTS (SELECT 1 FROM public.platform_users pu
          WHERE pu.user_id = (SELECT auth.uid()) AND pu.is_active = true))));
