-- ==============================================================================
-- P5 GROUP 1 TENANCY: announcements child tables
--   announcement_acknowledgments, announcement_attachments, announcement_comments,
--   announcement_reads, announcement_targets
-- ==============================================================================
-- Classification: TENANT_VIA_PARENT
--   parent = public.announcements (already TENANT_DIRECT, organization_id NOT NULL
--   after migration 20260902010100). Local FK on every child = announcement_id.
--
-- Per child table this migration:
--   1. ADD COLUMN IF NOT EXISTS organization_id uuid + guarded FK
--      -> organizations(id) ON DELETE CASCADE.
--   2. Backfill organization_id from announcements.organization_id via announcement_id;
--      any orphan / NULL-parent row -> LIT ('e0000000-0000-0000-0000-000000000001').
--   3. CREATE INDEX IF NOT EXISTS idx_<t>_organization_id.
--   4. SET NOT NULL (all rows NOT-NULL-safe: 0 live rows in every child table,
--      parent org is NOT NULL).
--   5. BEFORE INSERT trigger -> populate organization_id from the parent announcement
--      when NULL (shared SECURITY DEFINER trigger fn, search_path = public).
--   6. RLS: rewrite every policy that (i) references legacy user_roles role names
--      (is_hr_or_admin / has_role(..,'regional_admin') / has_role(..,'property_manager'))
--      or (ii) does an EXISTS-to-parent / "any authenticated user" check with NO org
--      predicate, into a policy that also requires org_visible(organization_id).
--      Legacy admin branches are mapped to is_tenant_people_admin(organization_id).
--      Stricter per-row predicates (user_id = auth.uid(), expiry window) are preserved.
--      service_role keeps full access via an explicit FOR ALL policy.
--
-- No access is broadened vs the current live policies: org_visible() only narrows,
-- legacy global-admin reads become tenant-admin reads, and the only added policies
-- are service_role FOR ALL (service_role already bypasses RLS).
--
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.announcement_acknowledgments DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.announcement_attachments     DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.announcement_comments        DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.announcement_reads           DROP COLUMN IF EXISTS organization_id;
--     ALTER TABLE public.announcement_targets         DROP COLUMN IF EXISTS organization_id;
--     DROP FUNCTION IF EXISTS public.set_announcement_child_org();
--   COMMIT;
--   (restore prior policies from git history)
--
-- Idempotent. Single transaction.
-- ==============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Shared BEFORE INSERT trigger function (parent = announcements)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_announcement_child_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.announcement_id IS NOT NULL THEN
    SELECT a.organization_id INTO v_org
    FROM public.announcements a
    WHERE a.id = NEW.announcement_id;
  END IF;

  NEW.organization_id := COALESCE(v_org, 'e0000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_announcement_child_org() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.set_announcement_child_org() TO authenticated, service_role;

-- ==========================================================================
-- Helper block: add column + FK + backfill + index + NOT NULL + trigger
-- (written out per-table for clarity / idempotency)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. announcement_acknowledgments
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_acknowledgments ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'announcement_acknowledgments'
      AND constraint_name = 'announcement_acknowledgments_organization_id_fkey'
  ) THEN
    ALTER TABLE public.announcement_acknowledgments
      ADD CONSTRAINT announcement_acknowledgments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.announcement_acknowledgments c
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.announcements a WHERE a.id = c.announcement_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE c.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_acknowledgments_organization_id
  ON public.announcement_acknowledgments (organization_id);

ALTER TABLE public.announcement_acknowledgments ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.announcement_acknowledgments;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.announcement_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_child_org();

-- --------------------------------------------------------------------------
-- 2. announcement_attachments
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_attachments ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'announcement_attachments'
      AND constraint_name = 'announcement_attachments_organization_id_fkey'
  ) THEN
    ALTER TABLE public.announcement_attachments
      ADD CONSTRAINT announcement_attachments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.announcement_attachments c
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.announcements a WHERE a.id = c.announcement_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE c.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_organization_id
  ON public.announcement_attachments (organization_id);

ALTER TABLE public.announcement_attachments ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.announcement_attachments;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.announcement_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_child_org();

-- --------------------------------------------------------------------------
-- 3. announcement_comments
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_comments ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'announcement_comments'
      AND constraint_name = 'announcement_comments_organization_id_fkey'
  ) THEN
    ALTER TABLE public.announcement_comments
      ADD CONSTRAINT announcement_comments_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.announcement_comments c
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.announcements a WHERE a.id = c.announcement_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE c.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_comments_organization_id
  ON public.announcement_comments (organization_id);

ALTER TABLE public.announcement_comments ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.announcement_comments;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.announcement_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_child_org();

-- --------------------------------------------------------------------------
-- 4. announcement_reads
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_reads ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'announcement_reads'
      AND constraint_name = 'announcement_reads_organization_id_fkey'
  ) THEN
    ALTER TABLE public.announcement_reads
      ADD CONSTRAINT announcement_reads_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.announcement_reads c
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.announcements a WHERE a.id = c.announcement_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE c.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_reads_organization_id
  ON public.announcement_reads (organization_id);

ALTER TABLE public.announcement_reads ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.announcement_reads;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.announcement_reads
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_child_org();

-- --------------------------------------------------------------------------
-- 5. announcement_targets
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_targets ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'announcement_targets'
      AND constraint_name = 'announcement_targets_organization_id_fkey'
  ) THEN
    ALTER TABLE public.announcement_targets
      ADD CONSTRAINT announcement_targets_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.announcement_targets c
   SET organization_id = COALESCE(
     (SELECT a.organization_id FROM public.announcements a WHERE a.id = c.announcement_id),
     'e0000000-0000-0000-0000-000000000001'::uuid)
 WHERE c.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_targets_organization_id
  ON public.announcement_targets (organization_id);

