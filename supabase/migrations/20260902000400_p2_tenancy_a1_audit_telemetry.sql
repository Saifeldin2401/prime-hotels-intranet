-- ============================================================================
-- P2 Tenancy - Batch A1: audit / telemetry big tables
-- ----------------------------------------------------------------------------
-- Adds organization_id + backfill + index + NOT NULL + tenant RLS to:
--   system_events, analytics_events, ai_usage_log, search_logs, user_sessions
--
-- Single-tenant today (org e0000000-0000-0000-0000-000000000001 = LIT). Every
-- existing row is backfilled: actor/user membership first, else LIT. NO row is
-- left NULL, and organization_id is then made NOT NULL on all five tables, which
-- removes the "system-origin rows visible only to platform admins" regression.
--
-- RLS: append-heavy audit tables.
--   INSERT = row's own actor (actor_id/user_id = auth.uid()) OR service_role
--            (analytics_events / search_logs also allow user_id IS NULL).
--   SELECT = own row OR (org_visible + is_tenant_people_admin) OR platform super admin.
--   user_sessions also keeps an admin manage (ALL) policy, org-scoped to
--   is_tenant_admin (narrower than people_admin) + platform super admin.
--
-- Rollback: drop trg_audit_set_organization_id trigger+fn, drop new policies,
--   recreate prior user_roles-based policies from history, DROP COLUMN organization_id.
-- ============================================================================

BEGIN;

-- 1. Columns + FK ------------------------------------------------------------
ALTER TABLE public.system_events    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.ai_usage_log     ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.search_logs      ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.user_sessions    ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_events','analytics_events','ai_usage_log','search_logs','user_sessions'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = t || '_organization_id_fkey' AND conrelid = ('public.'||t)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT',
        t, t || '_organization_id_fkey');
    END IF;
  END LOOP;
END $$;

-- 2. Backfill (every row) --------------------------------------------------
UPDATE public.system_events se
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = se.actor_id AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE se.organization_id IS NULL;

UPDATE public.analytics_events ae
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = ae.user_id AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE ae.organization_id IS NULL;

UPDATE public.ai_usage_log al
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = al.user_id AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      (SELECT tm.organization_id FROM public.training_modules tm WHERE tm.id = al.course_id),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE al.organization_id IS NULL;

UPDATE public.search_logs sl
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = sl.user_id AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      (SELECT d.organization_id FROM public.departments d WHERE d.id = sl.department_id),
      (SELECT h.organization_id FROM public.hotels h WHERE h.id = sl.property_id),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE sl.organization_id IS NULL;

UPDATE public.user_sessions us
SET organization_id = COALESCE(
      (SELECT om.organization_id FROM public.organization_memberships om
        WHERE om.user_id = us.user_id AND om.is_active
        ORDER BY om.is_primary DESC, om.created_at ASC LIMIT 1),
      'e0000000-0000-0000-0000-000000000001'::uuid)
WHERE us.organization_id IS NULL;

-- 3. Indexes --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_system_events_organization_id    ON public.system_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_organization_id ON public.analytics_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_organization_id     ON public.ai_usage_log (organization_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_organization_id      ON public.search_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_organization_id    ON public.user_sessions (organization_id);

-- 4. NOT NULL (all five, every row backfilled above) ---------------------
ALTER TABLE public.system_events    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.analytics_events ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ai_usage_log     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.search_logs      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.user_sessions    ALTER COLUMN organization_id SET NOT NULL;

-- 5. BEFORE INSERT trigger - populate organization_id when NULL ---------
CREATE OR REPLACE FUNCTION public.tg_audit_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_org   uuid;
  LIT constant uuid := 'e0000000-0000-0000-0000-000000000001';
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'system_events' THEN
    v_actor := NEW.actor_id;
  ELSE
    v_actor := NEW.user_id;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_memberships om
    WHERE om.user_id = v_actor AND om.is_active
    ORDER BY om.is_primary DESC, om.created_at ASC
    LIMIT 1;
  END IF;

  NEW.organization_id := COALESCE(v_org, LIT);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.tg_audit_set_organization_id() FROM public, anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_events','analytics_events','ai_usage_log','search_logs','user_sessions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_set_organization_id ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_set_organization_id BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.tg_audit_set_organization_id()', t);
  END LOOP;
END $$;

-- 6. RLS ---------------------------------------------------------------
ALTER TABLE public.system_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions    ENABLE ROW LEVEL SECURITY;

-- system_events
DROP POLICY IF EXISTS system_events_select_consolidated ON public.system_events;
DROP POLICY IF EXISTS system_events_insert_own          ON public.system_events;
DROP POLICY IF EXISTS system_events_select_tenant       ON public.system_events;
CREATE POLICY system_events_insert_own ON public.system_events
  FOR INSERT TO authenticated, service_role
  WITH CHECK (actor_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role');
CREATE POLICY system_events_select_tenant ON public.system_events
  FOR SELECT TO authenticated
  USING (
    actor_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );

-- analytics_events
DROP POLICY IF EXISTS hr_admin_view_analytics        ON public.analytics_events;
DROP POLICY IF EXISTS auth_insert_own_events         ON public.analytics_events;
DROP POLICY IF EXISTS analytics_events_insert_own     ON public.analytics_events;
DROP POLICY IF EXISTS analytics_events_select_tenant  ON public.analytics_events;
CREATE POLICY analytics_events_insert_own ON public.analytics_events
  FOR INSERT TO anon, authenticated, service_role
  WITH CHECK (
    user_id IS NULL
    OR user_id = (SELECT auth.uid())
    OR (SELECT auth.role()) = 'service_role'
  );
CREATE POLICY analytics_events_select_tenant ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );

-- ai_usage_log
DROP POLICY IF EXISTS ai_usage_log_select ON public.ai_usage_log;
DROP POLICY IF EXISTS ai_usage_log_insert ON public.ai_usage_log;
CREATE POLICY ai_usage_log_insert ON public.ai_usage_log
  FOR INSERT TO authenticated, service_role
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role');
CREATE POLICY ai_usage_log_select ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );

-- search_logs
DROP POLICY IF EXISTS search_logs_select ON public.search_logs;
DROP POLICY IF EXISTS search_logs_insert ON public.search_logs;
CREATE POLICY search_logs_insert ON public.search_logs
  FOR INSERT TO authenticated, service_role
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR user_id IS NULL
    OR (SELECT auth.role()) = 'service_role'
  );
CREATE POLICY search_logs_select ON public.search_logs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );

-- user_sessions
DROP POLICY IF EXISTS user_sessions_admin_all       ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_select_own      ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_insert          ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_select_tenant   ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_manage_tenant   ON public.user_sessions;
CREATE POLICY user_sessions_insert ON public.user_sessions
  FOR INSERT TO authenticated, service_role
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role');
CREATE POLICY user_sessions_select_tenant ON public.user_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
    OR public.is_platform_super_admin()
  );
CREATE POLICY user_sessions_manage_tenant ON public.user_sessions
  FOR ALL TO authenticated
  USING (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  )
  WITH CHECK (
    (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
    OR public.is_platform_super_admin()
  );

COMMIT;
