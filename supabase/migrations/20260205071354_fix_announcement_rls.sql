-- Enable RLS (just in case)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Manager Manage (Insert, Update, Delete)
-- Uses the new optimized role check
CREATE POLICY "announcements_manage_policy"
ON public.announcements
FOR ALL
TO authenticated
USING (
  public.has_role_optimized('regional_admin') OR
  public.has_role_optimized('property_manager') OR
  public.has_role_optimized('regional_hr') OR
  public.has_role_optimized('property_hr') OR
  public.has_role_optimized('department_head')
)
WITH CHECK (
  public.has_role_optimized('regional_admin') OR
  public.has_role_optimized('property_manager') OR
  public.has_role_optimized('regional_hr') OR
  public.has_role_optimized('property_hr') OR
  public.has_role_optimized('department_head')
);

-- Policy: View (Authenticated) - Already exists as "announcements_select_all_authenticated" but let's ensure coverage if needed
-- Existing policies seem to cover SELECT perfectly well.
;
