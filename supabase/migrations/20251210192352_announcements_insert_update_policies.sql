-- Allow admins to insert/update announcements
CREATE POLICY "announcements_insert_admins"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

CREATE POLICY "announcements_update_admins"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr')
  );

-- Allow authenticated users to insert announcement_reads
CREATE POLICY "announcement_reads_insert_users"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());;
