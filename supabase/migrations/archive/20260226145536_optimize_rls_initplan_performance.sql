
-- ============================================================
-- Migration: Optimize RLS policies to use (select auth.uid())
-- instead of bare auth.uid() to avoid per-row re-evaluation.
-- This wraps auth.uid() and auth.role() calls in subselects.
-- ============================================================

-- 1. knowledge_content_requests
DROP POLICY IF EXISTS "knowledge_content_requests_insert" ON "public"."knowledge_content_requests";
CREATE POLICY "knowledge_content_requests_insert" ON "public"."knowledge_content_requests"
  FOR INSERT WITH CHECK (requester_id = (select auth.uid()));

DROP POLICY IF EXISTS "knowledge_content_requests_select" ON "public"."knowledge_content_requests";
CREATE POLICY "knowledge_content_requests_select" ON "public"."knowledge_content_requests"
  FOR SELECT USING (
    (requester_id = (select auth.uid()))
    OR has_role_optimized('corporate_admin'::app_role)
    OR has_role_optimized('regional_admin'::app_role)
    OR has_role_optimized('regional_hr'::app_role)
    OR has_role_optimized('property_manager'::app_role)
    OR has_role_optimized('property_hr'::app_role)
    OR has_role_optimized('department_head'::app_role)
  );

-- 2. user_achievements
DROP POLICY IF EXISTS "Users can earn achievements" ON "public"."user_achievements";
CREATE POLICY "Users can earn achievements" ON "public"."user_achievements"
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view all achievements" ON "public"."user_achievements";
CREATE POLICY "Users can view all achievements" ON "public"."user_achievements"
  FOR SELECT USING ((select auth.role()) = 'authenticated'::text);

-- 3. document_folders
DROP POLICY IF EXISTS "document_folders_delete" ON "public"."document_folders";
CREATE POLICY "document_folders_delete" ON "public"."document_folders"
  FOR DELETE USING (
    (is_system = false) AND (
      has_role((select auth.uid()), 'regional_admin'::text)
      OR (has_role((select auth.uid()), 'property_manager'::text) AND (property_id IS NOT NULL) AND has_property_access((select auth.uid()), property_id))
      OR (created_by = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "document_folders_insert" ON "public"."document_folders";
CREATE POLICY "document_folders_insert" ON "public"."document_folders"
  FOR INSERT WITH CHECK (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (has_role((select auth.uid()), 'property_manager'::text) AND (property_id IS NOT NULL) AND has_property_access((select auth.uid()), property_id))
    OR (has_role((select auth.uid()), 'department_head'::text) AND (department_id IS NOT NULL) AND (EXISTS (
      SELECT 1 FROM departments d JOIN user_departments ud ON (d.id = ud.department_id)
      WHERE (d.id = document_folders.department_id) AND (ud.user_id = (select auth.uid()))
    )))
  );

DROP POLICY IF EXISTS "document_folders_select" ON "public"."document_folders";
CREATE POLICY "document_folders_select" ON "public"."document_folders"
  FOR SELECT USING (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (is_system = true)
    OR ((property_id IS NOT NULL) AND has_property_access((select auth.uid()), property_id))
    OR ((department_id IS NOT NULL) AND (EXISTS (
      SELECT 1 FROM user_departments ud
      WHERE (ud.user_id = (select auth.uid())) AND (ud.department_id = document_folders.department_id)
    )))
    OR (created_by = (select auth.uid()))
  );

DROP POLICY IF EXISTS "document_folders_update" ON "public"."document_folders";
CREATE POLICY "document_folders_update" ON "public"."document_folders"
  FOR UPDATE USING (
    (is_system = false) AND (
      has_role((select auth.uid()), 'regional_admin'::text)
      OR (has_role((select auth.uid()), 'property_manager'::text) AND (property_id IS NOT NULL) AND has_property_access((select auth.uid()), property_id))
      OR (has_role((select auth.uid()), 'department_head'::text) AND (department_id IS NOT NULL) AND (EXISTS (
        SELECT 1 FROM departments d JOIN user_departments ud ON (d.id = ud.department_id)
        WHERE (d.id = document_folders.department_id) AND (ud.user_id = (select auth.uid()))
      )))
      OR (created_by = (select auth.uid()))
    )
  );

-- 4. document_tags
DROP POLICY IF EXISTS "document_tags_delete" ON "public"."document_tags";
CREATE POLICY "document_tags_delete" ON "public"."document_tags"
  FOR DELETE USING (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (created_by = (select auth.uid()))
  );

DROP POLICY IF EXISTS "document_tags_insert" ON "public"."document_tags";
CREATE POLICY "document_tags_insert" ON "public"."document_tags"
  FOR INSERT WITH CHECK (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR has_role((select auth.uid()), 'property_manager'::text)
    OR has_role((select auth.uid()), 'department_head'::text)
  );

DROP POLICY IF EXISTS "document_tags_select" ON "public"."document_tags";
CREATE POLICY "document_tags_select" ON "public"."document_tags"
  FOR SELECT USING ((select auth.role()) = 'authenticated'::text);

DROP POLICY IF EXISTS "document_tags_update" ON "public"."document_tags";
CREATE POLICY "document_tags_update" ON "public"."document_tags"
  FOR UPDATE USING (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (created_by = (select auth.uid()))
  );

-- 5. document_tag_assignments
DROP POLICY IF EXISTS "document_tag_assignments_delete" ON "public"."document_tag_assignments";
CREATE POLICY "document_tag_assignments_delete" ON "public"."document_tag_assignments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_tag_assignments.document_id)
        AND ((d.created_by = (select auth.uid()))
          OR has_role((select auth.uid()), 'regional_admin'::text)
          OR (has_role((select auth.uid()), 'property_manager'::text) AND has_property_access((select auth.uid()), d.property_id)))
    )
  );

DROP POLICY IF EXISTS "document_tag_assignments_insert" ON "public"."document_tag_assignments";
CREATE POLICY "document_tag_assignments_insert" ON "public"."document_tag_assignments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_tag_assignments.document_id)
        AND ((d.created_by = (select auth.uid()))
          OR has_role((select auth.uid()), 'regional_admin'::text)
          OR (has_role((select auth.uid()), 'property_manager'::text) AND has_property_access((select auth.uid()), d.property_id)))
    )
  );

