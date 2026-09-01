-- Migration: 20260902010100_p3_tenant_direct_backfill_rls
-- Phase P3-a: TENANT_DIRECT tables that already carry organization_id but may have
--   NULL rows and/or legacy (pre-multitenant) RLS policies.
--
-- Scope (15 tables): announcements, api_keys, certificate_templates, certificates,
--   competencies, employee_transfer_logs, identity_providers, quota_warning_logs,
--   role_competency_requirements, service_accounts, system_settings, user_competencies,
--   webhook_endpoints, notification_queue, notification_delivery_events.
--
-- Intent:
--   1. Backfill NULL organization_id -> LIT for tenant-scoped rows.
--      system_settings + notification_delivery_events remain NULLABLE per TENANCY_MAP
--      (system_settings NULL == global config row; left untouched by design).
--      notification_delivery_events NULL rows are user-scoped telemetry -> backfilled
--      from the owning user's membership, else LIT.
--   2. Ensure idx_<t>_organization_id exists.
--   3. Replace any RLS policy still keyed on legacy user_roles names
--      (corporate_admin / regional_admin / regional_hr / property_manager / property_hr)
--      or lacking an org filter, with tenant policies gated on org_visible()/is_tenant_admin().
--      Only two tables needed policy changes: notification_delivery_events, notification_queue.
--      All other tables in scope were verified to already have correct tenant RLS and are
--      left unchanged (never broaden access).
--
-- Rollback: restore prior policies from migration history for notification_delivery_events
--   / notification_queue; organization_id backfill is data-only (set affected rows back to
--   NULL if strictly required). No destructive schema changes.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Backfill NULL organization_id
-- ---------------------------------------------------------------------------

-- Tenant-direct tables: NULL -> LIT
UPDATE public.announcements                SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.api_keys                     SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.certificate_templates        SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.certificates                 SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.competencies                 SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.employee_transfer_logs       SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.identity_providers           SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.quota_warning_logs           SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.role_competency_requirements SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.service_accounts             SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.user_competencies            SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.webhook_endpoints            SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.notification_queue           SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- notification_delivery_events: stays NULLABLE, but backfill existing data rows from
-- the owning user's membership (is_primary first), else LIT.
UPDATE public.notification_delivery_events e
SET organization_id = COALESCE(
  (SELECT om.organization_id
     FROM public.organization_memberships om
    WHERE om.user_id = e.user_id
    ORDER BY om.is_primary DESC NULLS LAST, om.created_at ASC
    LIMIT 1),
  'e0000000-0000-0000-0000-000000000001'
)
WHERE e.organization_id IS NULL;

-- system_settings: NULL organization_id rows are global-config rows by design
-- (TENANCY_MAP: "org NULLable today - global settings rows; keep NULL allowed").
-- Intentionally NOT backfilled.

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_announcements_organization_id                ON public.announcements (organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id                     ON public.api_keys (organization_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_organization_id        ON public.certificate_templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_organization_id                 ON public.certificates (organization_id);
CREATE INDEX IF NOT EXISTS idx_competencies_organization_id                 ON public.competencies (organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfer_logs_organization_id       ON public.employee_transfer_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_identity_providers_organization_id           ON public.identity_providers (organization_id);
CREATE INDEX IF NOT EXISTS idx_quota_warning_logs_organization_id           ON public.quota_warning_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_role_competency_requirements_organization_id ON public.role_competency_requirements (organization_id);
CREATE INDEX IF NOT EXISTS idx_service_accounts_organization_id             ON public.service_accounts (organization_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_organization_id              ON public.system_settings (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_competencies_organization_id            ON public.user_competencies (organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_organization_id            ON public.webhook_endpoints (organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_organization_id           ON public.notification_queue (organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_organization_id ON public.notification_delivery_events (organization_id);

-- ---------------------------------------------------------------------------
-- 3. RLS remediation
-- ---------------------------------------------------------------------------

-- 3a. notification_delivery_events
--     Legacy policy "admins_read_notification_delivery_events" is keyed on obsolete
--     user_roles enum names with NO organization filter -> cross-tenant leak once a
--     second tenant exists. Replace with a tenant-admin, org-scoped read.
ALTER TABLE public.notification_delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admins_read_notification_delivery_events ON public.notification_delivery_events;
DROP POLICY IF EXISTS nde_tenant_admin_read ON public.notification_delivery_events;
CREATE POLICY nde_tenant_admin_read ON public.notification_delivery_events
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );

-- (unchanged, kept for reference/idempotency: own-row read + service_role writes)
DROP POLICY IF EXISTS users_view_own_notification_delivery_events ON public.notification_delivery_events;
CREATE POLICY users_view_own_notification_delivery_events ON public.notification_delivery_events
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notification_delivery_events_service_insert ON public.notification_delivery_events;
CREATE POLICY notification_delivery_events_service_insert ON public.notification_delivery_events
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS notification_delivery_events_service_update ON public.notification_delivery_events;
CREATE POLICY notification_delivery_events_service_update ON public.notification_delivery_events
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS notification_delivery_events_service_delete ON public.notification_delivery_events;
CREATE POLICY notification_delivery_events_service_delete ON public.notification_delivery_events
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'service_role');

-- 3b. notification_queue
--     Had own-user read + service_role writes only. Add tenant-admin org-scoped read
--     so tenant admins can observe their org's queue (service_role keeps full write).
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nq_tenant_admin_read ON public.notification_queue;
CREATE POLICY nq_tenant_admin_read ON public.notification_queue
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND org_visible(organization_id) AND is_tenant_admin(organization_id))
    OR is_platform_super_admin()
  );

-- (unchanged, kept for idempotency: own-row read + service_role writes)
DROP POLICY IF EXISTS "Users can view own queue items" ON public.notification_queue;
CREATE POLICY "Users can view own queue items" ON public.notification_queue
  FOR SELECT TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS notification_queue_service_insert ON public.notification_queue;
CREATE POLICY notification_queue_service_insert ON public.notification_queue
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS notification_queue_service_update ON public.notification_queue;
CREATE POLICY notification_queue_service_update ON public.notification_queue
  FOR UPDATE TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS notification_queue_service_delete ON public.notification_queue;
CREATE POLICY notification_queue_service_delete ON public.notification_queue
  FOR DELETE TO public
  USING ((SELECT auth.role()) = 'service_role');

-- 3c. Other tables in scope (announcements, api_keys, certificate_templates,
--     certificates, competencies, employee_transfer_logs, identity_providers,
--     quota_warning_logs, role_competency_requirements, service_accounts,
--     system_settings, user_competencies, webhook_endpoints): verified to already
--     have tenant RLS gated on org_visible()/is_tenant_admin()/is_tenant_* with no
--     legacy user_roles references. Left unchanged to avoid broadening access.

COMMIT;
