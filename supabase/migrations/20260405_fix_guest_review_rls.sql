BEGIN;

-- Fix guest_review_comments RLS to use consistent role checking
DROP POLICY IF EXISTS "Users can view review comments" ON guest_review_comments;
CREATE POLICY "Users can view review comments" ON guest_review_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN guest_reviews gr ON gr.property_id = up.property_id
      WHERE gr.id = review_id AND up.user_id = auth.uid()
    ) OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
  );

-- Fix UPDATE policy to verify review access
DROP POLICY IF EXISTS "Users can update own comments" ON guest_review_comments;
CREATE POLICY "Users can update own comments" ON guest_review_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM guest_reviews gr
      JOIN user_properties up ON up.property_id = gr.property_id
      WHERE gr.id = review_id AND up.user_id = auth.uid()
    )
  );

-- Add INSERT policy for guest_review_assignments
DROP POLICY IF EXISTS guest_review_assignments_insert ON public.guest_review_assignments;
CREATE POLICY guest_review_assignments_insert
  ON public.guest_review_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_guest_review_property(property_id));

COMMIT;
