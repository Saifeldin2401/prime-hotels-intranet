-- One source of truth for roles: organization_memberships.
--
-- user_roles was a second, global (not tenant-scoped) role store that drifted from
-- memberships: 19 rows vs 8 memberships, legacy roles nobody holds any more, users
-- with admin rows but no active membership, and the UI unioned both. It becomes a
-- read-only VIEW derived from active memberships using the five-role model, so the
-- remaining readers (document visibility, has_role(), directory, UI) keep working
-- while every write goes through organization_memberships.
--
-- Mapping (membership_role -> app_role):
--   organization_owner / organization_admin / brand_admin -> administrator
--   hotel_admin / training_manager                        -> training_manager
--   knowledge_manager                                     -> knowledge_manager
--   department_manager / author / instructor              -> author
--   every active member                                   -> learner
-- Platform operators are identified by platform_users, not by a tenant role.

-- ---------------------------------------------------------------------------
-- 1. Keep the old rows for audit/rollback outside the API-exposed schema.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS archive.user_roles_20260924 AS TABLE public.user_roles;

-- ---------------------------------------------------------------------------
-- 2. Dead legacy functions (no app, edge-function, cron, trigger or policy use).
--    HR / PII / referral / request-workflow leftovers of the intranet era.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn regprocedure;
BEGIN
  FOR v_fn IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN (
         'request_apply_action', 'is_admin', 'is_hr', 'can_manage_assignments',
         'check_property_access', 'detect_pii_access_anomalies', 'get_pii_access_summary',
         'get_top_pii_accessors', 'get_security_summary', 'get_user_role',
         'handle_new_user_onboarding', 'handle_referral_history_and_notifications',
         'export_birthdays_for_month', 'get_todays_birthdays', 'find_documents',
         'fuzzy_search_documents', 'search_documents', 'search_sops',
         'secure_count_documents', 'run_model_verification')
  LOOP
    EXECUTE format('DROP FUNCTION %s', v_fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Platform AI configuration belongs to platform operators.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ai_model_probes_write_delete ON public.ai_model_probes;
DROP POLICY IF EXISTS ai_model_probes_write_insert ON public.ai_model_probes;
DROP POLICY IF EXISTS ai_model_probes_write_update ON public.ai_model_probes;
DROP POLICY IF EXISTS ai_platform_config_update ON public.ai_platform_config;
DROP POLICY IF EXISTS ai_providers_write_delete ON public.ai_providers;
DROP POLICY IF EXISTS ai_providers_write_insert ON public.ai_providers;
DROP POLICY IF EXISTS ai_providers_write_update ON public.ai_providers;

CREATE POLICY ai_model_probes_write_delete ON public.ai_model_probes FOR DELETE TO authenticated
  USING ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_model_probes_write_insert ON public.ai_model_probes FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_model_probes_write_update ON public.ai_model_probes FOR UPDATE TO authenticated
  USING ((SELECT public.is_platform_super_admin())) WITH CHECK ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_platform_config_update ON public.ai_platform_config FOR UPDATE TO authenticated
  USING ((SELECT public.is_platform_super_admin())) WITH CHECK ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_providers_write_delete ON public.ai_providers FOR DELETE TO authenticated
  USING ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_providers_write_insert ON public.ai_providers FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_platform_super_admin()));
CREATE POLICY ai_providers_write_update ON public.ai_providers FOR UPDATE TO authenticated
  USING ((SELECT public.is_platform_super_admin())) WITH CHECK ((SELECT public.is_platform_super_admin()));

