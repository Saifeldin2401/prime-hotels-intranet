-- ============================================================================
-- Phase 1 — Platform Operator Identity Foundation
-- ============================================================================
-- Establishes ONE canonical platform-operator identity model, separate from
-- tenant roles, and consolidates the five conflicting "who is an operator"
-- predicates behind it. Idempotent + additive (a parallel Lovable builder is
-- active on this database).
--
-- Statement order: config -> enum -> tables -> indexes -> canonical helpers ->
-- legacy fallback + wrappers -> has_tenant_access -> RPC guards -> new-table RLS
-- -> platform_access_sessions lockdown -> 9-table split RLS ->
-- resolve_account_context() -> seed (LAST).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Single-row kill switch for the legacy operator grace period
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  legacy_role_fallback_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1. platform_role enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.platform_role AS ENUM (
    'system_owner','platform_admin','platform_training_manager',
    'platform_knowledge_manager','platform_support','platform_operations','platform_instructor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- NOTE: no ALTER TYPE ... ADD VALUE here — the enum is used (seed §13) in this
-- same transaction, and adding + using an enum value in one tx is unsafe. The
-- CREATE TYPE above is the single source of the value set.

-- ---------------------------------------------------------------------------
-- 2. Identity tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_users (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active       boolean NOT NULL DEFAULT true,
  employment_type text NOT NULL DEFAULT 'employee'
                    CHECK (employment_type IN ('employee','contractor','service_account')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id),
  deactivated_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.platform_role_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id  uuid NOT NULL REFERENCES public.platform_users(user_id) ON DELETE CASCADE,
  platform_role     public.platform_role NOT NULL,
  scope_type        text NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global','org_list')),
  scope_org_ids     uuid[] NOT NULL DEFAULT '{}',
  granted_by        uuid REFERENCES auth.users(id),
  granted_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  revoked_by        uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pra_active
  ON public.platform_role_assignments (platform_user_id, platform_role) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_pra_user_active
  ON public.platform_role_assignments (platform_user_id) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Canonical predicates (the single source of truth)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_operator(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_users pu
    WHERE pu.user_id = _user_id AND pu.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.platform_operator_has_role(_role text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_users pu
    JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id
    WHERE pu.user_id = _user_id
      AND pu.is_active
      AND pra.revoked_at IS NULL
      AND ( pra.platform_role::text = _role
            OR pra.platform_role = 'system_owner'
            OR (pra.platform_role = 'platform_admin' AND _role <> 'system_owner') )
  );
$$;

CREATE OR REPLACE FUNCTION public.platform_operator_can(_permission text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH caller AS (
    SELECT pra.platform_role::text AS role
    FROM public.platform_users pu
    JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id
    WHERE pu.user_id = _user_id AND pu.is_active AND pra.revoked_at IS NULL
  )
  SELECT EXISTS (
    SELECT 1 FROM caller c
    JOIN (VALUES
      ('system_owner','*'),
      ('platform_admin','operator.manage'),      ('platform_admin','tenant.manage'),
      ('platform_admin','billing.manage'),       ('platform_admin','master_content.manage'),
      ('platform_admin','ops.manage'),           ('platform_admin','config.manage'),
      ('platform_admin','tenant.enter'),         ('platform_admin','tenant.read'),
      ('platform_training_manager','master_content.manage'),
      ('platform_training_manager','tenant.enter'),  ('platform_training_manager','tenant.read'),
      ('platform_knowledge_manager','master_content.manage'),
      ('platform_knowledge_manager','tenant.enter'), ('platform_knowledge_manager','tenant.read'),
      ('platform_support','tenant.enter'),       ('platform_support','tenant.read'),
      ('platform_operations','ops.manage'),      ('platform_operations','tenant.read'),
      ('platform_instructor','tenant.enter'),    ('platform_instructor','tenant.read')
    ) AS perm(role, permission) ON perm.role = c.role
    WHERE perm.permission = _permission OR perm.permission = '*'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Legacy fallback + wrapper redefinitions (names preserved -> dependent
--    policies untouched). regional_admin is DROPPED from the operator set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._legacy_platform_fallback(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT legacy_role_fallback_enabled FROM public.platform_config WHERE id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = _user_id
         AND role IN ('super_admin','corporate_admin','administrator')
     );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_user(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_operator(target_user_id)
      OR public._legacy_platform_fallback(target_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_operator(auth.uid())
      OR public._legacy_platform_fallback(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.platform_operator_has_role('platform_admin', _user_id)
      OR ( (SELECT legacy_role_fallback_enabled FROM public.platform_config WHERE id)
           AND EXISTS (SELECT 1 FROM public.user_roles
                       WHERE user_id = _user_id AND role = 'administrator') );
$$;

-- ---------------------------------------------------------------------------
-- 5. Unify has_tenant_access — remove the unaudited is_platform_user() bypass
--    and the ended_at-ignoring get_operator_impersonated_org() term.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_tenant_access(record_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT record_org_id IS NOT NULL AND (
    record_org_id = ANY (public.current_user_organization_ids())
    OR public.has_active_platform_session(record_org_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Tighten the break-glass RPC guards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_platform_session(
  p_org_id uuid, p_reason text,
  p_acting_role text DEFAULT 'organization_admin'::text,
  p_ttl_minutes integer DEFAULT 60
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_session_id uuid;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.enter')) THEN
    RAISE EXCEPTION 'Only platform operators with tenant-entry permission may enter a tenant' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A substantive access reason (>= 10 chars) is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Unknown organization' USING ERRCODE = '23503';
  END IF;

  UPDATE public.platform_access_sessions
     SET is_active = false, ended_at = now()
   WHERE admin_user_id = auth.uid() AND is_active = true;

  INSERT INTO public.platform_access_sessions
    (admin_user_id, target_organization_id, acting_role, access_reason, is_active, started_at, expires_at)
  VALUES
    (auth.uid(), p_org_id, COALESCE(p_acting_role,'organization_admin'), btrim(p_reason), true, now(),
     now() + (LEAST(GREATEST(p_ttl_minutes,5), 480) || ' minutes')::interval)
  RETURNING id INTO v_session_id;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, session_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, v_session_id, 'enter_tenant', 'platform_access_session', v_session_id::text,
          jsonb_build_object('acting_role', p_acting_role, 'access_reason', btrim(p_reason)));

  RETURN v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.end_platform_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row public.platform_access_sessions;
BEGIN
  SELECT * INTO v_row FROM public.platform_access_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.admin_user_id <> auth.uid() AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Not your session' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_access_sessions SET is_active = false, ended_at = now() WHERE id = p_session_id;
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, session_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), v_row.target_organization_id, p_session_id, 'exit_tenant', 'platform_access_session', p_session_id::text,
          jsonb_build_object('duration_seconds', EXTRACT(EPOCH FROM (now() - v_row.started_at))::int));
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Grants for the new functions
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION
  public.is_platform_operator(uuid),
  public.platform_operator_has_role(text,uuid),
  public.platform_operator_can(text,uuid),
  public._legacy_platform_fallback(uuid)
FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.is_platform_operator(uuid),
  public.platform_operator_has_role(text,uuid),
  public.platform_operator_can(text,uuid)
TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS on the identity tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_users_sel   ON public.platform_users;
DROP POLICY IF EXISTS platform_users_write ON public.platform_users;
CREATE POLICY platform_users_sel ON public.platform_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_operator());
CREATE POLICY platform_users_write ON public.platform_users FOR ALL TO authenticated
  USING (public.platform_operator_has_role('platform_admin'))
  WITH CHECK (public.platform_operator_has_role('platform_admin'));

DROP POLICY IF EXISTS pra_sel   ON public.platform_role_assignments;
DROP POLICY IF EXISTS pra_write ON public.platform_role_assignments;
CREATE POLICY pra_sel ON public.platform_role_assignments FOR SELECT TO authenticated
  USING (platform_user_id = (SELECT auth.uid()) OR public.is_platform_operator());
CREATE POLICY pra_write ON public.platform_role_assignments FOR ALL TO authenticated
  USING (public.platform_operator_has_role('platform_admin'))
  WITH CHECK (public.platform_operator_has_role('platform_admin'));

DROP POLICY IF EXISTS platform_config_sel   ON public.platform_config;
DROP POLICY IF EXISTS platform_config_write ON public.platform_config;
CREATE POLICY platform_config_sel ON public.platform_config FOR SELECT TO authenticated
  USING (public.is_platform_operator());
CREATE POLICY platform_config_write ON public.platform_config FOR ALL TO authenticated
  USING (public.platform_operator_has_role('system_owner'))
  WITH CHECK (public.platform_operator_has_role('system_owner'));

REVOKE ALL ON public.platform_users, public.platform_role_assignments, public.platform_config FROM anon, public;
GRANT SELECT ON public.platform_users, public.platform_role_assignments, public.platform_config TO authenticated;
GRANT ALL ON public.platform_users, public.platform_role_assignments, public.platform_config TO service_role;

-- ---------------------------------------------------------------------------
-- 9. Lock down platform_access_sessions — mutation only via the RPCs
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.platform_access_sessions FROM authenticated, anon;

DROP POLICY IF EXISTS platform_access_sessions_ins ON public.platform_access_sessions;
DROP POLICY IF EXISTS platform_access_sessions_upd ON public.platform_access_sessions;
DROP POLICY IF EXISTS platform_access_sessions_del ON public.platform_access_sessions;
DROP POLICY IF EXISTS platform_access_sessions_sel ON public.platform_access_sessions;
CREATE POLICY platform_access_sessions_sel ON public.platform_access_sessions FOR SELECT TO authenticated
  USING (public.is_platform_operator() OR admin_user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 10. Split RLS on the 9 Lovable learning tables — SELECT (member/visible) vs
--     write (tenant content/people admin, or operator inside an audited session
--     via the is_tenant_* helpers which already fold in has_active_platform_session).
-- ---------------------------------------------------------------------------

-- competencies
DROP POLICY IF EXISTS competencies_tenant_isolation ON public.competencies;
DROP POLICY IF EXISTS competencies_sel   ON public.competencies;
DROP POLICY IF EXISTS competencies_write ON public.competencies;
CREATE POLICY competencies_sel ON public.competencies FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));
CREATE POLICY competencies_write ON public.competencies FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));

-- competency_levels (parent competencies.organization_id)
DROP POLICY IF EXISTS competency_levels_tenant_isolation ON public.competency_levels;
DROP POLICY IF EXISTS competency_levels_sel   ON public.competency_levels;
DROP POLICY IF EXISTS competency_levels_write ON public.competency_levels;
CREATE POLICY competency_levels_sel ON public.competency_levels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.competencies c
                 WHERE c.id = competency_levels.competency_id AND public.org_visible(c.organization_id)));
CREATE POLICY competency_levels_write ON public.competency_levels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.competencies c
                 WHERE c.id = competency_levels.competency_id
                   AND public.org_visible(c.organization_id)
                   AND public.is_tenant_content_editor(c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competencies c
                 WHERE c.id = competency_levels.competency_id
                   AND public.org_visible(c.organization_id)
                   AND public.is_tenant_content_editor(c.organization_id)));

-- course_competencies (parent courses.organization_id)
DROP POLICY IF EXISTS course_competencies_tenant_isolation ON public.course_competencies;
DROP POLICY IF EXISTS course_competencies_sel   ON public.course_competencies;
DROP POLICY IF EXISTS course_competencies_write ON public.course_competencies;
CREATE POLICY course_competencies_sel ON public.course_competencies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_competencies.course_id AND public.org_visible(c.organization_id)));
CREATE POLICY course_competencies_write ON public.course_competencies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_competencies.course_id
                   AND public.org_visible(c.organization_id)
                   AND public.is_tenant_content_editor(c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_competencies.course_id
                   AND public.org_visible(c.organization_id)
                   AND public.is_tenant_content_editor(c.organization_id)));

