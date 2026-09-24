-- Migration: P4-b — profiles + user_roles tenancy
-- Intent:
--   * profiles: add organization_id (the user's PRIMARY org from organization_memberships,
--     else any active membership, else LIT), FK, index, backfill, NOT NULL, BEFORE INSERT
--     trigger, and an AFTER trigger on organization_memberships that keeps
--     profiles.organization_id synced when a primary membership changes.
--     Existing profiles RLS (profiles_select / profiles_update) is intentionally left
--     unchanged — users_share_active_org already scopes it.
--   * user_roles: add organization_id (member's org else LIT), FK, index, backfill, NOT NULL,
--     BEFORE INSERT trigger. RLS rewritten so role read/write is scoped to a shared org:
--     replaces the global has_role(regional_admin/regional_hr) write path with
--     is_tenant_people_admin(organization_id) AND the existing get_role_priority guard.
--     Platform-operator bypass (is_platform_super_admin) preserved. service_role keeps full access.
--
-- Rollback:
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_sync_profile_primary_org ON public.organization_memberships;
--   DROP FUNCTION IF EXISTS public.sync_profile_primary_organization();
--   DROP TRIGGER IF EXISTS trg_profiles_set_org ON public.profiles;
--   DROP TRIGGER IF EXISTS trg_user_roles_set_org ON public.user_roles;
--   ALTER TABLE public.profiles   DROP COLUMN IF EXISTS organization_id;
--   ALTER TABLE public.user_roles DROP COLUMN IF EXISTS organization_id;
--   DROP POLICY IF EXISTS user_roles_select        ON public.user_roles;
--   DROP POLICY IF EXISTS user_roles_insert        ON public.user_roles;
--   DROP POLICY IF EXISTS user_roles_update        ON public.user_roles;
--   DROP POLICY IF EXISTS user_roles_delete        ON public.user_roles;
--   DROP POLICY IF EXISTS user_roles_service_role  ON public.user_roles;
--   -- (legacy policies would need manual recreation)
--   COMMIT;

BEGIN;

------------------------------------------------------------------------------
-- 1. profiles.organization_id
------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_organization_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

-- Backfill: primary active membership, else any active membership, else LIT.
UPDATE public.profiles p
SET organization_id = COALESCE(
  (
    SELECT om.organization_id
    FROM public.organization_memberships om
    WHERE om.user_id = p.id
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1
  ),
  'e0000000-0000-0000-0000-000000000001'::uuid
)
WHERE p.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles (organization_id);

ALTER TABLE public.profiles
  ALTER COLUMN organization_id SET NOT NULL;

-- BEFORE INSERT: populate organization_id from the owning user (profiles.id -> auth.users.id).
DROP TRIGGER IF EXISTS trg_profiles_set_org ON public.profiles;
CREATE TRIGGER trg_profiles_set_org
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id_from_member('id');

------------------------------------------------------------------------------
-- 2. Keep profiles.organization_id synced with the user's primary membership
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_profile_primary_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := COALESCE(NEW.user_id, OLD.user_id);
  v_org uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT om.organization_id
  INTO v_org
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid
    AND om.is_active
  ORDER BY om.is_primary DESC, om.created_at ASC
  LIMIT 1;

  IF v_org IS NOT NULL THEN
    UPDATE public.profiles
    SET organization_id = v_org
    WHERE id = v_uid
      AND organization_id IS DISTINCT FROM v_org;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_profile_primary_org ON public.organization_memberships;
CREATE TRIGGER trg_sync_profile_primary_org
  AFTER INSERT OR UPDATE OF is_primary, is_active
  ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_primary_organization();

------------------------------------------------------------------------------
-- 3. user_roles.organization_id
------------------------------------------------------------------------------

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_organization_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

-- Backfill: member's org (primary active, else any active), else LIT.
UPDATE public.user_roles ur
SET organization_id = COALESCE(
  (
    SELECT om.organization_id
    FROM public.organization_memberships om
    WHERE om.user_id = ur.user_id
      AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1
  ),
  'e0000000-0000-0000-0000-000000000001'::uuid
)
WHERE ur.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id
  ON public.user_roles (organization_id);

ALTER TABLE public.user_roles
  ALTER COLUMN organization_id SET NOT NULL;

-- BEFORE INSERT: populate organization_id from the owning user.
DROP TRIGGER IF EXISTS trg_user_roles_set_org ON public.user_roles;
CREATE TRIGGER trg_user_roles_set_org
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id_from_member('user_id');

------------------------------------------------------------------------------
-- 4. user_roles RLS — scope role read/write to a shared organization
------------------------------------------------------------------------------

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop legacy / global-role policies.
DROP POLICY IF EXISTS consolidated_user_roles_select      ON public.user_roles;
DROP POLICY IF EXISTS user_roles_modify_admin_hr_delete   ON public.user_roles;
DROP POLICY IF EXISTS user_roles_modify_admin_hr_insert   ON public.user_roles;
DROP POLICY IF EXISTS user_roles_modify_admin_hr_update   ON public.user_roles;

-- Fresh tenant-scoped policies.
DROP POLICY IF EXISTS user_roles_select       ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert       ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update       ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete       ON public.user_roles;
DROP POLICY IF EXISTS user_roles_service_role ON public.user_roles;

-- SELECT: own rows, or any role row within an org the caller shares, or platform operator.
CREATE POLICY user_roles_select
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_people_admin(organization_id))
    OR is_platform_super_admin()
  );

-- INSERT: people-admin of that org AND cannot grant a role at/above their own priority.
CREATE POLICY user_roles_insert
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_super_admin()
    OR (
      org_visible(organization_id)
      AND is_tenant_people_admin(organization_id)
      AND get_role_priority(role) > get_user_role_priority(auth.uid())
    )
  );

-- UPDATE
CREATE POLICY user_roles_update
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      org_visible(organization_id)
      AND is_tenant_people_admin(organization_id)
      AND get_role_priority(role) > get_user_role_priority(auth.uid())
    )
  )
  WITH CHECK (
    is_platform_super_admin()
    OR (
      org_visible(organization_id)
      AND is_tenant_people_admin(organization_id)
      AND get_role_priority(role) > get_user_role_priority(auth.uid())
    )
  );

-- DELETE
CREATE POLICY user_roles_delete
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    is_platform_super_admin()
    OR (
      org_visible(organization_id)
      AND is_tenant_people_admin(organization_id)
      AND get_role_priority(role) > get_user_role_priority(auth.uid())
    )
  );

-- service_role keeps full access.
CREATE POLICY user_roles_service_role
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
