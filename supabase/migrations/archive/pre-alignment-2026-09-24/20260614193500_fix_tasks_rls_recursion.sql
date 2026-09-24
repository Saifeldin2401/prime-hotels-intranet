-- Fix infinite recursion in tasks table by using has_role_optimized instead of querying user_roles directly

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated USING (
  (auth.uid() = created_by_id) OR 
  (auth.uid() = assigned_to_id) OR 
  (EXISTS (
    SELECT 1 FROM task_watchers
    WHERE task_watchers.task_id = tasks.id AND task_watchers.user_id = auth.uid()
  )) OR 
  has_role_optimized('corporate_admin'::app_role) OR
  has_role_optimized('regional_admin'::app_role) OR
  has_role_optimized('property_manager'::app_role) OR
  has_role_optimized('department_head'::app_role)
);

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated USING (
  (auth.uid() = created_by_id) OR 
  (auth.uid() = assigned_to_id) OR 
  has_role_optimized('corporate_admin'::app_role) OR
  has_role_optimized('regional_admin'::app_role) OR
  has_role_optimized('property_manager'::app_role) OR
  has_role_optimized('department_head'::app_role)
);

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated USING (
  (auth.uid() = created_by_id) OR 
  has_role_optimized('corporate_admin'::app_role) OR
  has_role_optimized('regional_admin'::app_role)
);
