-- Phase 3a (rebuild, 2026-09-25): one capability matrix for both planes.
--
-- Before: the platform matrix was a VALUES list inside platform_operator_can(),
-- and tenant permissions were four hand-written role lists inside
-- is_tenant_admin / is_tenant_content_editor / is_tenant_people_admin /
-- can_issue_certificates. Nobody could answer "what can a training manager
-- do?" from one place.
--
-- After: public.role_capabilities(plane, role, capability) is the single
-- source. tenant_can(org, capability) and platform_operator_can(capability)
-- read it; the existing helpers keep their names (198 policies use them) and
-- their exact semantics, except where noted.
--
-- Behaviour changes (least privilege):
--   * is_tenant_people_admin: any platform operator (incl. platform_support)
--     could manage every tenant's people without a break-glass session. Now:
--     operators with tenant.manage, or an active audited session.
--   * Platform-plane writes checked "is any operator". Now by capability:
--     subscriptions / plans -> billing.manage; AI configuration and
--     role_permissions -> config.manage; login-failure and rate-limit logs ->
--     ops.manage.
--   * rate_limit_entries was readable by any tenant's corporate/regional
--     admin across all tenants (emails, IPs). Now operators with ops.manage.

CREATE TABLE public.role_capabilities (
  plane      text NOT NULL CHECK (plane IN ('platform', 'tenant')),
  role       text NOT NULL,
  capability text NOT NULL,
  PRIMARY KEY (plane, role, capability)
);

COMMENT ON TABLE public.role_capabilities IS
  'What each role may do. plane=tenant: organization_memberships.role; plane=platform: platform_role. capability ''*'' = everything in the plane.';

ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_capabilities_read ON public.role_capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY role_capabilities_write ON public.role_capabilities FOR ALL TO authenticated
  USING (public.platform_operator_has_role('system_owner'))
  WITH CHECK (public.platform_operator_has_role('system_owner'));
REVOKE ALL ON public.role_capabilities FROM anon;
GRANT SELECT ON public.role_capabilities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_capabilities TO authenticated;

