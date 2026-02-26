-- Final Comprehensive RLS Consolidation and Performance Fix
-- Date: 2026-02-06
-- Focus: Universal cleanup of multiple_permissive_policies and auth_rls_initplan

BEGIN;

--------------------------------------------------------------------------------
-- 1. UTILS
--------------------------------------------------------------------------------
-- Ensure we are using (select auth.uid()) and (select auth.role()) everywhere for performance.

--------------------------------------------------------------------------------
-- 2. DOMAIN: HR & ORGANIZATIONAL STRUCTURE
--------------------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in scope" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
USING (
  id = (select auth.uid())
  OR public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('regional_hr'::public.app_role)
  OR public.has_role_optimized('property_manager'::public.app_role)
  OR public.has_role_optimized('property_hr'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_properties up
    WHERE up.user_id = profiles.id
    AND public.has_property_access((select auth.uid()), up.property_id)
  )
);

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_manage_policy" ON public.profiles FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
  OR public.has_role_optimized('property_hr'::public.app_role)
); -- Note: FOR ALL includes SELECT/UPDATE, but Postgres ORs them.

-- USER_ROLES / PROPERTIES / DEPARTMENTS
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_policy" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

CREATE POLICY "user_roles_manage_policy" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

DROP POLICY IF EXISTS "user_properties_select_policy" ON public.user_properties;
DROP POLICY IF EXISTS "user_properties_manage_policy" ON public.user_properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.user_properties;
DROP POLICY IF EXISTS "Admins can manage properties" ON public.user_properties;

CREATE POLICY "user_properties_select_policy" ON public.user_properties FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

CREATE POLICY "user_properties_manage_policy" ON public.user_properties FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

--------------------------------------------------------------------------------
-- 3. DOMAIN: ANNOUNCEMENTS & COMMUNICATIONS
--------------------------------------------------------------------------------

-- ANNOUNCEMENT_ATTACHMENTS / TARGETS / READS
DROP POLICY IF EXISTS "announcement_attachments_select" ON public.announcement_attachments;
DROP POLICY IF EXISTS "announcement_attachments_manage" ON public.announcement_attachments;
DROP POLICY IF EXISTS "announcement_attachments_select_policy" ON public.announcement_attachments;
DROP POLICY IF EXISTS "announcement_attachments_manage_policy" ON public.announcement_attachments;

CREATE POLICY "announcement_attachments_select_policy" ON public.announcement_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.announcements a WHERE a.id = announcement_id));

CREATE POLICY "announcement_attachments_manage_policy" ON public.announcement_attachments FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role) OR public.has_role_optimized('property_manager'::public.app_role));

DROP POLICY IF EXISTS "announcement_targets_select" ON public.announcement_targets;
DROP POLICY IF EXISTS "announcement_targets_select_policy" ON public.announcement_targets;
CREATE POLICY "announcement_targets_select_policy" ON public.announcement_targets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.announcements a WHERE a.id = announcement_id));

DROP POLICY IF EXISTS "announcement_reads_select" ON public.announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_select_policy" ON public.announcement_reads;
CREATE POLICY "announcement_reads_select_policy" ON public.announcement_reads FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

--------------------------------------------------------------------------------
-- 4. DOMAIN: SOP & TRAINING
--------------------------------------------------------------------------------

-- LEARNING_MODULES (Formerly Training)
DROP POLICY IF EXISTS "training_modules_select" ON public.training_modules;
DROP POLICY IF EXISTS "training_modules_select_policy" ON public.training_modules;
CREATE POLICY "training_modules_select_policy" ON public.training_modules FOR SELECT TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  EXISTS (
    SELECT 1 FROM learning_assignments la 
    WHERE la.content_id = training_modules.id 
    AND (la.target_id = (select auth.uid())::text OR la.target_type::text = 'all')
  )
);

DROP POLICY IF EXISTS "learning_progress_select_policy" ON public.learning_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.learning_progress;
CREATE POLICY "learning_progress_select_policy" ON public.learning_progress FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role)
);

-- SOP_DOCUMENTS
DROP POLICY IF EXISTS "sop_documents_select_policy" ON public.sop_documents;
DROP POLICY IF EXISTS "sop_documents_manage_policy" ON public.sop_documents;
DROP POLICY IF EXISTS "sop_select_scoped" ON public.sop_documents;
DROP POLICY IF EXISTS "sop_insert_scoped" ON public.sop_documents;
DROP POLICY IF EXISTS "sop_update_scoped" ON public.sop_documents;
DROP POLICY IF EXISTS "Regional admin/HR can manage all SOPs" ON public.sop_documents;

CREATE POLICY "sop_documents_select_policy" ON public.sop_documents FOR SELECT TO authenticated
USING (
  (status = 'published' AND (property_id IS NULL OR property_id = ANY(public.get_user_properties((select auth.uid())))))
  OR public.has_role_optimized('corporate_admin'::public.app_role)
  OR public.has_role_optimized('regional_admin'::public.app_role)
);

CREATE POLICY "sop_documents_manage_policy" ON public.sop_documents FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

--------------------------------------------------------------------------------
-- 5. DOMAIN: SECURITY & AUDIT
--------------------------------------------------------------------------------

-- PII_ACCESS_LOGS
DROP POLICY IF EXISTS "pii_access_logs_strict_select" ON public.pii_access_logs;
DROP POLICY IF EXISTS "pii_access_logs_manage" ON public.pii_access_logs;
DROP POLICY IF EXISTS "pii_access_logs_select_policy" ON public.pii_access_logs;

CREATE POLICY "pii_access_logs_select_policy" ON public.pii_access_logs FOR SELECT TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role) OR public.has_role_optimized('regional_hr'::public.app_role));

--------------------------------------------------------------------------------
-- 6. DOMAIN: OTHER MODULES PERFORMANCE WRAPPING
--------------------------------------------------------------------------------

-- ATTENDANCE
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance;
DROP POLICY IF EXISTS "Admins and managers can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_own" ON public.attendance;

CREATE POLICY "attendance_select_policy" ON public.attendance FOR SELECT TO authenticated
USING (employee_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role) OR public.has_role_optimized('property_manager'::public.app_role));

-- LEAVE_REQUESTS
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_select_scoped" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can view leave requests for their department" ON public.leave_requests;

CREATE POLICY "leave_requests_select_policy" ON public.leave_requests FOR SELECT TO authenticated
USING (requester_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role) OR public.has_role_optimized('regional_hr'::public.app_role));

COMMIT;
NOTIFY pgrst, 'reload schema';;