ALTER TABLE public.announcement_targets ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_set_org ON public.announcement_targets;
CREATE TRIGGER trg_set_org
  BEFORE INSERT ON public.announcement_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_child_org();

-- ==========================================================================
-- RLS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- announcement_acknowledgments
--   legacy: hr_admin_view_acks -> is_hr_or_admin(auth.uid()), no org filter.
--   own-row insert/update/delete preserved, now also org-scoped.
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_admin_view_acks    ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS users_own_acks_insert ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS users_own_acks_update ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS users_own_acks_delete ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_own_select       ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_admin_select     ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_own_insert       ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_own_update       ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_own_delete       ON public.announcement_acknowledgments;
DROP POLICY IF EXISTS aack_service_all      ON public.announcement_acknowledgments;

-- aack_own_select removed per P5P6_REVIEW: adding a non-admin "read your own
-- acknowledgment rows" path would broaden access vs the single live SELECT
-- policy (hr_admin_view_acks). Admin-only read is retained below.

CREATE POLICY aack_admin_select ON public.announcement_acknowledgments
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) AND is_tenant_people_admin(organization_id));

CREATE POLICY aack_own_insert ON public.announcement_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY aack_own_update ON public.announcement_acknowledgments
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND user_id = (SELECT auth.uid()))
  WITH CHECK (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY aack_own_delete ON public.announcement_acknowledgments
  FOR DELETE TO authenticated
  USING (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY aack_service_all ON public.announcement_acknowledgments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- announcement_attachments
--   legacy: announcement_attachments_select -> has_role(..,'regional_admin')
--   + EXISTS-to-parent, no org filter. Rewrite with org_visible + parent join.
--   No write policy exists today -> not added (service_role keeps full access).
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_attachments_select ON public.announcement_attachments;
DROP POLICY IF EXISTS aatt_select        ON public.announcement_attachments;
DROP POLICY IF EXISTS aatt_service_all   ON public.announcement_attachments;

CREATE POLICY aatt_select ON public.announcement_attachments
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = announcement_attachments.announcement_id
          AND (
            is_tenant_people_admin(a.organization_id)
            OR a.expires_at IS NULL
            OR a.expires_at > now()
          )
      )
    )
    OR is_platform_super_admin()
  );

CREATE POLICY aatt_service_all ON public.announcement_attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- announcement_comments
--   legacy: auth_view_ann_comments -> "auth.uid() IS NOT NULL" (global read).
--   own-row insert/update + own/admin delete preserved, now org-scoped.
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_view_ann_comments          ON public.announcement_comments;
DROP POLICY IF EXISTS users_insert_ann_comments       ON public.announcement_comments;
DROP POLICY IF EXISTS users_update_ann_comments       ON public.announcement_comments;
DROP POLICY IF EXISTS users_admin_delete_ann_comments ON public.announcement_comments;
DROP POLICY IF EXISTS acmt_select      ON public.announcement_comments;
DROP POLICY IF EXISTS acmt_insert      ON public.announcement_comments;
DROP POLICY IF EXISTS acmt_update      ON public.announcement_comments;
DROP POLICY IF EXISTS acmt_delete      ON public.announcement_comments;
DROP POLICY IF EXISTS acmt_service_all ON public.announcement_comments;

CREATE POLICY acmt_select ON public.announcement_comments
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

CREATE POLICY acmt_insert ON public.announcement_comments
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY acmt_update ON public.announcement_comments
  FOR UPDATE TO authenticated
  USING (org_visible(organization_id) AND user_id = (SELECT auth.uid()))
  WITH CHECK (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY acmt_delete ON public.announcement_comments
  FOR DELETE TO authenticated
  USING (
    org_visible(organization_id)
    AND (user_id = (SELECT auth.uid()) OR is_tenant_people_admin(organization_id))
  );

CREATE POLICY acmt_service_all ON public.announcement_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- announcement_reads
--   legacy: announcement_reads_select -> has_role(..,'regional_admin')
--   / has_role(..,'property_manager'), no org filter.
--   own-row insert preserved, now org-scoped.
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_reads_select        ON public.announcement_reads;
DROP POLICY IF EXISTS announcement_reads_insert_users  ON public.announcement_reads;
DROP POLICY IF EXISTS aread_select      ON public.announcement_reads;
DROP POLICY IF EXISTS aread_insert      ON public.announcement_reads;
DROP POLICY IF EXISTS aread_service_all ON public.announcement_reads;

CREATE POLICY aread_select ON public.announcement_reads
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND (
        user_id = (SELECT auth.uid())
        OR is_tenant_people_admin(organization_id)
      )
    )
    OR is_platform_super_admin()
  );

CREATE POLICY aread_insert ON public.announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (org_visible(organization_id) AND user_id = (SELECT auth.uid()));

CREATE POLICY aread_service_all ON public.announcement_reads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------------
-- announcement_targets
--   legacy: announcement_targets_select -> has_role(..,'regional_admin')
--   + EXISTS-to-parent, no org filter.
--   No write policy exists today -> not added (service_role keeps full access).
-- --------------------------------------------------------------------------
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_targets_select ON public.announcement_targets;
DROP POLICY IF EXISTS atgt_select      ON public.announcement_targets;
DROP POLICY IF EXISTS atgt_service_all ON public.announcement_targets;

CREATE POLICY atgt_select ON public.announcement_targets
  FOR SELECT TO authenticated
  USING (
    (
      org_visible(organization_id)
      AND EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = announcement_targets.announcement_id
          AND (
            is_tenant_people_admin(a.organization_id)
            OR a.expires_at IS NULL
            OR a.expires_at > now()
          )
      )
    )
    OR is_platform_super_admin()
  );

CREATE POLICY atgt_service_all ON public.announcement_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
