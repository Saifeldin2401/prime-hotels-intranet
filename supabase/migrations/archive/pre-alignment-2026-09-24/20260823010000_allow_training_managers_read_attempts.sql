-- Migration: Allow training managers and administrators to view question attempts and quiz sessions
-- File: 20260823010000_allow_training_managers_read_attempts.sql

BEGIN;

-- 1. Allow training admins, HR, property managers, and department heads to view question attempts
DROP POLICY IF EXISTS "unified_question_attempts_select" ON public.unified_question_attempts;
CREATE POLICY "unified_question_attempts_select" ON public.unified_question_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND (ur.role)::text = ANY (ARRAY[
          'super_admin',
          'corporate_admin',
          'regional_admin',
          'regional_hr',
          'property_hr',
          'property_manager',
          'department_head'
        ])
    )
  );

-- 2. Allow training admins, HR, property managers, and department heads to view quiz sessions
DROP POLICY IF EXISTS "unified_quiz_sessions_select" ON public.unified_quiz_sessions;
CREATE POLICY "unified_quiz_sessions_select" ON public.unified_quiz_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND (ur.role)::text = ANY (ARRAY[
          'super_admin',
          'corporate_admin',
          'regional_admin',
          'regional_hr',
          'property_hr',
          'property_manager',
          'department_head'
        ])
    )
  );

-- 3. Update unified_questions select policy to include property_manager as well as published questions
DROP POLICY IF EXISTS "unified_questions_select" ON public.unified_questions;
CREATE POLICY "unified_questions_select" ON public.unified_questions
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND (ur.role)::text = ANY (ARRAY[
          'super_admin',
          'corporate_admin',
          'regional_admin',
          'regional_hr',
          'property_hr',
          'property_manager',
          'department_head'
        ])
    )
  );

COMMIT;
