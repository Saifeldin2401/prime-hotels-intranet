-- Migration: Fix learning_assignments INSERT RLS to allow returning data
-- Created: 2026-03-29
-- Purpose: Fix 400 error when creating assignments with .select()

-- Update INSERT policy to use WITH CHECK and allow returning inserted rows
DROP POLICY IF EXISTS "learning_assignments_manage_policy_insert" ON learning_assignments;

CREATE POLICY "learning_assignments_manage_policy_insert" ON learning_assignments
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        has_role_optimized('corporate_admin'::app_role) 
        OR has_role_optimized('regional_admin'::app_role) 
        OR has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_manager'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        OR has_role_optimized('department_head'::app_role)
    );

-- Also ensure SELECT policy allows viewing newly created assignments by creator
DROP POLICY IF EXISTS "learning_assignments_select_policy" ON learning_assignments;

CREATE POLICY "learning_assignments_select_policy" ON learning_assignments
    FOR SELECT
    TO authenticated
    USING (
        -- Admin/HR can see all
        has_role_optimized('corporate_admin'::app_role) 
        OR has_role_optimized('regional_admin'::app_role) 
        OR has_role_optimized('regional_hr'::app_role)
        OR has_role_optimized('property_hr'::app_role)
        -- Creator can see their own assignments
        OR (assigned_by = auth.uid())
        -- Target-based visibility (for non-deleted assignments)
        OR (
            COALESCE(is_deleted, false) = false 
            AND (
                (target_type = 'user' AND target_id = auth.uid()::text)
                OR (target_type = 'everyone')
                OR (target_type = 'department' AND target_id = ANY (get_user_departments(auth.uid())::text[]))
                OR (target_type = 'property' AND target_id = ANY (get_user_properties(auth.uid())::text[]))
                OR (target_type = 'role' AND target_id = ANY (get_my_roles()::text[]))
            )
        )
    );
