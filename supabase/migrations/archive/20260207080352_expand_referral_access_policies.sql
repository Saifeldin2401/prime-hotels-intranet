-- Expand referral access policies to include property managers and corporate admins

-- Storage access: allow HR + managers to view referral CVs
DROP POLICY IF EXISTS "referral_cvs_select_owner_or_hr" ON storage.objects;
CREATE POLICY "referral_cvs_select_owner_or_hr"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'referral-cvs'
    AND (
      split_part(name, '/', 2) = auth.uid()::text
      OR has_any_role(auth.uid(), ARRAY['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager']::app_role[])
    )
  );

-- Referral history access: allow HR + managers to view timeline
DROP POLICY IF EXISTS "referral_history_select" ON public.referral_history;
CREATE POLICY "referral_history_select"
  ON public.referral_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_applications ja
      WHERE ja.id = referral_id
        AND (
          ja.referred_by = auth.uid()
          OR has_any_role(auth.uid(), ARRAY['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager']::app_role[])
        )
    )
  );;
