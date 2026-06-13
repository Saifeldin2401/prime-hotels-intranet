-- Stabilization: security + performance hardening based on Supabase advisors

-- ============================================================================
-- SECURITY: tighten permissive RLS policies
-- ============================================================================

-- analytics_events: restrict inserts
DROP POLICY IF EXISTS "Anonymous users can insert events" ON public.analytics_events;
CREATE POLICY "Anonymous users can insert events"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
  );

DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert events"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- certificates: restrict inserts (no unconditional INSERT)
DROP POLICY IF EXISTS "Authenticated can insert certificates" ON public.certificates;
CREATE POLICY "Authenticated can insert certificates"
  ON public.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      public.has_any_role(auth.uid(), ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role])
    )
  );

-- job_applications: restrict inserts
DROP POLICY IF EXISTS "Public can submit applications" ON public.job_applications;
CREATE POLICY "Public can submit applications"
  ON public.job_applications
  FOR INSERT
  TO anon
  WITH CHECK (
    referred_by IS NULL
  );

DROP POLICY IF EXISTS "Authenticated Insert" ON public.job_applications;
CREATE POLICY "Authenticated Insert"
  ON public.job_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow authenticated users to submit an application; referrals must match the current user.
    referred_by IS NULL OR (auth.uid() IS NOT NULL AND referred_by = auth.uid())
  );

-- related_article_clicks: restrict inserts
DROP POLICY IF EXISTS "Authenticated users can track clicks" ON public.related_article_clicks;
CREATE POLICY "Authenticated users can track clicks"
  ON public.related_article_clicks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- search_analytics: restrict inserts
DROP POLICY IF EXISTS "Authenticated users can insert search logs" ON public.search_analytics;
CREATE POLICY "Authenticated users can insert search logs"
  ON public.search_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- status_history: restrict inserts (avoid any authenticated inserting arbitrary status changes)
DROP POLICY IF EXISTS "System can insert status history" ON public.status_history;
CREATE POLICY "System can insert status history"
  ON public.status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (is_admin(auth.uid()) OR is_hr(auth.uid()))
  );

-- request_steps: fix permissive WITH CHECK
DROP POLICY IF EXISTS request_steps_update_assignee ON public.request_steps;
CREATE POLICY request_steps_update_assignee
  ON public.request_steps
  FOR UPDATE
  TO authenticated
  USING (
    can_view_request(request_id) AND ((assignee_id = auth.uid()) OR is_hr(auth.uid()) OR is_admin(auth.uid()))
  )
  WITH CHECK (
    can_view_request(request_id) AND ((assignee_id = auth.uid()) OR is_hr(auth.uid()) OR is_admin(auth.uid()))
  );

-- ============================================================================
-- SECURITY: harden SECURITY DEFINER functions by fixing mutable search_path
-- (Supabase linter: function_search_path_mutable)
-- ============================================================================

DO $fn$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        p.proconfig IS NULL OR
        NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) c
          WHERE c LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema_name, r.function_name, r.args);
  END LOOP;
END;
$fn$;

-- ============================================================================
-- PERFORMANCE: indexes and cleanup
-- ============================================================================

-- Add missing FK indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_attendance_property_id ON public.attendance(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_last_reviewed_by ON public.documents(last_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_linked_sop_id ON public.knowledge_questions(linked_sop_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_reviewed_by ON public.knowledge_questions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_onboarding_process_id ON public.learning_assignments(onboarding_process_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_onboarding_task_id ON public.learning_assignments(onboarding_task_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_last_session_id ON public.learning_progress(last_session_id);
CREATE INDEX IF NOT EXISTS idx_learning_quiz_questions_question_id ON public.learning_quiz_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_learning_quizzes_created_by ON public.learning_quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_quizzes_source_document_id ON public.learning_quizzes(source_document_id);
CREATE INDEX IF NOT EXISTS idx_leaves_leave_type_id ON public.leaves(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_microlearning_content_created_by ON public.microlearning_content(created_by);
CREATE INDEX IF NOT EXISTS idx_module_skills_skill_id ON public.module_skills(skill_id);

-- Drop duplicate indexes (idempotent)
-- Keep attendance_employee_date_idx and drop idx_attendance_employee_date
DROP INDEX IF EXISTS public.idx_attendance_employee_date;

-- Keep idx_shifts_user_time and drop shifts_user_start_idx
DROP INDEX IF EXISTS public.shifts_user_start_idx;