DROP POLICY IF EXISTS "document_tag_assignments_select" ON "public"."document_tag_assignments";
CREATE POLICY "document_tag_assignments_select" ON "public"."document_tag_assignments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_tag_assignments.document_id)
        AND (has_role((select auth.uid()), 'regional_admin'::text)
          OR has_role((select auth.uid()), 'regional_hr'::text)
          OR (d.created_by = (select auth.uid()))
          OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access((select auth.uid()), d.property_id)))
    )
  );

-- 6. document_download_logs
DROP POLICY IF EXISTS "document_download_logs_insert" ON "public"."document_download_logs";
CREATE POLICY "document_download_logs_insert" ON "public"."document_download_logs"
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated'::text);

DROP POLICY IF EXISTS "document_download_logs_select" ON "public"."document_download_logs";
CREATE POLICY "document_download_logs_select" ON "public"."document_download_logs"
  FOR SELECT USING (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (user_id = (select auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_download_logs.document_id)
        AND ((d.created_by = (select auth.uid()))
          OR (d.owner_id = (select auth.uid()))
          OR (has_role((select auth.uid()), 'property_manager'::text) AND has_property_access((select auth.uid()), d.property_id)))
    ))
  );

-- 7. document_views
DROP POLICY IF EXISTS "document_views_insert" ON "public"."document_views";
CREATE POLICY "document_views_insert" ON "public"."document_views"
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated'::text);

DROP POLICY IF EXISTS "document_views_select" ON "public"."document_views";
CREATE POLICY "document_views_select" ON "public"."document_views"
  FOR SELECT USING (
    has_role((select auth.uid()), 'regional_admin'::text)
    OR has_role((select auth.uid()), 'regional_hr'::text)
    OR (user_id = (select auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_views.document_id)
        AND ((d.created_by = (select auth.uid()))
          OR (d.owner_id = (select auth.uid()))
          OR (has_role((select auth.uid()), 'property_manager'::text) AND has_property_access((select auth.uid()), d.property_id)))
    ))
  );

