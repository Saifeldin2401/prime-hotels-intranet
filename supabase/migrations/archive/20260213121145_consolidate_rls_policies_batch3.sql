-- admin_delegations: merge overlapping INSERT/SELECT/UPDATE policies.
DROP POLICY IF EXISTS "Managers can create delegations" ON public.admin_delegations;
DROP POLICY IF EXISTS admin_delegations_insert ON public.admin_delegations;
DROP POLICY IF EXISTS "Users can view own delegations" ON public.admin_delegations;
DROP POLICY IF EXISTS admin_delegations_select ON public.admin_delegations;
DROP POLICY IF EXISTS "Delegators and admins can update delegations" ON public.admin_delegations;
DROP POLICY IF EXISTS admin_delegations_update ON public.admin_delegations;
DROP POLICY IF EXISTS admin_delegations_delete ON public.admin_delegations;

CREATE POLICY admin_delegations_insert ON public.admin_delegations
  FOR INSERT TO public
  WITH CHECK (
    (
      (SELECT auth.uid()) = delegator_id
      AND EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_roles.user_id = (SELECT auth.uid())
          AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role, 'regional_hr'::public.app_role, 'property_manager'::public.app_role])
      )
    )
    OR (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
  );

CREATE POLICY admin_delegations_select ON public.admin_delegations
  FOR SELECT TO public
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR (delegate_id = (SELECT auth.uid()))
    OR ((SELECT auth.uid()) = ANY (fallback_delegate_ids))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
  );

CREATE POLICY admin_delegations_update ON public.admin_delegations
  FOR UPDATE TO public
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
  )
  WITH CHECK (
    (delegator_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::public.app_role, 'regional_admin'::public.app_role])
    )
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
  );

CREATE POLICY admin_delegations_delete ON public.admin_delegations
  FOR DELETE TO public
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
  );

-- temporary_approvers: replace ALL + overlapping SELECT/CRUD policies with explicit policy set.
DROP POLICY IF EXISTS "Admins manage temporary approvers" ON public.temporary_approvers;
DROP POLICY IF EXISTS "Users view their own temporary approver records" ON public.temporary_approvers;
DROP POLICY IF EXISTS temporary_approvers_select_delegation ON public.temporary_approvers;
DROP POLICY IF EXISTS temporary_approvers_insert_delegation ON public.temporary_approvers;
DROP POLICY IF EXISTS temporary_approvers_update_delegation ON public.temporary_approvers;
DROP POLICY IF EXISTS temporary_approvers_delete_delegation ON public.temporary_approvers;

CREATE POLICY temporary_approvers_select ON public.temporary_approvers
  FOR SELECT TO public
  USING (
    (approver_id = (SELECT auth.uid()))
    OR (temporary_approver_id = (SELECT auth.uid()))
    OR (delegator_id = (SELECT auth.uid()))
    OR (delegate_id = (SELECT auth.uid()))
    OR ((SELECT auth.uid()) = ANY (fallback_delegate_ids))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
  );

CREATE POLICY temporary_approvers_insert ON public.temporary_approvers
  FOR INSERT TO public
  WITH CHECK (
    (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
  );

CREATE POLICY temporary_approvers_update ON public.temporary_approvers
  FOR UPDATE TO public
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
  )
  WITH CHECK (
    (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
  );

CREATE POLICY temporary_approvers_delete ON public.temporary_approvers
  FOR DELETE TO public
  USING (
    (delegator_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_hr'::public.app_role)
    OR has_role((SELECT auth.uid()), 'property_manager'::text)
  );;
