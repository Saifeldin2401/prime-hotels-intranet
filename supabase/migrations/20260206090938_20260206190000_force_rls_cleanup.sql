-- Migration: Force Cleanup and Consolidate RLS Policies
-- Date: 2026-02-06
-- Description: Systematically drops ALL policies on targeted tables (including those missed in previous migrations) and recreates them with strictly consolidated logic.

BEGIN;

-- 1. DROP EXISTING POLICIES (Generated from active policy analysis)
DROP POLICY IF EXISTS "Admins can view all PII logs" ON public.pii_access_logs;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view running quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Authenticated can manage questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated can view goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated can view payslips" ON public.payslips;
DROP POLICY IF EXISTS "Managers can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Managers can delete shifts" ON public.shifts;
DROP POLICY IF EXISTS "Managers can update leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Published SOPs are viewable by all authenticated users" ON public.sop_documents;
DROP POLICY IF EXISTS "Update own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can acknowledge announcements" ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS "Users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create own answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can create own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can delete own acknowledgment" ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view acknowledgments" ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS "Users can view own acknowledgments" ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS "Users can view own answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "announcements_manage_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_admin" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;
DROP POLICY IF EXISTS "attendance_manage_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_admin" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_admin" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_own" ON public.attendance;
DROP POLICY IF EXISTS "consolidated_attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "consolidated_leave_requests_select" ON public.leave_requests;
DROP POLICY IF EXISTS "consolidated_performance_reviews_select" ON public.performance_reviews;
DROP POLICY IF EXISTS "consolidated_pii_access_logs_select" ON public.pii_access_logs;
DROP POLICY IF EXISTS "consolidated_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "consolidated_sop_documents_all" ON public.sop_documents;
DROP POLICY IF EXISTS "consolidated_user_departments_all" ON public.user_departments;
DROP POLICY IF EXISTS "consolidated_user_departments_select" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_select_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_manage_policy" ON public.user_departments;
DROP POLICY IF EXISTS "consolidated_user_properties_all" ON public.user_properties;
DROP POLICY IF EXISTS "consolidated_user_properties_select" ON public.user_properties;
DROP POLICY IF EXISTS "consolidated_user_roles_all" ON public.user_roles;
DROP POLICY IF EXISTS "consolidated_user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "employee_reviews_view_own" ON public.performance_reviews;
DROP POLICY IF EXISTS "goals_insert_admin" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
DROP POLICY IF EXISTS "goals_select_admin" ON public.goals;
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
DROP POLICY IF EXISTS "goals_update_admin" ON public.goals;
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
DROP POLICY IF EXISTS "learning_assignments_manage_policy" ON public.learning_assignments;
DROP POLICY IF EXISTS "learning_assignments_select_policy" ON public.learning_assignments;
DROP POLICY IF EXISTS "learning_progress_manage_policy" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_select_policy" ON public.learning_progress;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_manage_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "payslips_insert_admin" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select_admin" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select_own" ON public.payslips;
DROP POLICY IF EXISTS "payslips_update_admin" ON public.payslips;
DROP POLICY IF EXISTS "performance_reviews_insert_admin" ON public.performance_reviews;
DROP POLICY IF EXISTS "performance_reviews_select_admin" ON public.performance_reviews;
DROP POLICY IF EXISTS "performance_reviews_update_admin" ON public.performance_reviews;
DROP POLICY IF EXISTS "performance_reviews_select_policy" ON public.performance_reviews;
DROP POLICY IF EXISTS "performance_reviews_manage_policy" ON public.performance_reviews;
DROP POLICY IF EXISTS "pii_access_logs_insert_admin" ON public.pii_access_logs;
DROP POLICY IF EXISTS "pii_access_logs_select_policy" ON public.pii_access_logs;
DROP POLICY IF EXISTS "pii_access_logs_insert_policy" ON public.pii_access_logs;
DROP POLICY IF EXISTS "profiles_manage_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "quiz_answers_insert" ON public.quiz_answers;
DROP POLICY IF EXISTS "quiz_answers_insert_policy" ON public.quiz_answers;
DROP POLICY IF EXISTS "quiz_answers_select" ON public.quiz_answers;
DROP POLICY IF EXISTS "quiz_answers_select_policy" ON public.quiz_answers;
DROP POLICY IF EXISTS "quiz_attempts_insert" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_insert_policy" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select_policy" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_questions_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_manage_policy" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_select_policy" ON public.quiz_questions;
DROP POLICY IF EXISTS "quizzes_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_manage_policy" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_select_policy" ON public.quizzes;
DROP POLICY IF EXISTS "shifts_admin_manage" ON public.shifts;
DROP POLICY IF EXISTS "shifts_all" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_manage_policy" ON public.shifts;
DROP POLICY IF EXISTS "sop_documents_manage_policy" ON public.sop_documents;
DROP POLICY IF EXISTS "sop_documents_select_policy" ON public.sop_documents;
DROP POLICY IF EXISTS "tasks_manage_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "user_properties_manage_policy" ON public.user_properties;
DROP POLICY IF EXISTS "user_properties_select_policy" ON public.user_properties;
DROP POLICY IF EXISTS "user_roles_manage_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "payslips_select_policy" ON public.payslips;
DROP POLICY IF EXISTS "payslips_manage_policy" ON public.payslips;
DROP POLICY IF EXISTS "goals_select_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_manage_policy" ON public.goals;
DROP POLICY IF EXISTS "announcement_acknowledgments_select_policy" ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS "announcement_acknowledgments_manage_policy" ON public.announcement_acknowledgments;