-- 8. document_comments
DROP POLICY IF EXISTS "document_comments_delete" ON "public"."document_comments";
CREATE POLICY "document_comments_delete" ON "public"."document_comments"
  FOR DELETE USING (
    (user_id = (select auth.uid()))
    OR has_role((select auth.uid()), 'regional_admin'::text)
    OR (EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_comments.document_id)
        AND ((d.created_by = (select auth.uid())) OR (d.owner_id = (select auth.uid())))
    ))
  );

DROP POLICY IF EXISTS "document_comments_insert" ON "public"."document_comments";
CREATE POLICY "document_comments_insert" ON "public"."document_comments"
  FOR INSERT WITH CHECK (
    ((select auth.uid()) = user_id) AND (EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_comments.document_id)
        AND (has_role((select auth.uid()), 'regional_admin'::text)
          OR has_role((select auth.uid()), 'regional_hr'::text)
          OR (d.created_by = (select auth.uid()))
          OR (d.owner_id = (select auth.uid()))
          OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access((select auth.uid()), d.property_id))
          OR ((d.visibility = 'department'::document_visibility) AND (d.department_id IS NOT NULL) AND (EXISTS (
            SELECT 1 FROM user_departments ud
            WHERE (ud.user_id = (select auth.uid())) AND (ud.department_id = d.department_id)
          ))))
    ))
  );

DROP POLICY IF EXISTS "document_comments_resolve" ON "public"."document_comments";
CREATE POLICY "document_comments_resolve" ON "public"."document_comments"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_comments.document_id)
        AND ((d.created_by = (select auth.uid()))
          OR (d.owner_id = (select auth.uid()))
          OR has_role((select auth.uid()), 'regional_admin'::text)
          OR (has_role((select auth.uid()), 'property_manager'::text) AND has_property_access((select auth.uid()), d.property_id)))
    )
  );

DROP POLICY IF EXISTS "document_comments_select" ON "public"."document_comments";
CREATE POLICY "document_comments_select" ON "public"."document_comments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE (d.id = document_comments.document_id)
        AND (has_role((select auth.uid()), 'regional_admin'::text)
          OR has_role((select auth.uid()), 'regional_hr'::text)
          OR (d.created_by = (select auth.uid()))
          OR (d.owner_id = (select auth.uid()))
          OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access((select auth.uid()), d.property_id))
          OR ((d.visibility = 'department'::document_visibility) AND (d.department_id IS NOT NULL) AND (EXISTS (
            SELECT 1 FROM user_departments ud
            WHERE (ud.user_id = (select auth.uid())) AND (ud.department_id = d.department_id)
          ))))
    )
  );

DROP POLICY IF EXISTS "document_comments_update_own" ON "public"."document_comments";
CREATE POLICY "document_comments_update_own" ON "public"."document_comments"
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- 9. document_notification_rules
DROP POLICY IF EXISTS "document_notification_rules_delete_own" ON "public"."document_notification_rules";
CREATE POLICY "document_notification_rules_delete_own" ON "public"."document_notification_rules"
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "document_notification_rules_insert_own" ON "public"."document_notification_rules";
CREATE POLICY "document_notification_rules_insert_own" ON "public"."document_notification_rules"
  FOR INSERT WITH CHECK (
    (user_id = (select auth.uid())) AND (
      (folder_id IS NULL) OR (EXISTS (
        SELECT 1 FROM document_folders df
        WHERE (df.id = document_notification_rules.folder_id)
          AND ((df.is_system = true) OR (df.created_by = (select auth.uid())) OR has_property_access((select auth.uid()), df.property_id))
      ))
    )
  );

DROP POLICY IF EXISTS "document_notification_rules_select_own" ON "public"."document_notification_rules";
CREATE POLICY "document_notification_rules_select_own" ON "public"."document_notification_rules"
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "document_notification_rules_update_own" ON "public"."document_notification_rules";
CREATE POLICY "document_notification_rules_update_own" ON "public"."document_notification_rules"
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
;
