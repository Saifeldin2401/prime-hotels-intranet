-- ============================================================================
-- Phase 2 — Feature flags / entitlements layer + real platform configuration
-- ============================================================================
-- * platform_feature_flags        — the catalogue of toggleable capabilities
-- * organization_feature_overrides — per-tenant on/off overrides
-- * feature_enabled(org,key)       — resolves override -> plan gate -> default
-- * platform_config gets real, server-enforced session parameters
-- * system_settings write access opened to platform operators (config.manage)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. platform_config: real session-governance parameters
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS default_session_ttl_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_session_ttl_minutes     integer NOT NULL DEFAULT 480,
  ADD COLUMN IF NOT EXISTS min_session_reason_length   integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS require_session_reason      boolean NOT NULL DEFAULT true;

-- start_platform_session now reads its guard-rails from platform_config
CREATE OR REPLACE FUNCTION public.start_platform_session(
  p_org_id uuid, p_reason text,
  p_acting_role text DEFAULT 'organization_admin'::text,
  p_ttl_minutes integer DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
  v_cfg public.platform_config;
  v_ttl integer;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.enter')) THEN
    RAISE EXCEPTION 'Only platform operators with tenant-entry permission may enter a tenant' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cfg FROM public.platform_config WHERE id;

  IF v_cfg.require_session_reason
     AND (p_reason IS NULL OR length(btrim(p_reason)) < COALESCE(v_cfg.min_session_reason_length, 10)) THEN
    RAISE EXCEPTION 'A substantive access reason (>= % chars) is required',
      COALESCE(v_cfg.min_session_reason_length, 10) USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Unknown organization' USING ERRCODE = '23503';
  END IF;

  v_ttl := LEAST(
    GREATEST(COALESCE(p_ttl_minutes, v_cfg.default_session_ttl_minutes, 30), 5),
    COALESCE(v_cfg.max_session_ttl_minutes, 480)
  );

  UPDATE public.platform_access_sessions
     SET is_active = false, ended_at = now()
   WHERE admin_user_id = auth.uid() AND is_active = true;

  INSERT INTO public.platform_access_sessions
    (admin_user_id, target_organization_id, acting_role, access_reason, is_active, started_at, expires_at)
  VALUES
    (auth.uid(), p_org_id, COALESCE(p_acting_role,'organization_admin'), btrim(COALESCE(p_reason,'')),
     true, now(), now() + (v_ttl || ' minutes')::interval)
  RETURNING id INTO v_session_id;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, session_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, v_session_id, 'enter_tenant', 'platform_access_session', v_session_id::text,
          jsonb_build_object('acting_role', p_acting_role, 'access_reason', btrim(COALESCE(p_reason,'')), 'ttl_minutes', v_ttl));

  RETURN v_session_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Feature flag catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  key             text PRIMARY KEY,
  label           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'general',
  default_enabled boolean NOT NULL DEFAULT true,
  -- minimum subscription plan code required for the feature to be available
  -- (NULL = available on every plan). Ordered starter < growth < enterprise.
  min_plan_code   text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.organization_feature_overrides (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key             text NOT NULL REFERENCES public.platform_feature_flags(key) ON DELETE CASCADE,
  enabled         boolean NOT NULL,
  note            text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id),
  PRIMARY KEY (organization_id, key)
);

ALTER TABLE public.platform_feature_flags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_feature_overrides  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pff_read  ON public.platform_feature_flags;
DROP POLICY IF EXISTS pff_write ON public.platform_feature_flags;
CREATE POLICY pff_read  ON public.platform_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY pff_write ON public.platform_feature_flags FOR ALL TO authenticated
  USING (public.is_platform_operator() AND public.platform_operator_can('config.manage'))
  WITH CHECK (public.is_platform_operator() AND public.platform_operator_can('config.manage'));

DROP POLICY IF EXISTS ofo_read  ON public.organization_feature_overrides;
DROP POLICY IF EXISTS ofo_write ON public.organization_feature_overrides;
CREATE POLICY ofo_read ON public.organization_feature_overrides FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));
CREATE POLICY ofo_write ON public.organization_feature_overrides FOR ALL TO authenticated
  USING (public.is_platform_operator() AND public.platform_operator_can('tenant.manage'))
  WITH CHECK (public.is_platform_operator() AND public.platform_operator_can('tenant.manage'));

REVOKE ALL ON public.platform_feature_flags, public.organization_feature_overrides FROM anon, public;
GRANT SELECT ON public.platform_feature_flags, public.organization_feature_overrides TO authenticated;
GRANT ALL ON public.platform_feature_flags, public.organization_feature_overrides TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Resolution function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._plan_rank(_code text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _code WHEN 'starter' THEN 1 WHEN 'growth' THEN 2 WHEN 'enterprise' THEN 3 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.feature_enabled(p_org_id uuid, p_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_flag public.platform_feature_flags;
  v_override boolean;
  v_plan_code text;
BEGIN
  SELECT * INTO v_flag FROM public.platform_feature_flags WHERE key = p_key;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Per-tenant override wins outright.
  SELECT enabled INTO v_override
  FROM public.organization_feature_overrides
  WHERE organization_id = p_org_id AND key = p_key;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  -- Plan gate: if the flag requires a minimum plan, the org's plan must meet it.
  IF v_flag.min_plan_code IS NOT NULL THEN
    SELECT sp.code INTO v_plan_code
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON sp.id = s.plan_id
    WHERE s.organization_id = p_org_id AND s.status = 'active'
    ORDER BY s.current_period_end DESC NULLS LAST
    LIMIT 1;
    IF public._plan_rank(COALESCE(v_plan_code, '')) < public._plan_rank(v_flag.min_plan_code) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN v_flag.default_enabled;
END;
$function$;

-- Convenience: the caller's current-context resolution for a key.
CREATE OR REPLACE FUNCTION public.my_feature_enabled(p_key text, p_org_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_org uuid;
BEGIN
  v_org := COALESCE(
    p_org_id,
    public.get_operator_impersonated_org(),
    (SELECT organization_id FROM public.organization_memberships
     WHERE user_id = auth.uid() AND is_active = true
     ORDER BY is_primary DESC LIMIT 1)
  );
  IF v_org IS NULL THEN RETURN false; END IF;
  RETURN public.feature_enabled(v_org, p_key);
END;
$function$;

-- Matrix for the platform settings screen: every flag x every org, effective state.
CREATE OR REPLACE FUNCTION public.get_platform_feature_matrix()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Platform operators only' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'flags', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.category, f.label) FROM public.platform_feature_flags f), '[]'::jsonb),
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'lifecycle_status', o.lifecycle_status,
        'features', (
          SELECT jsonb_object_agg(f2.key, jsonb_build_object(
            'effective', public.feature_enabled(o.id, f2.key),
            'override', (SELECT ofo.enabled FROM public.organization_feature_overrides ofo
                         WHERE ofo.organization_id = o.id AND ofo.key = f2.key)
          ))
          FROM public.platform_feature_flags f2
        )
      ) ORDER BY o.name)
      FROM public.organizations o WHERE o.is_deleted = false
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_feature_flag_default(p_key text, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('config.manage')) THEN
    RAISE EXCEPTION 'config.manage required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.platform_feature_flags
     SET default_enabled = p_enabled, updated_at = now(), updated_by = auth.uid()
   WHERE key = p_key;
  INSERT INTO public.platform_audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'set_feature_flag_default', 'feature_flag', p_key, jsonb_build_object('enabled', p_enabled));
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_org_feature_override(p_org_id uuid, p_key text, p_enabled boolean, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'tenant.manage required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organization_feature_overrides (organization_id, key, enabled, note, updated_by)
  VALUES (p_org_id, p_key, p_enabled, p_note, auth.uid())
  ON CONFLICT (organization_id, key)
  DO UPDATE SET enabled = EXCLUDED.enabled, note = EXCLUDED.note, updated_by = auth.uid(), updated_at = now();
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_org_feature_override', 'feature_flag', p_key, jsonb_build_object('enabled', p_enabled));
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_org_feature_override(p_org_id uuid, p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'tenant.manage required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.organization_feature_overrides WHERE organization_id = p_org_id AND key = p_key;
  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'clear_org_feature_override', 'feature_flag', p_key, '{}'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION
  public.feature_enabled(uuid,text), public.my_feature_enabled(text,uuid),
  public.get_platform_feature_matrix(), public.set_feature_flag_default(text,boolean),
  public.set_org_feature_override(uuid,text,boolean,text), public.clear_org_feature_override(uuid,text),
  public._plan_rank(text)
FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.feature_enabled(uuid,text), public.my_feature_enabled(text,uuid),
  public.get_platform_feature_matrix(), public.set_feature_flag_default(text,boolean),
  public.set_org_feature_override(uuid,text,boolean,text), public.clear_org_feature_override(uuid,text)
TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Seed the flag catalogue
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_feature_flags (key, label, description, category, default_enabled, min_plan_code) VALUES
  ('ai_course_generation',  'AI Course Generation',       'Generate full courses with the AI orchestrator',            'ai',          true,  NULL),
  ('ai_quiz_generation',    'AI Quiz Generation',         'Generate quizzes and question banks with AI',               'ai',          true,  NULL),
  ('advanced_assessments',  'Advanced Assessments',       'Practical / supervisor-observed assessments',               'assessment',  true,  'growth'),
  ('learning_paths',        'Learning Paths',             'Multi-course role-based learning journeys',                 'training',    true,  NULL),
  ('certifications',        'Certifications',             'Issue and verify completion certificates',                  'training',    true,  NULL),
  ('ilt_sessions',          'Instructor-Led Training',    'Schedule classroom / virtual sessions with attendance',     'training',    true,  'growth'),
  ('competency_framework',  'Competency Framework',       'Competency library, gap analysis, skill matrix',            'training',    true,  'growth'),
  ('knowledge_base',        'Knowledge Base',             'SOP / knowledge document library',                         'knowledge',   true,  NULL),
  ('custom_branding',       'Custom Branding',            'Per-tenant logo, colours, certificate seal',                'platform',    true,  'growth'),
  ('advanced_analytics',    'Advanced Analytics',         'Cross-hotel analytics and executive dashboards',            'analytics',   true,  'growth')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. system_settings — allow platform operators (config.manage) to write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can modify settings" ON public.system_settings;

CREATE POLICY "settings_insert_operators_and_admins" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_platform_operator() AND public.platform_operator_can('config.manage'))
    OR EXISTS (SELECT 1 FROM public.user_roles
               WHERE user_id = (SELECT auth.uid()) AND role IN ('corporate_admin','regional_admin'))
  );

CREATE POLICY "settings_update_operators_and_admins" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (
    (public.is_platform_operator() AND public.platform_operator_can('config.manage'))
    OR EXISTS (SELECT 1 FROM public.user_roles
               WHERE user_id = (SELECT auth.uid()) AND role IN ('corporate_admin','regional_admin'))
  );
