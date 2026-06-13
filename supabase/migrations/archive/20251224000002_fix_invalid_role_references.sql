-- Fix Invalid Role References in Learning System and Assignments
-- This migration corrects references to non-existent roles in RLS policies
-- Replaces: department_manager -> department_head, general_manager/admin/super_admin -> regional_admin

-- Fix learning_quizzes policies
DROP POLICY IF EXISTS "Draft quizzes viewable by creators and HR" ON learning_quizzes;
CREATE POLICY "Draft quizzes viewable by creators and HR" ON learning_quizzes
    FOR ALL USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_hr', 'department_head')
        )
    );

-- Fix learning_quiz_questions policies
DROP POLICY IF EXISTS "HR can manage quiz questions" ON learning_quiz_questions;
CREATE POLICY "HR can manage quiz questions" ON learning_quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_hr', 'department_head')
        )
    );

-- Fix learning_assignments policies
DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;
CREATE POLICY "HR can manage assignments" ON learning_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_hr', 'department_head')
        )
    );

-- Fix learning_progress policies
DROP POLICY IF EXISTS "HR can view all progress" ON learning_progress;
CREATE POLICY "HR can view all progress" ON learning_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_hr', 'department_head')
        )
    );

-- Fix can_manage_assignments function if it exists
DROP FUNCTION IF EXISTS can_manage_assignments(UUID);
CREATE OR REPLACE FUNCTION can_manage_assignments(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = can_manage_assignments.user_id
    AND role IN ('regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION can_manage_assignments(UUID) TO authenticated;
