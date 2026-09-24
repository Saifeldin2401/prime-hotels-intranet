-- ============================================================================
-- Phase 3 + 4 — Organization lifecycle that changes behaviour, entitlement
-- resolution, org-profile + org-structure RPCs, tenant user management.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. org_is_operational — suspended / archived orgs stop working for tenant users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.org_is_operational(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT lifecycle_status NOT IN ('suspended','archived') AND is_deleted = false
     FROM public.organizations WHERE id = p_org_id),
    false
  );
$$;

-- org_visible: a tenant member only sees an org while it is operational; a
-- platform operator (super-admin predicate) or an audited session always can.
CREATE OR REPLACE FUNCTION public.org_visible(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR (p_org_id = ANY (public.current_user_organization_ids())
        AND public.org_is_operational(p_org_id));
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(record_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT record_org_id IS NOT NULL AND (
    public.has_active_platform_session(record_org_id)
    OR (record_org_id = ANY (public.current_user_organization_ids())
        AND public.org_is_operational(record_org_id))
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Lifecycle state machine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_organization_status(p_org_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_old text;
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage')) THEN
    RAISE EXCEPTION 'tenant.manage permission required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('prospect','trial','onboarding','active','suspended','renewal','archived') THEN
    RAISE EXCEPTION 'Invalid lifecycle status: %', p_status USING ERRCODE = '22023';
  END IF;
  IF p_status IN ('suspended','archived') AND (p_reason IS NULL OR length(btrim(p_reason)) < 5) THEN
    RAISE EXCEPTION 'A reason is required to suspend or archive an organization' USING ERRCODE = '22023';
  END IF;

  SELECT lifecycle_status::text INTO v_old FROM public.organizations WHERE id = p_org_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Unknown organization' USING ERRCODE = '23503'; END IF;

  UPDATE public.organizations SET
    lifecycle_status = p_status::public.tenant_lifecycle_status,
    is_active        = (p_status NOT IN ('suspended','archived')),
    suspension_reason = CASE WHEN p_status IN ('suspended','archived') THEN btrim(p_reason) ELSE NULL END,
    updated_at = now()
  WHERE id = p_org_id;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_organization_status', 'organization', p_org_id::text,
          jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason));
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Entitlement resolution (single source: subscription plan, org overrides)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_entitlements(p_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_org public.organizations;
  v_plan public.subscription_plans;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  SELECT sp.* INTO v_plan
  FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = p_org_id AND s.status = 'active'
  ORDER BY s.current_period_end DESC NULLS LAST LIMIT 1;

  RETURN jsonb_build_object(
    'plan',          COALESCE(v_plan.name, 'None'),
    'plan_code',     v_plan.code,
    -- org-level column overrides the plan where present
    'max_hotels',    COALESCE(v_org.max_hotels,   v_plan.max_hotels,   10),
    'max_learners',  COALESCE(v_org.max_learners, v_plan.max_users,    100),
    'max_storage_gb',COALESCE(v_org.max_storage_gb, v_plan.max_storage_gb, 50),
    'ai_credits_monthly', COALESCE(v_org.max_ai_credits_monthly, 0),
    'ai_credits_used',    COALESCE(v_org.ai_credits_used_this_month, 0),
    'plan_features', COALESCE(v_plan.features, '{}'::jsonb),
    'usage', jsonb_build_object(
      'hotels',   (SELECT count(*) FROM public.hotels WHERE organization_id = p_org_id AND is_deleted = false),
      'learners', (SELECT count(*) FROM public.organization_memberships WHERE organization_id = p_org_id AND is_active = true)
    )
  );
END;
$function$;

-- Enforcement helper — call before provisioning a hotel / inviting a user.
CREATE OR REPLACE FUNCTION public.check_entitlement(p_org_id uuid, p_resource text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v jsonb;
BEGIN
  v := public.effective_entitlements(p_org_id);
  RETURN CASE p_resource
    WHEN 'hotel'   THEN (v->'usage'->>'hotels')::int   < (v->>'max_hotels')::int
    WHEN 'learner' THEN (v->'usage'->>'learners')::int < (v->>'max_learners')::int
    ELSE true
  END;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Organization profile + structure RPCs (platform + tenant admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_organization_profile(p_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT (public.org_visible(p_org_id) OR public.is_platform_operator()) THEN
    RAISE EXCEPTION 'Not authorized for this organization' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'organization', (SELECT to_jsonb(o) FROM public.organizations o WHERE o.id = p_org_id),
    'entitlements', public.effective_entitlements(p_org_id),
    'counts', jsonb_build_object(
      'brands',      (SELECT count(*) FROM public.brands WHERE organization_id = p_org_id AND is_deleted = false),
      'hotels',      (SELECT count(*) FROM public.hotels WHERE organization_id = p_org_id AND is_deleted = false),
      'departments', (SELECT count(*) FROM public.departments WHERE organization_id = p_org_id AND is_active = true),
      'members',     (SELECT count(*) FROM public.organization_memberships WHERE organization_id = p_org_id AND is_active = true),
      'courses',     (SELECT count(*) FROM public.courses WHERE organization_id = p_org_id AND is_deleted = false),
      'documents',   (SELECT count(*) FROM public.documents WHERE organization_id = p_org_id AND is_deleted = false)
    ),
    'primary_contacts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', om.user_id, 'name', p.full_name, 'email', p.email, 'role', om.role::text)), '[]'::jsonb)
      FROM public.organization_memberships om JOIN public.profiles p ON p.id = om.user_id
      WHERE om.organization_id = p_org_id AND om.is_active = true
        AND om.role IN ('organization_owner','organization_admin')
    ),
    'lifecycle_history', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('action', action, 'metadata', metadata, 'at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
      FROM public.platform_audit_logs
      WHERE target_organization_id = p_org_id AND action = 'set_organization_status'
    )
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_structure(p_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT (public.org_visible(p_org_id) OR public.is_platform_operator()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'organization', (SELECT jsonb_build_object('id', o.id, 'name', o.name, 'lifecycle_status', o.lifecycle_status) FROM public.organizations o WHERE o.id = p_org_id),
    'brands', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) ORDER BY b.name)
                        FROM public.brands b WHERE b.organization_id = p_org_id AND b.is_deleted = false), '[]'::jsonb),
    'hotels', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                          'id', h.id, 'name', h.name, 'brand_id', h.brand_id, 'city', h.city,
                          'departments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.name), '[]'::jsonb)
                                          FROM public.departments d WHERE d.hotel_id = h.id AND d.is_active = true),
                          'member_count', (SELECT count(*) FROM public.organization_memberships om WHERE om.hotel_id = h.id AND om.is_active = true)
                        ) ORDER BY h.name)
                        FROM public.hotels h WHERE h.organization_id = p_org_id AND h.is_deleted = false), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Platform-side tenant user management (audited, non-destructive)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.platform_set_membership(
  p_org_id uuid, p_user_id uuid, p_role text,
  p_hotel_id uuid DEFAULT NULL, p_department_id uuid DEFAULT NULL, p_active boolean DEFAULT true
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('tenant.manage'))
     AND NOT public.is_tenant_people_admin(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to manage members of this organization' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('organization_owner','organization_admin','brand_admin','hotel_admin',
                    'department_manager','training_manager','knowledge_manager','author','instructor','learner') THEN
    RAISE EXCEPTION 'Invalid membership role' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'organization_owner' AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Only a platform operator may set organization_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_memberships SET
    role = p_role::public.membership_role, hotel_id = p_hotel_id,
    department_id = p_department_id, is_active = p_active, updated_at = now()
  WHERE organization_id = p_org_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role, hotel_id, department_id, is_active)
    VALUES (p_org_id, p_user_id, p_role::public.membership_role, p_hotel_id, p_department_id, p_active);
  END IF;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_membership', 'organization_membership', p_user_id::text,
          jsonb_build_object('role', p_role, 'hotel_id', p_hotel_id, 'department_id', p_department_id, 'is_active', p_active));
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION
  public.org_is_operational(uuid), public.set_organization_status(uuid,text,text),
  public.effective_entitlements(uuid), public.check_entitlement(uuid,text),
  public.get_organization_profile(uuid), public.get_org_structure(uuid),
  public.platform_set_membership(uuid,uuid,text,uuid,uuid,boolean)
FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.set_organization_status(uuid,text,text),
  public.effective_entitlements(uuid), public.check_entitlement(uuid,text),
  public.get_organization_profile(uuid), public.get_org_structure(uuid),
  public.platform_set_membership(uuid,uuid,text,uuid,uuid,boolean)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_operational(uuid) TO authenticated;