CREATE OR REPLACE FUNCTION public.set_ai_provider_health(p_provider text, p_status text, p_cooldown_seconds integer DEFAULT NULL::integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ai_providers
     SET health_status = p_status,
         cooldown_until = CASE WHEN p_cooldown_seconds IS NULL THEN NULL
                               ELSE now() + make_interval(secs => p_cooldown_seconds) END,
         updated_at = now()
   WHERE id::text = p_provider OR name = p_provider;
END $function$;

-- ---------------------------------------------------------------------------
-- 4. Assignment scopes: memberships only (drop the global user_roles fallback).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_caller_assignment_scopes(p_org_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_platform boolean := false;
  v_effective_org_id uuid := p_org_id;
  v_user_memberships record;
  v_can_org boolean := false;
  v_can_brand boolean := false;
  v_can_hotel boolean := false;
  v_can_dept boolean := false;
  v_brand_ids uuid[] := '{}';
  v_hotel_ids uuid[] := '{}';
  v_dept_ids uuid[] := '{}';
  v_primary_role text := 'learner';
  v_primary_hotel_id uuid := NULL;
  v_primary_dept_id uuid := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthenticated');
  END IF;

  v_is_platform := public.is_platform_super_admin() OR public.is_platform_user(v_user_id);

  IF v_effective_org_id IS NULL THEN
    v_effective_org_id := public.get_operator_impersonated_org();
    IF v_effective_org_id IS NULL THEN
      SELECT organization_id INTO v_effective_org_id
        FROM public.organization_memberships
       WHERE user_id = v_user_id AND is_active = true
       ORDER BY is_primary DESC, created_at ASC
       LIMIT 1;
    END IF;
  END IF;

  IF v_is_platform THEN
    RETURN jsonb_build_object(
      'is_platform_admin', true,
      'effective_org_id', v_effective_org_id,
      'can_assign_org', true,
      'can_assign_brand', true,
      'can_assign_hotel', true,
      'can_assign_dept', true,
      'can_assign_role', true,
      'can_assign_individual', true,
      'authorized_brand_ids', NULL,
      'authorized_hotel_ids', NULL,
      'authorized_dept_ids', NULL,
      'primary_role', 'platform_admin'
    );
  END IF;

  FOR v_user_memberships IN
    SELECT role, brand_id, hotel_id, department_id, is_primary
      FROM public.organization_memberships
     WHERE user_id = v_user_id
       AND (organization_id = v_effective_org_id OR v_effective_org_id IS NULL)
       AND is_active = true
  LOOP
    IF v_user_memberships.role IN ('organization_owner', 'organization_admin', 'training_manager') AND v_user_memberships.hotel_id IS NULL THEN
      v_can_org := true;
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      v_primary_role := v_user_memberships.role::text;
    ELSIF v_user_memberships.role IN ('brand_admin') AND v_user_memberships.brand_id IS NOT NULL THEN
      v_can_brand := true;
      v_can_hotel := true;
      v_can_dept := true;
      IF NOT (v_user_memberships.brand_id = ANY(v_brand_ids)) THEN
        v_brand_ids := array_append(v_brand_ids, v_user_memberships.brand_id);
      END IF;
      v_primary_role := 'brand_admin';
    ELSIF v_user_memberships.role IN ('hotel_admin', 'training_manager', 'instructor') AND v_user_memberships.hotel_id IS NOT NULL THEN
      v_can_hotel := true;
      v_can_dept := true;
      IF NOT (v_user_memberships.hotel_id = ANY(v_hotel_ids)) THEN
        v_hotel_ids := array_append(v_hotel_ids, v_user_memberships.hotel_id);
      END IF;
      IF v_primary_hotel_id IS NULL THEN
        v_primary_hotel_id := v_user_memberships.hotel_id;
      END IF;
      v_primary_role := v_user_memberships.role::text;
    ELSIF v_user_memberships.role = 'department_manager' AND v_user_memberships.department_id IS NOT NULL THEN
      v_can_dept := true;
      IF NOT (v_user_memberships.department_id = ANY(v_dept_ids)) THEN
        v_dept_ids := array_append(v_dept_ids, v_user_memberships.department_id);
      END IF;
      IF v_primary_dept_id IS NULL THEN
        v_primary_dept_id := v_user_memberships.department_id;
      END IF;
      IF v_user_memberships.hotel_id IS NOT NULL AND NOT (v_user_memberships.hotel_id = ANY(v_hotel_ids)) THEN
        v_hotel_ids := array_append(v_hotel_ids, v_user_memberships.hotel_id);
      END IF;
      v_primary_role := 'department_manager';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'is_platform_admin', false,
    'effective_org_id', v_effective_org_id,
    'can_assign_org', v_can_org,
    'can_assign_brand', v_can_brand,
    'can_assign_hotel', v_can_hotel,
    'can_assign_dept', v_can_dept,
    'can_assign_role', (v_can_org OR v_can_brand OR v_can_hotel OR v_can_dept),
    'can_assign_individual', (v_can_org OR v_can_brand OR v_can_hotel OR v_can_dept),
    'authorized_brand_ids', CASE WHEN v_can_org THEN NULL ELSE v_brand_ids END,
    'authorized_hotel_ids', CASE WHEN v_can_org THEN NULL ELSE v_hotel_ids END,
    'authorized_dept_ids', CASE WHEN v_can_org THEN NULL ELSE v_dept_ids END,
    'primary_role', v_primary_role,
    'primary_hotel_id', v_primary_hotel_id,
    'primary_department_id', v_primary_dept_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Replace the table with a derived view.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_app_roles(p_role public.membership_role)
RETURNS public.app_role[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE p_role
    WHEN 'organization_owner' THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'organization_admin' THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'brand_admin'        THEN ARRAY['administrator', 'learner']::public.app_role[]
    WHEN 'hotel_admin'        THEN ARRAY['training_manager', 'learner']::public.app_role[]
    WHEN 'training_manager'   THEN ARRAY['training_manager', 'learner']::public.app_role[]
    WHEN 'knowledge_manager'  THEN ARRAY['knowledge_manager', 'learner']::public.app_role[]
    WHEN 'department_manager' THEN ARRAY['author', 'learner']::public.app_role[]
    WHEN 'author'             THEN ARRAY['author', 'learner']::public.app_role[]
    WHEN 'instructor'         THEN ARRAY['author', 'learner']::public.app_role[]
    ELSE ARRAY['learner']::public.app_role[]
  END;
$function$;

-- The table's triggers go with it: set-org (the view carries the membership org),
-- audit (membership changes are audited instead) and handle_new_user_training,
-- whose cross-tenant role-rule copy is superseded by trg_auto_assign_new_hire
-- on organization_memberships.
DROP TABLE public.user_roles;
DROP FUNCTION IF EXISTS public.handle_new_user_training();
DROP FUNCTION IF EXISTS public.get_user_role_priority(uuid);

CREATE VIEW public.user_roles
WITH (security_invoker = true) AS
SELECT DISTINCT ON (om.user_id, om.organization_id, r.role)
       (md5(om.user_id::text || om.organization_id::text || r.role::text))::uuid AS id,
       om.user_id,
       r.role,
       om.organization_id
  FROM public.organization_memberships om
  CROSS JOIN LATERAL unnest(public.membership_app_roles(om.role)) AS r(role)
 WHERE om.is_active
   AND public.org_is_operational(om.organization_id)
 ORDER BY om.user_id, om.organization_id, r.role;

COMMENT ON VIEW public.user_roles IS
  'Read-only projection of organization_memberships (five-role model). Change roles via organization_memberships.';

REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated, service_role;