-- training_sessions
DROP POLICY IF EXISTS training_sessions_tenant_isolation ON public.training_sessions;
DROP POLICY IF EXISTS training_sessions_sel   ON public.training_sessions;
DROP POLICY IF EXISTS training_sessions_write ON public.training_sessions;
CREATE POLICY training_sessions_sel ON public.training_sessions FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));
CREATE POLICY training_sessions_write ON public.training_sessions FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));

-- practical_assessments
DROP POLICY IF EXISTS practical_assessments_tenant_isolation ON public.practical_assessments;
DROP POLICY IF EXISTS practical_assessments_sel   ON public.practical_assessments;
DROP POLICY IF EXISTS practical_assessments_write ON public.practical_assessments;
CREATE POLICY practical_assessments_sel ON public.practical_assessments FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));
CREATE POLICY practical_assessments_write ON public.practical_assessments FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));

-- user_competencies (people-domain; self-row read)
DROP POLICY IF EXISTS user_competencies_tenant_isolation ON public.user_competencies;
DROP POLICY IF EXISTS user_competencies_sel   ON public.user_competencies;
DROP POLICY IF EXISTS user_competencies_write ON public.user_competencies;
CREATE POLICY user_competencies_sel ON public.user_competencies FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id)));
CREATE POLICY user_competencies_write ON public.user_competencies FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));

-- employee_transfer_logs (people-domain; self-row read)
DROP POLICY IF EXISTS employee_transfer_logs_isolation ON public.employee_transfer_logs;
DROP POLICY IF EXISTS employee_transfer_logs_sel   ON public.employee_transfer_logs;
DROP POLICY IF EXISTS employee_transfer_logs_write ON public.employee_transfer_logs;
CREATE POLICY employee_transfer_logs_sel ON public.employee_transfer_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id)));
CREATE POLICY employee_transfer_logs_write ON public.employee_transfer_logs FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_people_admin(organization_id));

-- training_session_attendees (parent training_sessions.organization_id; self-row read)
DROP POLICY IF EXISTS training_session_attendees_isolation ON public.training_session_attendees;
DROP POLICY IF EXISTS training_session_attendees_sel   ON public.training_session_attendees;
DROP POLICY IF EXISTS training_session_attendees_write ON public.training_session_attendees;
CREATE POLICY training_session_attendees_sel ON public.training_session_attendees FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM public.training_sessions ts
                    WHERE ts.id = training_session_attendees.session_id
                      AND public.org_visible(ts.organization_id)
                      AND public.is_tenant_content_editor(ts.organization_id)));
CREATE POLICY training_session_attendees_write ON public.training_session_attendees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions ts
                 WHERE ts.id = training_session_attendees.session_id
                   AND public.org_visible(ts.organization_id)
                   AND public.is_tenant_people_admin(ts.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions ts
                 WHERE ts.id = training_session_attendees.session_id
                   AND public.org_visible(ts.organization_id)
                   AND public.is_tenant_people_admin(ts.organization_id)));

-- practical_submissions (parent practical_assessments.organization_id; learner self-submit)
DROP POLICY IF EXISTS practical_submissions_isolation ON public.practical_submissions;
DROP POLICY IF EXISTS practical_submissions_sel    ON public.practical_submissions;
DROP POLICY IF EXISTS practical_submissions_ins    ON public.practical_submissions;
DROP POLICY IF EXISTS practical_submissions_modify ON public.practical_submissions;
CREATE POLICY practical_submissions_sel ON public.practical_submissions FOR SELECT TO authenticated
  USING (learner_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM public.practical_assessments pa
                    WHERE pa.id = practical_submissions.assessment_id
                      AND public.org_visible(pa.organization_id)
                      AND public.is_tenant_content_editor(pa.organization_id)));
CREATE POLICY practical_submissions_ins ON public.practical_submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.practical_assessments pa
            WHERE pa.id = practical_submissions.assessment_id
              AND ( learner_id = (SELECT auth.uid())
                    OR (public.org_visible(pa.organization_id) AND public.is_tenant_content_editor(pa.organization_id)) )));
CREATE POLICY practical_submissions_modify ON public.practical_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.practical_assessments pa
                 WHERE pa.id = practical_submissions.assessment_id
                   AND public.org_visible(pa.organization_id)
                   AND public.is_tenant_content_editor(pa.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.practical_assessments pa
                 WHERE pa.id = practical_submissions.assessment_id
                   AND public.org_visible(pa.organization_id)
                   AND public.is_tenant_content_editor(pa.organization_id)));
CREATE POLICY practical_submissions_del ON public.practical_submissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.practical_assessments pa
                 WHERE pa.id = practical_submissions.assessment_id
                   AND public.org_visible(pa.organization_id)
                   AND public.is_tenant_content_editor(pa.organization_id)));

-- ---------------------------------------------------------------------------
-- 11. resolve_account_context() — one round trip for smart login/routing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_account_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_operator boolean;
  v_roles text[];
  v_perms text[];
  v_session jsonb;
  v_memberships jsonb;
  v_primary_org uuid;
  v_member_count int;
  v_dest text;
  v_top_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('is_platform_operator', false, 'recommended_destination', '/login');
  END IF;

  v_is_operator := public.is_platform_operator(v_uid);

  SELECT array_agg(DISTINCT pra.platform_role::text)
    INTO v_roles
  FROM public.platform_users pu
  JOIN public.platform_role_assignments pra ON pra.platform_user_id = pu.user_id
  WHERE pu.user_id = v_uid AND pu.is_active AND pra.revoked_at IS NULL;

  SELECT array_agg(p) INTO v_perms
  FROM (
    SELECT unnest(ARRAY[
      'operator.manage','tenant.manage','billing.manage','master_content.manage',
      'ops.manage','config.manage','tenant.enter','tenant.read'
    ]) AS p
  ) cand
  WHERE public.platform_operator_can(cand.p, v_uid);

  SELECT to_jsonb(s) INTO v_session
  FROM (
    SELECT pas.id, pas.target_organization_id, pas.acting_role, pas.access_reason,
           pas.started_at, pas.expires_at, o.name AS target_organization_name
    FROM public.platform_access_sessions pas
    JOIN public.organizations o ON o.id = pas.target_organization_id
    WHERE pas.admin_user_id = v_uid AND pas.is_active = true
      AND (pas.ended_at IS NULL OR pas.ended_at > now())
      AND pas.expires_at > now()
    ORDER BY pas.started_at DESC
    LIMIT 1
  ) s;

  SELECT jsonb_agg(jsonb_build_object(
           'organization_id', om.organization_id,
           'organization_name', o.name,
           'role', om.role::text,
           'brand_id', om.brand_id,
           'hotel_id', om.hotel_id,
           'hotel_name', h.name,
           'department_id', om.department_id,
           'department_name', d.name,
           'is_active', om.is_active
         ) ORDER BY om.is_primary DESC, o.name),
         count(*),
         (array_agg(om.organization_id ORDER BY om.is_primary DESC, o.name))[1]
    INTO v_memberships, v_member_count, v_primary_org
  FROM public.organization_memberships om
  JOIN public.organizations o ON o.id = om.organization_id
  LEFT JOIN public.hotels h ON h.id = om.hotel_id
  LEFT JOIN public.departments d ON d.id = om.department_id
  WHERE om.user_id = v_uid AND om.is_active = true;

  -- Highest-authority membership role for destination routing
  SELECT om.role::text INTO v_top_role
  FROM public.organization_memberships om
  WHERE om.user_id = v_uid AND om.is_active = true
  ORDER BY CASE om.role::text
    WHEN 'organization_owner' THEN 0 WHEN 'organization_admin' THEN 1
    WHEN 'brand_admin' THEN 2 WHEN 'hotel_admin' THEN 3
    WHEN 'department_manager' THEN 4 WHEN 'training_manager' THEN 5
    WHEN 'instructor' THEN 6 WHEN 'knowledge_manager' THEN 7
    WHEN 'author' THEN 8 ELSE 9 END
  LIMIT 1;

  IF v_is_operator THEN
    v_dest := '/platform';
  ELSIF v_top_role IN ('organization_owner','organization_admin','brand_admin','hotel_admin') THEN
    v_dest := '/admin';
  ELSIF v_top_role IN ('training_manager','instructor') THEN
    v_dest := '/training';
  ELSIF v_top_role IN ('knowledge_manager','author') THEN
    v_dest := '/knowledge';
  ELSE
    v_dest := '/home/learner';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_uid,
    'is_platform_operator', v_is_operator,
    'platform_roles', COALESCE(to_jsonb(v_roles), '[]'::jsonb),
    'platform_permissions', COALESCE(to_jsonb(v_perms), '[]'::jsonb),
    'active_platform_session', v_session,
    'tenant_memberships', COALESCE(v_memberships, '[]'::jsonb),
    'primary_organization_id', v_primary_org,
    'is_multi_org', COALESCE(v_member_count, 0) > 1,
    'recommended_destination', v_dest
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_account_context() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_account_context() TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. Operator role management RPCs (used by PlatformUserDirectory)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_platform_role(
  p_user_id uuid, p_role text, p_scope_type text DEFAULT 'global', p_scope_org_ids uuid[] DEFAULT '{}'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.platform_operator_has_role('platform_admin') THEN
    RAISE EXCEPTION 'Only platform admins may assign platform roles' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'system_owner' AND NOT public.platform_operator_has_role('system_owner') THEN
    RAISE EXCEPTION 'Only a system owner may grant system_owner' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.platform_users (user_id, created_by)
  VALUES (p_user_id, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET is_active = true, deactivated_at = NULL;

  UPDATE public.platform_role_assignments
     SET revoked_at = now(), revoked_by = auth.uid()
   WHERE platform_user_id = p_user_id AND platform_role = p_role::public.platform_role AND revoked_at IS NULL;

  INSERT INTO public.platform_role_assignments
    (platform_user_id, platform_role, scope_type, scope_org_ids, granted_by)
  VALUES (p_user_id, p_role::public.platform_role, p_scope_type, COALESCE(p_scope_org_ids,'{}'), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'assign_platform_role', 'platform_role_assignment', v_id::text,
          jsonb_build_object('target_user', p_user_id, 'role', p_role, 'scope_type', p_scope_type));
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_platform_role(p_user_id uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.platform_operator_has_role('platform_admin') THEN
    RAISE EXCEPTION 'Only platform admins may revoke platform roles' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_role_assignments
     SET revoked_at = now(), revoked_by = auth.uid()
   WHERE platform_user_id = p_user_id AND platform_role = p_role::public.platform_role AND revoked_at IS NULL;

  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'revoke_platform_role', 'platform_role_assignment', p_user_id::text,
          jsonb_build_object('target_user', p_user_id, 'role', p_role));
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_platform_user_active(p_user_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.platform_operator_has_role('platform_admin') THEN
    RAISE EXCEPTION 'Only platform admins may change operator status' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_users
     SET is_active = p_active,
         deactivated_at = CASE WHEN p_active THEN NULL ELSE now() END
   WHERE user_id = p_user_id;

  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'activate_platform_user' ELSE 'deactivate_platform_user' END,
          'platform_user', p_user_id::text, jsonb_build_object('target_user', p_user_id));
END;
$function$;

REVOKE ALL ON FUNCTION
  public.assign_platform_role(uuid,text,text,uuid[]),
  public.revoke_platform_role(uuid,text),
  public.set_platform_user_active(uuid,boolean)
FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.assign_platform_role(uuid,text,text,uuid[]),
  public.revoke_platform_role(uuid,text),
  public.set_platform_user_active(uuid,boolean)
TO authenticated;

-- ---------------------------------------------------------------------------
-- 13. Seed the current operator roster (LAST — predicates now resolve)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_users (user_id, employment_type, notes, created_by)
SELECT p.id, 'employee', 'Phase 1 backfill from user_roles', p.id
FROM public.profiles p
WHERE p.email IN (
  'islam.mahrous@gmail.com','admin@prime.com','hsmadi2223@gmail.com','yousef.buobaid@gmail.com'
)
ON CONFLICT (user_id) DO NOTHING;

WITH want(email, role) AS (VALUES
  ('islam.mahrous@gmail.com',  'system_owner'),
  ('admin@prime.com',          'platform_admin'),
  ('hsmadi2223@gmail.com',     'platform_support'),
  ('yousef.buobaid@gmail.com', 'platform_support')
)
INSERT INTO public.platform_role_assignments (platform_user_id, platform_role, scope_type, granted_by)
SELECT p.id, w.role::public.platform_role, 'global', p.id
FROM want w
JOIN public.profiles p ON p.email = w.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.platform_role_assignments x
  WHERE x.platform_user_id = p.id
    AND x.platform_role = w.role::public.platform_role
    AND x.revoked_at IS NULL
);
