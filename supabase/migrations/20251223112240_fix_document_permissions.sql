-- Fix Document Permissions
-- Revoke document creation/modification rights from 'staff' role

-- 1. Drop the existing overly-permissive policy
DROP POLICY IF EXISTS "documents_modify_author_approver" ON documents;

-- 2. Create refined policies for modification
-- INSERT: Only allowed for management/admin roles
CREATE POLICY "documents_insert_management" 
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr') OR
    public.has_role(auth.uid(), 'department_head')
  );

-- UPDATE/DELETE: Authors (if still in management role) or Higher level admins
CREATE POLICY "documents_modify_management" 
  ON documents FOR ALL 
  TO authenticated
  USING (
    -- Admins can always modify
    public.has_role(auth.uid(), 'regional_admin') OR
    -- Property managers can modify documents in their property
    (public.has_role(auth.uid(), 'property_manager') AND public.has_property_access(auth.uid(), property_id)) OR
    -- Authors can modify their own work ONLY if they are NOT staff
    (created_by = auth.uid() AND NOT public.has_role(auth.uid(), 'staff'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND public.has_property_access(auth.uid(), property_id)) OR
    (created_by = auth.uid() AND NOT public.has_role(auth.uid(), 'staff'))
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
;
