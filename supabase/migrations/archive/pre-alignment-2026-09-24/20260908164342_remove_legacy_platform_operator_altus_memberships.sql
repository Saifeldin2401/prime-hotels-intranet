-- Audit C2: Platform operators (System Owner / Platform Admin) must not be
-- auto-enrolled as tenant members. The 2026-08-31 seed made every internal
-- operator an owner/admin of "Altus Hospitality Group" — the literal
-- "Altus = the platform" legacy mapping. A platform operator reaches a tenant
-- only through an audited break-glass session (start_platform_session).
--
-- Reversible: rows are deactivated, not deleted; a copy is kept in
-- public._c2_removed_operator_memberships_backup. To restore a person as a
-- genuine tenant member, insert a fresh, intentional organization_memberships
-- row (or flip is_active back) — do not rely on the seed.

BEGIN;

CREATE TABLE IF NOT EXISTS public._c2_removed_operator_memberships_backup (
  membership_id uuid PRIMARY KEY,
  user_id uuid,
  organization_id uuid,
  role text,
  removed_at timestamptz DEFAULT now()
);

WITH targets AS (
  SELECT om.id, om.user_id, om.organization_id, om.role::text AS role
  FROM public.organization_memberships om
  WHERE om.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.platform_users pu
      JOIN public.platform_role_assignments pra
        ON pra.platform_user_id = pu.user_id
       AND pra.revoked_at IS NULL
       AND pra.platform_role IN ('system_owner','platform_admin')
      WHERE pu.user_id = om.user_id AND pu.is_active
    )
)
INSERT INTO public._c2_removed_operator_memberships_backup (membership_id, user_id, organization_id, role)
SELECT id, user_id, organization_id, role FROM targets
ON CONFLICT (membership_id) DO NOTHING;

UPDATE public.organization_memberships om
SET is_active = false, updated_at = now()
WHERE om.is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.platform_users pu
    JOIN public.platform_role_assignments pra
      ON pra.platform_user_id = pu.user_id
     AND pra.revoked_at IS NULL
     AND pra.platform_role IN ('system_owner','platform_admin')
    WHERE pu.user_id = om.user_id AND pu.is_active
  );

COMMIT;
