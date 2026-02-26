-- 1. Consolidate knowledge_questions SELECT policies
DROP POLICY IF EXISTS "knowledge_questions_admin_select" ON public.knowledge_questions;
DROP POLICY IF EXISTS "knowledge_questions_select" ON public.knowledge_questions;

CREATE POLICY "consolidated_knowledge_questions_select" ON public.knowledge_questions
AS PERMISSIVE FOR SELECT TO authenticated
USING (
    has_role_optimized('corporate_admin'::app_role) OR 
    has_role_optimized('regional_admin'::app_role) OR 
    has_role_optimized('regional_hr'::app_role) OR 
    has_role_optimized('property_manager'::app_role) OR 
    has_role_optimized('property_hr'::app_role) OR 
    (status = 'published'::question_status) OR 
    (created_by = (SELECT auth.uid())) OR 
    (reviewed_by = (SELECT auth.uid()))
);

-- 2. Consolidate knowledge_questions UPDATE policies
DROP POLICY IF EXISTS "Creators can update own questions" ON public.knowledge_questions;
DROP POLICY IF EXISTS "knowledge_questions_admin_update" ON public.knowledge_questions;

CREATE POLICY "consolidated_knowledge_questions_update" ON public.knowledge_questions
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
    (created_by = (SELECT auth.uid())) OR 
    has_role_optimized('corporate_admin'::app_role) OR 
    has_role_optimized('regional_admin'::app_role) OR 
    has_role_optimized('regional_hr'::app_role) OR 
    has_role_optimized('property_manager'::app_role) OR 
    has_role_optimized('property_hr'::app_role)
);
;
