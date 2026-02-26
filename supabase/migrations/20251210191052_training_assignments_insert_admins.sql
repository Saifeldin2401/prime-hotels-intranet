-- Allow admins to insert training assignments
CREATE POLICY "training_assignments_insert_admins"
  ON training_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );;
