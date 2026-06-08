-- Phase 0: RLS initplan performance fixes (remaining policies)

ALTER POLICY "Delegators and admins can update delegations" ON public.admin_delegations
  USING (
    (select auth.uid()) = delegator_id
    OR EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])
    )
  );

ALTER POLICY "Managers can create delegations" ON public.admin_delegations
  WITH CHECK (
    (select auth.uid()) = delegator_id
    AND EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])
    )
  );

ALTER POLICY "Users can view own delegations" ON public.admin_delegations
  USING (
    (select auth.uid()) = delegator_id
    OR (select auth.uid()) = delegate_id
    OR EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])
    )
  );

ALTER POLICY "admin_delegations_delete" ON public.admin_delegations
  USING (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "admin_delegations_insert" ON public.admin_delegations
  WITH CHECK (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "admin_delegations_select" ON public.admin_delegations
  USING (
    delegator_id = (select auth.uid())
    OR delegate_id = (select auth.uid())
    OR (select auth.uid()) = ANY (fallback_delegate_ids)
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "admin_delegations_update" ON public.admin_delegations
  USING (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  )
  WITH CHECK (
    delegator_id = (select auth.uid())
    OR has_role((select auth.uid()), 'regional_admin'::app_role)
    OR has_role((select auth.uid()), 'regional_hr'::app_role)
    OR has_role((select auth.uid()), 'property_hr'::app_role)
  );

ALTER POLICY "EOM manage policy" ON public.employee_of_the_month
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])
    )
  );

ALTER POLICY "referral_history_insert" ON public.referral_history
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM job_applications ja
      WHERE ja.id = referral_history.referral_id
        AND (is_hr((select auth.uid())) OR is_admin((select auth.uid())))
    )
  );

ALTER POLICY "referral_history_select" ON public.referral_history
  USING (
    EXISTS (
      SELECT 1
      FROM job_applications ja
      WHERE ja.id = referral_history.referral_id
        AND (
          ja.referred_by = (select auth.uid())
          OR has_any_role((select auth.uid()), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role])
        )
    )
  );

ALTER POLICY "Admins can manage role_permissions" ON public.role_permissions
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])
    )
  );

ALTER POLICY "Admins can insert settings" ON public.system_settings
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])
    )
  );

ALTER POLICY "Admins can modify settings" ON public.system_settings
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])
    )
  );

ALTER POLICY "All authenticated users can read settings" ON public.system_settings
  USING ((select auth.uid()) IS NOT NULL);;
