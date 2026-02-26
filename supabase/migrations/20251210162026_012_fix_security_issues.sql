-- Add missing RLS policies

-- Announcement attachments: Same visibility as announcements
CREATE POLICY "announcement_attachments_select"
  ON announcement_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_attachments.announcement_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        (a.expires_at IS NULL OR a.expires_at > now())
      )
    )
  );

-- Training certificates: Same visibility as training progress
CREATE POLICY "training_certificates_select"
  ON training_certificates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_progress tp
      WHERE tp.id = training_certificates.training_progress_id
      AND (
        tp.user_id = auth.uid() OR
        public.has_role(auth.uid(), 'regional_admin') OR
        (public.has_role(auth.uid(), 'property_manager') AND
         EXISTS (
           SELECT 1 FROM user_properties up
           JOIN profiles p ON up.user_id = p.id
           WHERE p.id = tp.user_id AND up.property_id IN (
             SELECT property_id FROM user_properties WHERE user_id = auth.uid()
           )
         ))
      )
    )
  );

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;;
