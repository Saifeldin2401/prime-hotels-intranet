-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. DROP old ambiguous policies
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

-- 2. Allow Admins/Managers to CREATE notifications for ANYONE
CREATE POLICY "notifications_create_admin"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_optimized('regional_admin') OR
  public.has_role_optimized('property_manager') OR
  public.has_role_optimized('regional_hr') OR
  public.has_role_optimized('property_hr') OR
  public.has_role_optimized('department_head') OR
  -- Also allow users to send to themselves (for testing or self-triggers)
  auth.uid() = user_id
);

-- 3. Allow Admins/Managers to VIEW/UPDATE/DELETE any notification (needed for management)
CREATE POLICY "notifications_manage_admin"
ON public.notifications
FOR ALL
TO authenticated
USING (
  public.has_role_optimized('regional_admin') OR
  public.has_role_optimized('property_manager') OR
  public.has_role_optimized('regional_hr') OR
  public.has_role_optimized('property_hr') OR
  public.has_role_optimized('department_head')
);

-- Note: Existing "notifications_select_own" handles user viewing.
;
