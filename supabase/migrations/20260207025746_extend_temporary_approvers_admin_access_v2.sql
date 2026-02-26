-- Allow HR/Admins to manage temporary approvers

ALTER TABLE public.temporary_approvers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temporary_approvers_select_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_select_delegation"
  ON public.temporary_approvers FOR SELECT
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR delegate_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "temporary_approvers_insert_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_insert_delegation"
  ON public.temporary_approvers FOR INSERT
  TO authenticated
  WITH CHECK (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "temporary_approvers_update_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_update_delegation"
  ON public.temporary_approvers FOR UPDATE
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  )
  WITH CHECK (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "temporary_approvers_delete_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_delete_delegation"
  ON public.temporary_approvers FOR DELETE
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );
;