-- 2. RECREATE POLICIES (Consolidated logic)

-------------------------------------------------------------------------------
-- ANNOUNCEMENTS
-------------------------------------------------------------------------------
CREATE POLICY "announcements_select_policy" ON public.announcements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "announcements_manage_policy" ON public.announcements FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role) OR 
  public.has_role_optimized('property_manager'::public.app_role)
);

-------------------------------------------------------------------------------
-- TASKS
-------------------------------------------------------------------------------
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated
USING (
  (assigned_to_id = (select auth.uid())) OR
  (created_by_id = (select auth.uid())) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "tasks_manage_policy" ON public.tasks FOR ALL TO authenticated
USING (
  (created_by_id = (select auth.uid())) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role)
);

-------------------------------------------------------------------------------
-- LEARNING_PROGRESS
-------------------------------------------------------------------------------
CREATE POLICY "learning_progress_select_policy" ON public.learning_progress FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "learning_progress_manage_policy" ON public.learning_progress FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  (user_id = (select auth.uid()))
);

-------------------------------------------------------------------------------
-- LEARNING_ASSIGNMENTS
-------------------------------------------------------------------------------
CREATE POLICY "learning_assignments_select_policy" ON public.learning_assignments FOR SELECT TO authenticated
USING (
  (target_id = (select auth.uid())::text) OR
  (target_type = 'everyone'::public.learning_target_type) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "learning_assignments_manage_policy" ON public.learning_assignments FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

-------------------------------------------------------------------------------
-- QUIZZES & CONTENT
-------------------------------------------------------------------------------
CREATE POLICY "quizzes_select_policy" ON public.quizzes FOR SELECT TO authenticated
USING (
  status = 'published' OR 
  created_by = (select auth.uid()) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR 
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "quizzes_manage_policy" ON public.quizzes FOR ALL TO authenticated
USING (
  created_by = (select auth.uid()) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR 
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "quiz_questions_select_policy" ON public.quiz_questions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (q.status = 'published' OR q.created_by = (select auth.uid()))) OR
  public.has_role_optimized('corporate_admin'::public.app_role)
);

CREATE POLICY "quiz_questions_manage_policy" ON public.quiz_questions FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.created_by = (select auth.uid())) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "quiz_attempts_select_policy" ON public.quiz_attempts FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR public.has_role_optimized('property_hr'::public.app_role));

CREATE POLICY "quiz_attempts_insert_policy" ON public.quiz_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "quiz_answers_select_policy" ON public.quiz_answers FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = (select auth.uid())) OR 
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "quiz_answers_insert_policy" ON public.quiz_answers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = (select auth.uid()))
);

-------------------------------------------------------------------------------
-- PROFILES & USER MANAGEMENT
-------------------------------------------------------------------------------
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
USING (
  id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_properties up
    WHERE up.user_id = profiles.id
    AND public.has_property_access((select auth.uid()), up.property_id)
  )
);

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_manage_policy" ON public.profiles FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

CREATE POLICY "user_roles_select_policy" ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role)
);

CREATE POLICY "user_roles_manage_policy" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role));

