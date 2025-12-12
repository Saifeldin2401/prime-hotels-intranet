-- Allow users to update their own profile
-- This complements the existing profiles_update_admin_hr policy

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );
