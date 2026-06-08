-- Align module visibility with the assignment UI roles.
-- Property HR and department heads can open the assignment screen, so they
-- also need broad read access to published modules when selecting content.

DROP POLICY IF EXISTS training_modules_select_policy ON public.training_modules;

CREATE POLICY training_modules_select_policy
ON public.training_modules
FOR SELECT
TO authenticated
USING (
  has_role_optimized('corporate_admin'::app_role)
  OR has_role_optimized('regional_admin'::app_role)
  OR has_role_optimized('regional_hr'::app_role)
  OR has_role_optimized('property_manager'::app_role)
  OR has_role_optimized('property_hr'::app_role)
  OR has_role_optimized('department_head'::app_role)
  OR (
    COALESCE(training_modules.is_deleted, false) = false
    AND COALESCE(training_modules.is_active, false) = true
    AND training_modules.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.learning_assignments la
      WHERE la.content_id = training_modules.id
        AND COALESCE(la.is_deleted, false) = false
        AND (
          (la.target_type = 'user'::learning_target_type AND la.target_id = (SELECT auth.uid())::text)
          OR la.target_type = 'everyone'::learning_target_type
          OR (la.target_type = 'department'::learning_target_type AND la.target_id = ANY((get_user_departments(auth.uid()))::text[]))
          OR (la.target_type = 'property'::learning_target_type AND la.target_id = ANY((get_user_properties(auth.uid()))::text[]))
          OR (la.target_type = 'role'::learning_target_type AND la.target_id = ANY((get_my_roles())::text[]))
        )
    )
  )
);
