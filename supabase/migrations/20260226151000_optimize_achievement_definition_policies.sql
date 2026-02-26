-- Remove overlapping permissive SELECT paths on achievement_definitions.
-- Keep admin write access while leaving reads to the dedicated SELECT policy.

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS achievement_definitions_manage_admin ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_manage_admin_insert ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_manage_admin_update ON public.achievement_definitions;
DROP POLICY IF EXISTS achievement_definitions_manage_admin_delete ON public.achievement_definitions;

CREATE POLICY achievement_definitions_manage_admin_insert
  ON public.achievement_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  );

CREATE POLICY achievement_definitions_manage_admin_update
  ON public.achievement_definitions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  );

CREATE POLICY achievement_definitions_manage_admin_delete
  ON public.achievement_definitions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr')
    )
  );