INSERT INTO public.role_capabilities (plane, role, capability) VALUES
  -- Platform plane (unchanged from platform_operator_can's former VALUES list)
  ('platform', 'system_owner', '*'),
  ('platform', 'platform_admin', 'operator.manage'), ('platform', 'platform_admin', 'tenant.manage'),
  ('platform', 'platform_admin', 'billing.manage'),  ('platform', 'platform_admin', 'master_content.manage'),
  ('platform', 'platform_admin', 'ops.manage'),      ('platform', 'platform_admin', 'config.manage'),
  ('platform', 'platform_admin', 'tenant.enter'),    ('platform', 'platform_admin', 'tenant.read'),
  ('platform', 'platform_training_manager', 'master_content.manage'),
  ('platform', 'platform_training_manager', 'tenant.enter'), ('platform', 'platform_training_manager', 'tenant.read'),
  ('platform', 'platform_knowledge_manager', 'master_content.manage'),
  ('platform', 'platform_knowledge_manager', 'tenant.enter'), ('platform', 'platform_knowledge_manager', 'tenant.read'),
  ('platform', 'platform_support', 'tenant.enter'),  ('platform', 'platform_support', 'tenant.read'),
  ('platform', 'platform_operations', 'ops.manage'), ('platform', 'platform_operations', 'tenant.read'),
  ('platform', 'platform_instructor', 'tenant.enter'), ('platform', 'platform_instructor', 'tenant.read');

-- Tenant plane. Role sets reproduce the former helpers exactly:
--   org.admin          = is_tenant_admin
--   content.author     = is_tenant_content_editor
--   people.manage      = is_tenant_people_admin
--   certificate.issue  = can_issue_certificates
-- plus capabilities for UI hints and future command functions.
INSERT INTO public.role_capabilities (plane, role, capability)
SELECT 'tenant', r.role, c.capability
  FROM (VALUES
    ('org.admin',         ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin']),
    ('org.settings',      ARRAY['organization_owner','organization_admin']),
    ('audit.view',        ARRAY['organization_owner','organization_admin']),
    ('people.manage',     ARRAY['organization_owner','organization_admin','hotel_admin']),
    ('content.author',    ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','department_manager',
                                'training_manager','knowledge_manager','author','instructor']),
    ('content.publish',   ARRAY['organization_owner','organization_admin','training_manager','knowledge_manager']),
    ('assignment.manage', ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','department_manager','training_manager']),
    ('certificate.issue', ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','training_manager']),
    ('reports.view',      ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','department_manager',
                                'training_manager','knowledge_manager']),
    ('learning.take',     ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','department_manager',
                                'training_manager','knowledge_manager','author','instructor','learner']),
    ('knowledge.read',    ARRAY['organization_owner','organization_admin','brand_admin','hotel_admin','department_manager',
                                'training_manager','knowledge_manager','author','instructor','learner'])
  ) AS c(capability, roles)
  CROSS JOIN LATERAL unnest(c.roles) AS r(role);

-- ---------------------------------------------------------------------------
-- Predicates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.platform_operator_can(_permission text, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.platform_users pu
      JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id AND pra.revoked_at IS NULL
      JOIN public.role_capabilities rc ON rc.plane = 'platform' AND rc.role = pra.platform_role::text
     WHERE pu.user_id = _user_id AND pu.is_active
       AND (rc.capability = _permission OR rc.capability = '*')
  );
$function$;

CREATE OR REPLACE FUNCTION public.tenant_can(p_org_id uuid, p_capability text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p_org_id IS NOT NULL AND (
    public.platform_operator_has_role('system_owner')
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1
        FROM public.organization_memberships m
        JOIN public.role_capabilities rc
          ON rc.plane = 'tenant' AND rc.role = m.role::text AND (rc.capability = p_capability OR rc.capability = '*')
       WHERE m.user_id = auth.uid()
         AND m.organization_id = p_org_id
         AND m.is_active
         AND public.org_is_operational(m.organization_id)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_org_id IS NULL THEN public.platform_operator_has_role('system_owner')
              ELSE public.tenant_can(p_org_id, 'org.admin') END;
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_org_id IS NULL THEN public.platform_operator_has_role('system_owner')
              ELSE public.tenant_can(p_org_id, 'content.author') END;
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_people_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.platform_operator_can('tenant.manage')
      OR public.tenant_can(p_org_id, 'people.manage');
$function$;

CREATE OR REPLACE FUNCTION public.can_issue_certificates(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.tenant_can(p_org_id, 'certificate.issue');
$function$;

-- The caller's capabilities in an organization, for UI hints only (the
-- database enforces them regardless of what the UI shows).
CREATE OR REPLACE FUNCTION public.get_my_capabilities(p_org_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT rc.capability ORDER BY rc.capability), ARRAY[]::text[])
    FROM public.role_capabilities rc
   WHERE rc.plane = 'tenant' AND rc.capability <> '*'
     AND public.tenant_can(p_org_id, rc.capability);
$function$;

REVOKE ALL ON FUNCTION public.tenant_can(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_capabilities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_can(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_capabilities(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Platform-plane policies by capability
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_cap text;
  v_expr text;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd
      FROM pg_policies
     WHERE schemaname = 'public'
       AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       AND tablename IN ('subscriptions', 'subscription_plans', 'ai_agent_policies', 'ai_model_probes', 'ai_models',
                         'ai_platform_config', 'ai_providers', 'role_permissions', 'failed_login_attempts')
       AND coalesce(qual, '') || coalesce(with_check, '') ~ 'is_platform_super_admin'
  LOOP
    v_cap := CASE
      WHEN r.tablename IN ('subscriptions', 'subscription_plans') THEN 'billing.manage'
      WHEN r.tablename = 'failed_login_attempts' THEN 'ops.manage'
      ELSE 'config.manage'
    END;
    v_expr := format('public.platform_operator_can(%L)', v_cap);
    IF r.cmd = 'INSERT' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, r.tablename, v_expr);
    ELSIF r.cmd = 'DELETE' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, r.tablename, v_expr);
    ELSE
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', r.policyname, r.tablename, v_expr, v_expr);
    END IF;
  END LOOP;
END $$;

ALTER POLICY rate_limit_entries_admin_select ON public.rate_limit_entries
  USING (public.platform_operator_can('ops.manage'));