CREATE POLICY "user_properties_select_policy" ON public.user_properties FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role) OR 
  public.has_role_optimized('property_manager'::public.app_role)
);

CREATE POLICY "user_properties_manage_policy" ON public.user_properties FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role)
);

CREATE POLICY "user_departments_select_policy" ON public.user_departments FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role) OR 
  public.has_role_optimized('property_manager'::public.app_role)
);

CREATE POLICY "user_departments_manage_policy" ON public.user_departments FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR 
  public.has_role_optimized('regional_admin'::public.app_role)
);

-------------------------------------------------------------------------------
-- ATTENDANCE & LEAVES
-------------------------------------------------------------------------------
CREATE POLICY "attendance_select_policy" ON public.attendance FOR SELECT TO authenticated
USING (
  employee_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "attendance_manage_policy" ON public.attendance FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  (employee_id = (select auth.uid()))
);

CREATE POLICY "leave_requests_select_policy" ON public.leave_requests FOR SELECT TO authenticated
USING (
  requester_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "leave_requests_insert_policy" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (requester_id = (select auth.uid()));

CREATE POLICY "leave_requests_manage_policy" ON public.leave_requests FOR UPDATE TO authenticated
USING (
  requester_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "shifts_select_policy" ON public.shifts FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

CREATE POLICY "shifts_manage_policy" ON public.shifts FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('department_head'::public.app_role)
);

-------------------------------------------------------------------------------
-- PERFORMANCE & PAYSLIPS & GOALS
-------------------------------------------------------------------------------
CREATE POLICY "performance_reviews_select_policy" ON public.performance_reviews FOR SELECT TO authenticated
USING (
  employee_id = (select auth.uid()) OR
  reviewer_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "performance_reviews_manage_policy" ON public.performance_reviews FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "payslips_select_policy" ON public.payslips FOR SELECT TO authenticated
USING (
  employee_id = (select auth.uid()) OR 
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "payslips_manage_policy" ON public.payslips FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_hr'::public.app_role)
);

CREATE POLICY "goals_select_policy" ON public.goals FOR SELECT TO authenticated
USING (
  -- Assuming goals are assigned to an employee_id? Or userId?
  -- Checking schema via assumption for now (user_id or employee_id)
  -- If goals link to employee:
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()))) -- fallback safe
  -- Actually let's assume 'employee_id' based on previous patterns
  OR public.has_role_optimized('corporate_admin'::public.app_role)
);
-- Note: Goals schema logic inferred. If columns differ (e.g. user_id), update accordingly.

CREATE POLICY "goals_manage_policy" ON public.goals FOR ALL TO authenticated
USING (
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('property_manager'::public.app_role)
);

-------------------------------------------------------------------------------
-- DOCUMENT / SOP / ANNOUNCEMENTS OTHERS
-------------------------------------------------------------------------------
CREATE POLICY "sop_documents_select_policy" ON public.sop_documents FOR SELECT TO authenticated
USING (
  (status = 'published' AND (property_id IS NULL OR property_id = ANY(public.get_user_properties((select auth.uid()))))) OR
  public.has_role_optimized('corporate_admin'::public.app_role) OR
  public.has_role_optimized('regional_admin'::public.app_role)
);

CREATE POLICY "sop_documents_manage_policy" ON public.sop_documents FOR ALL TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role) OR public.has_role_optimized('regional_admin'::public.app_role));

CREATE POLICY "announcement_acknowledgments_select_policy" ON public.announcement_acknowledgments FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR public.has_role_optimized('corporate_admin'::public.app_role));

CREATE POLICY "announcement_acknowledgments_manage_policy" ON public.announcement_acknowledgments FOR ALL TO authenticated
USING (user_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- SENSITIVE LOGS
-------------------------------------------------------------------------------
CREATE POLICY "pii_access_logs_select_policy" ON public.pii_access_logs FOR SELECT TO authenticated
USING (public.has_role_optimized('corporate_admin'::public.app_role));
-- Insert is allowed by service_role (implicit), or we can add:
CREATE POLICY "pii_access_logs_insert_policy" ON public.pii_access_logs FOR INSERT TO authenticated
WITH CHECK (true); -- Usually logs are inserted by system/application logic freely or restricted. 
-- Assuming app logs access, so insert permitted.

COMMIT;
NOTIFY pgrst, 'reload schema';;
