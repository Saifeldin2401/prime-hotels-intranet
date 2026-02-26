-- Allow admins to insert training modules
CREATE POLICY "training_modules_insert_admins"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

-- Allow admins to update training modules
CREATE POLICY "training_modules_update_admins"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );;
