-- ============================================================================
-- MIGRATION: fix_properties_and_profiles_company_scoping_gap
-- Two related bugs found during the frontend architecture audit:
--
-- 1. properties_modify_admin_{insert,update,delete} checked a bare
--    has_role(auth.uid(), 'regional_admin') with no company scoping at all,
--    completely bypassing has_property_access()'s existing company-scoping
--    logic (added by 20260721001616_add_company_scoped_admin_access.sql --
--    which correctly restricts a regional_admin to their granted
--    user_companies when such a grant exists). A company-scoped
--    regional_admin could still see/edit/DELETE every property across every
--    company, not just their own -- exactly the gap the company-scoping
--    migration's comment claimed to close but never propagated here.
--
-- 2. profiles' consolidated_profiles_update policy had USING allowing
--    regional_admin/regional_hr/property_manager/property_hr/self to select
--    the row for update, but WITH CHECK only allowed `id = auth.uid()`.
--    Since a profile's id never changes on UPDATE, NEW.id always equals the
--    target row's existing id -- meaning WITH CHECK could only ever pass
--    for a user updating their OWN profile. Every attempt by an admin/
--    manager to update ANOTHER user's profile has been silently updating 0
--    rows (Postgres RLS UPDATE semantics: WITH CHECK failure -> silent
--    no-op, no error) since this policy was created. This is a functionality
--    bug, not just a security one -- admin/HR profile edits have never
--    actually worked.
--
-- Fix: add has_profile_access(admin_id, target_user_id) -- property-level
-- roles (property_manager/property_hr) are scoped to targets who share a
-- property with them (has_property_access over the target's own
-- user_properties); regional-level roles (regional_admin/regional_hr) use
-- has_property_access's existing company-scoping by checking it against any
-- of the target's assigned properties. Use this for BOTH the properties
-- table role check (adapted for insert's not-yet-existing company_id) and
-- profiles' UPDATE USING/WITH CHECK (identical on both sides, closing the
-- broken-WITH-CHECK bug and the scoping gap together).
--
-- Verified via rolled-back functional tests: regional_admin updating another
-- user's profile now succeeds (previously silently affected 0 rows);
-- department_head (unrelated role) attempting the same update is blocked.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_profile_access(_admin_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    _admin_id = _target_user_id
    OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = _admin_id AND role = 'super_admin')
    OR
    -- Property-level roles: target must share a property the admin has access to
    (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = _admin_id AND role IN ('property_manager', 'property_hr'))
      AND EXISTS (
        SELECT 1 FROM user_properties up
        WHERE up.user_id = _target_user_id
          AND has_property_access(_admin_id, up.property_id)
      )
    )
    OR
    -- Regional/corporate roles: company-scoped via has_property_access against any of the target's properties
    -- (or the target has no property assignment at all -- e.g. a newly-created user -- in which case fall back
    -- to allowing it, matching pre-existing global-by-default behavior for these roles)
    (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = _admin_id AND role IN ('regional_admin', 'regional_hr', 'corporate_admin'))
      AND (
        NOT EXISTS (SELECT 1 FROM user_properties WHERE user_id = _target_user_id)
        OR EXISTS (
          SELECT 1 FROM user_properties up
          WHERE up.user_id = _target_user_id
            AND has_property_access(_admin_id, up.property_id)
        )
      )
    )
$function$;

DROP POLICY properties_modify_admin_insert ON public.properties;
DROP POLICY properties_modify_admin_update ON public.properties;
DROP POLICY properties_modify_admin_delete ON public.properties;

CREATE POLICY properties_modify_admin_insert ON public.properties FOR INSERT TO authenticated
  WITH CHECK (
    has_role((SELECT auth.uid()), 'super_admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'regional_admin'::app_role)
      AND (
        NOT EXISTS (SELECT 1 FROM user_companies WHERE user_id = (SELECT auth.uid()))
        OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = (SELECT auth.uid()))
      )
    )
  );
CREATE POLICY properties_modify_admin_update ON public.properties FOR UPDATE TO authenticated
  USING (has_property_access((SELECT auth.uid()), id) AND has_role((SELECT auth.uid()), 'regional_admin'::app_role))
  WITH CHECK (has_property_access((SELECT auth.uid()), id) AND has_role((SELECT auth.uid()), 'regional_admin'::app_role));
CREATE POLICY properties_modify_admin_delete ON public.properties FOR DELETE TO authenticated
  USING (has_property_access((SELECT auth.uid()), id) AND has_role((SELECT auth.uid()), 'regional_admin'::app_role));

DROP POLICY consolidated_profiles_update ON public.profiles;
CREATE POLICY consolidated_profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (has_profile_access((SELECT auth.uid()), id))
  WITH CHECK (has_profile_access((SELECT auth.uid()), id));
