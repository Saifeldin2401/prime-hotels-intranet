DROP POLICY IF EXISTS "departments_select_property" ON departments;

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
  );;
