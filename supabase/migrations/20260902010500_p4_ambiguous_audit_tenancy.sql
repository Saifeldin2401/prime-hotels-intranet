-- 20260902010500_p4_ambiguous_audit_tenancy.sql
--
-- TASK P4-d: AMBIGUOUS remainder + audit tables tenancy lockdown.
--
-- Intent:
--   Add organization_id + FK + index + populate trigger + tenant RLS to:
--     content_change_log, content_reviews, inbound_emails, status_history,
--     audit_export_retention_policies
--   All five tables are empty in production today, so backfill is a no-op guard
--   that stamps LIT ('e0000000-0000-0000-0000-000000000001') onto any stray row.
--
--   Ownership derivation (all polymorphic content/entity refs -> treat as USER_OWNED):
--     content_change_log            -> actor        (nullable -> LIT fallback)
--     content_reviews               -> submitted_by (NOT NULL)
--     status_history                -> changed_by   (nullable -> LIT fallback)
--     audit_export_retention_policies-> created_by  (nullable -> LIT fallback)
--     inbound_emails                -> no owner; routing table -> LIT default via dedicated trigger
--
--   RLS model:
--     content_change_log            : SELECT own-row OR tenant content editor in org OR super admin. Immutable (no write policy; service_role bypasses).
--     content_reviews              : SELECT own-row OR tenant content editor; INSERT own-row in-review in visible org; UPDATE by tenant content editor. super admin override.
--     status_history               : SELECT own-row OR org_visible OR super admin; INSERT own-row in visible org.
--     audit_export_retention_policies: SELECT org_visible OR super admin; write by is_tenant_admin(org) OR super admin.
--     inbound_emails               : SELECT by is_tenant_admin(org) OR super admin; writes service_role only (no authenticated write policy).
--   service_role retains full access on every table (RLS bypass).
--
--   master_content_deployments: already RLS-scoped by target_organization_id via
--   master_content_deployments_select / _write (platform-operator gated). NOT loose
--   -> intentionally left unchanged (no new column, no policy change).
--
-- Rollback:
--   DROP the added policies and triggers, then
--   ALTER TABLE <t> DROP COLUMN IF EXISTS organization_id;
--   (legacy policies listed below would need manual recreation from git history).

BEGIN;

-- ---------------------------------------------------------------------------
-- Shared dedicated VIA-PARENT-less trigger for tables with no owner column:
-- default organization_id to LIT when NULL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_organization_id_default_lit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := 'e0000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  RETURN NEW;
END;
$fn$;

-- ===========================================================================
-- content_change_log  (USER_OWNED via actor)
-- ===========================================================================
ALTER TABLE public.content_change_log
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_change_log_organization_id_fkey'
      AND conrelid = 'public.content_change_log'::regclass
  ) THEN
    ALTER TABLE public.content_change_log
      ADD CONSTRAINT content_change_log_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.content_change_log ccl
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = ccl.actor AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_change_log_organization_id
  ON public.content_change_log (organization_id);

ALTER TABLE public.content_change_log ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_content_change_log_set_org ON public.content_change_log;
CREATE TRIGGER trg_content_change_log_set_org
  BEFORE INSERT ON public.content_change_log
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member('actor');

ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_change_log_select ON public.content_change_log;
CREATE POLICY content_change_log_select ON public.content_change_log
  FOR SELECT TO authenticated
  USING (
    actor = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

-- ===========================================================================
-- content_reviews  (USER_OWNED via submitted_by; content editor writable)
-- ===========================================================================
ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_reviews_organization_id_fkey'
      AND conrelid = 'public.content_reviews'::regclass
  ) THEN
    ALTER TABLE public.content_reviews
      ADD CONSTRAINT content_reviews_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.content_reviews cr
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = cr.submitted_by AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_reviews_organization_id
  ON public.content_reviews (organization_id);

ALTER TABLE public.content_reviews ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_content_reviews_set_org ON public.content_reviews;
CREATE TRIGGER trg_content_reviews_set_org
  BEFORE INSERT ON public.content_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member('submitted_by');

ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reviews_select ON public.content_reviews;
CREATE POLICY content_reviews_select ON public.content_reviews
  FOR SELECT TO authenticated
  USING (
    submitted_by = (SELECT auth.uid())
    OR (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

DROP POLICY IF EXISTS content_reviews_insert ON public.content_reviews;
CREATE POLICY content_reviews_insert ON public.content_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (SELECT auth.uid())
    AND status = 'in_review'::content_status
    AND org_visible(organization_id)
  );

DROP POLICY IF EXISTS content_reviews_update ON public.content_reviews;
CREATE POLICY content_reviews_update ON public.content_reviews
  FOR UPDATE TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  )
  WITH CHECK (
    (org_visible(organization_id) AND is_tenant_content_editor(organization_id))
    OR is_platform_super_admin()
  );

