-- =============================================================================
-- Extension schema placement & RLS initplan performance fixes
-- =============================================================================
--
-- 1. EXTENSIONS
--    btree_gist is moved from public → extensions schema.
--    pg_net does NOT support SET SCHEMA (the extension itself disallows it), so
--    it remains in public. The advisor warning for pg_net cannot be resolved
--    through DDL; it would require reinstalling the extension.
--
-- 2. RLS INITPLAN
--    Replace bare auth.<function>() calls with (SELECT auth.<function>())
--    in 12 RLS policies. The SELECT wrapper causes Postgres to evaluate the
--    function once per query (init-plan) rather than once per row, which
--    eliminates re-evaluation overhead at scale.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Move btree_gist to the extensions schema
-- ---------------------------------------------------------------------------
ALTER EXTENSION btree_gist SET SCHEMA extensions;


-- ---------------------------------------------------------------------------
-- 2. RLS initplan fixes — replace bare auth.* with (SELECT auth.*)
-- ---------------------------------------------------------------------------

-- document_tags: document_tags_select uses bare auth.role()
DROP POLICY IF EXISTS document_tags_select ON public.document_tags;
CREATE POLICY document_tags_select ON public.document_tags
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- document_download_logs: document_download_logs_insert uses bare auth.role()
DROP POLICY IF EXISTS document_download_logs_insert ON public.document_download_logs;
CREATE POLICY document_download_logs_insert ON public.document_download_logs
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- notification_email_templates: service_role_full_access uses bare auth.role()
DROP POLICY IF EXISTS service_role_full_access_notification_email_templates ON public.notification_email_templates;
CREATE POLICY service_role_full_access_notification_email_templates ON public.notification_email_templates
  FOR ALL
  USING      ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- notification_delivery_events: service_role_full_access uses bare auth.role()
DROP POLICY IF EXISTS service_role_full_access_notification_delivery_events ON public.notification_delivery_events;
CREATE POLICY service_role_full_access_notification_delivery_events ON public.notification_delivery_events
  FOR ALL
  USING      ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- notifications: "Users can insert own notifications" uses bare auth.uid()
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- job_titles: "Allow manage access for admins" uses bare auth.uid() in subquery
DROP POLICY IF EXISTS "Allow manage access for admins" ON public.job_titles;
CREATE POLICY "Allow manage access for admins" ON public.job_titles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])
    )
  );

-- media_asset_usages: media_asset_usages_insert uses bare auth.uid()
DROP POLICY IF EXISTS media_asset_usages_insert ON public.media_asset_usages;
CREATE POLICY media_asset_usages_insert ON public.media_asset_usages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM media_assets ma
      WHERE ma.id = media_asset_usages.media_asset_id
        AND (
          ma.uploaded_by = (SELECT auth.uid())
          OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
          OR has_role((SELECT auth.uid()), 'property_manager'::app_role)
        )
    )
  );

-- media_access_logs: media_access_logs_insert uses bare auth.uid()
DROP POLICY IF EXISTS media_access_logs_insert ON public.media_access_logs;
CREATE POLICY media_access_logs_insert ON public.media_access_logs
  FOR INSERT
  WITH CHECK (accessed_by = (SELECT auth.uid()));

-- document_views: document_views_insert uses bare auth.role()
DROP POLICY IF EXISTS document_views_insert ON public.document_views;
CREATE POLICY document_views_insert ON public.document_views
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- sop_access_logs: sop_access_logs_insert_own uses bare auth.uid()
DROP POLICY IF EXISTS sop_access_logs_insert_own ON public.sop_access_logs;
CREATE POLICY sop_access_logs_insert_own ON public.sop_access_logs
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- sop_access_logs: sop_access_logs_select_own_or_admin uses bare auth.uid()
DROP POLICY IF EXISTS sop_access_logs_select_own_or_admin ON public.sop_access_logs;
CREATE POLICY sop_access_logs_select_own_or_admin ON public.sop_access_logs
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role_optimized('corporate_admin'::app_role)
    OR has_role_optimized('regional_admin'::app_role)
  );

-- user_achievements: "Users can view all achievements" uses bare auth.role()
DROP POLICY IF EXISTS "Users can view all achievements" ON public.user_achievements;
CREATE POLICY "Users can view all achievements" ON public.user_achievements
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');
