-- Migration: Fix departments RLS policy for User Management
-- Issue: UserForm department checkboxes not showing because RLS policy
-- restricted access to only users with explicit property_access

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "departments_select_property" ON departments;

-- Create a more permissive policy that allows:
-- 1. All authenticated users to see active departments (needed for forms)
-- 2. Regional admin/HR to see all departments
-- 3. Property manager/HR to see all departments
-- 4. Users with explicit property access to see their property's departments
CREATE POLICY "departments_select_authenticated"
  ON departments FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr') OR
    public.has_property_access(auth.uid(), property_id)
  );
