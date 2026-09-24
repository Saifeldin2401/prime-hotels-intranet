
-- Phase 11 / Phase 5 gap: profiles RLS keyed on has_profile_access(), which was entirely
-- property/legacy-role based with a "target has no property -> allow" fallback. In the new
-- tenant model most users have no user_properties row, so a regional_admin / corporate_admin
-- of ANY org could read EVERY such profile -> cross-tenant PII leak (date_of_birth is
-- populated for all users; emergency contacts, nationality, staff_id, etc. also present).

-- shared-org predicate: do the two users share an active organization membership?
CREATE OR REPLACE FUNCTION public.users_share_active_org(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships ma
    JOIN public.organization_memberships mb ON mb.organization_id = ma.organization_id
    WHERE ma.user_id = _a AND mb.user_id = _b
      AND ma.is_active = true AND mb.is_active = true
  );
$fn$;
GRANT EXECUTE ON FUNCTION public.users_share_active_org(uuid, uuid) TO authenticated;

-- WRITE / manage rule: self, platform super admin, or a people-admin in an org they share.
CREATE OR REPLACE FUNCTION public.has_profile_access(_admin_id uuid, _target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT
    _admin_id = _target_user_id
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _admin_id AND role = 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships ma
      JOIN public.organization_memberships mt ON mt.organization_id = ma.organization_id
      WHERE ma.user_id = _admin_id AND mt.user_id = _target_user_id
        AND ma.is_active = true AND mt.is_active = true
        AND ma.role IN ('organization_owner','organization_admin','hotel_admin')
    );
$fn$;

-- SELECT: same-org members may see each other's profile row (team lists, instructor lookup);
-- cross-tenant is blocked. (Column-level PII minimisation is a separate follow-up.)
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_platform_super_admin()
  OR public.users_share_active_org(auth.uid(), id)
);

-- UPDATE stays on the stricter has_profile_access rule.
DROP POLICY IF EXISTS consolidated_profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
USING (public.has_profile_access(auth.uid(), id))
WITH CHECK (public.has_profile_access(auth.uid(), id));