-- ===========================================================================
-- status_history  (USER_OWNED via changed_by)
-- ===========================================================================
ALTER TABLE public.status_history
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'status_history_organization_id_fkey'
      AND conrelid = 'public.status_history'::regclass
  ) THEN
    ALTER TABLE public.status_history
      ADD CONSTRAINT status_history_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.status_history sh
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = sh.changed_by AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_status_history_organization_id
  ON public.status_history (organization_id);

ALTER TABLE public.status_history ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_status_history_set_org ON public.status_history;
CREATE TRIGGER trg_status_history_set_org
  BEFORE INSERT ON public.status_history
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member('changed_by');

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert status history" ON public.status_history;
DROP POLICY IF EXISTS status_history_insert ON public.status_history;
CREATE POLICY status_history_insert ON public.status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = (SELECT auth.uid())
    AND org_visible(organization_id)
  );

DROP POLICY IF EXISTS status_history_select_scoped ON public.status_history;
-- NOTE (P3P4_REVIEW): system rows (changed_by IS NULL, backfilled to LIT) must
-- not become org-wide readable; the org_visible branch excludes null-changed_by.
CREATE POLICY status_history_select_scoped ON public.status_history
  FOR SELECT TO authenticated
  USING (
    changed_by = (SELECT auth.uid())
    OR (changed_by IS NOT NULL AND org_visible(organization_id))
    OR is_platform_super_admin()
  );

-- ===========================================================================
-- audit_export_retention_policies  (USER_OWNED via created_by; tenant-admin writable)
-- ===========================================================================
ALTER TABLE public.audit_export_retention_policies
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_export_retention_policies_organization_id_fkey'
      AND conrelid = 'public.audit_export_retention_policies'::regclass
  ) THEN
    ALTER TABLE public.audit_export_retention_policies
      ADD CONSTRAINT audit_export_retention_policies_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.audit_export_retention_policies p
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = p.created_by AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_export_retention_policies_organization_id
  ON public.audit_export_retention_policies (organization_id);

ALTER TABLE public.audit_export_retention_policies ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_audit_export_retention_policies_set_org ON public.audit_export_retention_policies;
CREATE TRIGGER trg_audit_export_retention_policies_set_org
  BEFORE INSERT ON public.audit_export_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_member('created_by');

ALTER TABLE public.audit_export_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_view_retention_policies ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS hr_admin_manage_retention_policies_delete ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS hr_admin_manage_retention_policies_insert ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS hr_admin_manage_retention_policies_update ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS audit_export_retention_policies_select ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS audit_export_retention_policies_insert ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS audit_export_retention_policies_update ON public.audit_export_retention_policies;
DROP POLICY IF EXISTS audit_export_retention_policies_delete ON public.audit_export_retention_policies;

CREATE POLICY audit_export_retention_policies_select ON public.audit_export_retention_policies
  FOR SELECT TO authenticated
  USING (org_visible(organization_id) OR is_platform_super_admin());

CREATE POLICY audit_export_retention_policies_insert ON public.audit_export_retention_policies
  FOR INSERT TO authenticated
  WITH CHECK (
    (org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );

CREATE POLICY audit_export_retention_policies_update ON public.audit_export_retention_policies
  FOR UPDATE TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  )
  WITH CHECK (
    (org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );

CREATE POLICY audit_export_retention_policies_delete ON public.audit_export_retention_policies
  FOR DELETE TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );

-- ===========================================================================
-- inbound_emails  (no owner; routing table; service_role writes only)
-- ===========================================================================
ALTER TABLE public.inbound_emails
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inbound_emails_organization_id_fkey'
      AND conrelid = 'public.inbound_emails'::regclass
  ) THEN
    ALTER TABLE public.inbound_emails
      ADD CONSTRAINT inbound_emails_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.inbound_emails
SET organization_id = 'e0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_organization_id
  ON public.inbound_emails (organization_id);

ALTER TABLE public.inbound_emails ALTER COLUMN organization_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_inbound_emails_set_org ON public.inbound_emails;
CREATE TRIGGER trg_inbound_emails_set_org
  BEFORE INSERT ON public.inbound_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_default_lit();

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inbound_emails_admin_read ON public.inbound_emails;
CREATE POLICY inbound_emails_admin_read ON public.inbound_emails
  FOR SELECT TO authenticated
  USING (
    (org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );
-- No INSERT/UPDATE/DELETE policy for authenticated: writes are service_role only
-- (service_role bypasses RLS). The ingestion webhook edge function uses the
-- service key.

-- ===========================================================================
-- master_content_deployments: reviewed, policies already scoped by
-- target_organization_id (platform-operator gated). No change required.
-- ===========================================================================

COMMIT;
