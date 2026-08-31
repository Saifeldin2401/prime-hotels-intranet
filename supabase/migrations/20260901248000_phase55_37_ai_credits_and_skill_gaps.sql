-- ============================================================================
-- §55 — per-tenant AI cost control (HARD enforcement, complements the
--        80/90/100% quota-warning notifications from 20260901243000)
-- §37/§38 — competency requirements + skills-gap engine
-- ============================================================================

-- ---- §55: AI job metering + enforcement -----------------------------------
ALTER TABLE public.course_generation_jobs
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tokens_used bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd numeric(10,4) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_cgj_org ON public.course_generation_jobs (organization_id);

CREATE OR REPLACE FUNCTION public._job_org(p_created_by uuid, p_org uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p_org,
    (SELECT organization_id FROM public.organization_memberships
     WHERE user_id = p_created_by AND is_active = true ORDER BY is_primary DESC LIMIT 1));
$$;

CREATE OR REPLACE FUNCTION public.check_ai_credit(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (max_ai_credits_monthly IS NULL OR max_ai_credits_monthly = 0)
         OR (COALESCE(ai_credits_used_this_month,0) < max_ai_credits_monthly)
     FROM public.organizations WHERE id = p_org_id), true);
$$;

CREATE OR REPLACE FUNCTION public.enforce_ai_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  IF public.is_platform_operator() THEN RETURN NEW; END IF;
  v_org := public._job_org(NEW.created_by, NEW.organization_id);
  NEW.organization_id := v_org;
  IF v_org IS NOT NULL AND NOT public.check_ai_credit(v_org) THEN
    RAISE EXCEPTION 'Monthly AI credit limit reached for this subscription plan (%). Contact your platform administrator.',
      (SELECT max_ai_credits_monthly FROM public.organizations WHERE id = v_org) USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ai_credit ON public.course_generation_jobs;
CREATE TRIGGER trg_enforce_ai_credit BEFORE INSERT ON public.course_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_credit();

CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_org_id uuid, p_credits integer DEFAULT 1, p_tokens bigint DEFAULT 0, p_cost numeric DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_org_id IS NULL THEN RETURN; END IF;
  UPDATE public.organizations
     SET ai_credits_used_this_month = COALESCE(ai_credits_used_this_month,0) + GREATEST(p_credits,0), updated_at = now()
   WHERE id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_ai_credits()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.organizations SET ai_credits_used_this_month = 0, updated_at = now()
  WHERE COALESCE(ai_credits_used_this_month,0) <> 0;
$$;

REVOKE ALL ON FUNCTION public.check_ai_credit(uuid), public.consume_ai_credit(uuid,integer,bigint,numeric),
  public.reset_monthly_ai_credits(), public._job_org(uuid,uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_ai_credit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(uuid,integer,bigint,numeric), public.reset_monthly_ai_credits() TO service_role;

-- NOTE: schedule reset_monthly_ai_credits() via pg_cron on the 1st of the month;
-- have the AI pipeline call consume_ai_credit(org, credits, tokens, cost) on job completion.

-- ---- §37/§38: competency requirements + skills-gap engine ------------------
CREATE TABLE IF NOT EXISTS public.role_competency_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  membership_role text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  required_level integer NOT NULL DEFAULT 3 CHECK (required_level BETWEEN 1 AND 5),
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, membership_role, department_id, competency_id)
);
CREATE INDEX IF NOT EXISTS idx_rcr_org ON public.role_competency_requirements (organization_id);
CREATE INDEX IF NOT EXISTS idx_rcr_comp ON public.role_competency_requirements (competency_id);

ALTER TABLE public.role_competency_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rcr_sel ON public.role_competency_requirements;
DROP POLICY IF EXISTS rcr_write ON public.role_competency_requirements;
CREATE POLICY rcr_sel ON public.role_competency_requirements FOR SELECT TO authenticated
  USING (public.org_visible(organization_id));
CREATE POLICY rcr_write ON public.role_competency_requirements FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_content_editor(organization_id));
REVOKE ALL ON public.role_competency_requirements FROM anon, public;
GRANT SELECT ON public.role_competency_requirements TO authenticated;
GRANT ALL ON public.role_competency_requirements TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_skill_gaps(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v jsonb;
BEGIN
  IF p_user_id <> auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.organization_memberships me
       JOIN public.organization_memberships them ON them.organization_id = me.organization_id
       WHERE me.user_id = auth.uid() AND them.user_id = p_user_id AND me.is_active
         AND public.is_tenant_content_editor(me.organization_id))
     AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Not authorized to view this learner''s skill profile' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_agg(g ORDER BY (g->>'gap')::int DESC) INTO v FROM (
    SELECT jsonb_build_object(
      'competency_id', c.id, 'competency', c.name, 'category', c.category, 'organization_id', c.organization_id,
      'required_level', r.required_level, 'current_level', COALESCE(uc.current_level, 0),
      'gap', GREATEST(r.required_level - COALESCE(uc.current_level, 0), 0), 'is_mandatory', r.is_mandatory,
      'recommended_courses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('course_id', co.id, 'title', co.title, 'target_level', cc.target_level)), '[]'::jsonb)
        FROM public.course_competencies cc
        JOIN public.courses co ON co.id = cc.course_id AND co.is_deleted = false
        WHERE cc.competency_id = c.id AND public.org_visible(co.organization_id))
    ) AS g
    FROM public.organization_memberships m
    JOIN public.role_competency_requirements r ON r.organization_id = m.organization_id
      AND r.membership_role = m.role::text AND (r.department_id IS NULL OR r.department_id = m.department_id)
    JOIN public.competencies c ON c.id = r.competency_id AND c.is_active
    LEFT JOIN public.user_competencies uc ON uc.competency_id = c.id AND uc.user_id = p_user_id
    WHERE m.user_id = p_user_id AND m.is_active = true
  ) sub;
  RETURN COALESCE(v, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_department_skill_matrix(p_department_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_org uuid; v jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.departments WHERE id = p_department_id;
  IF v_org IS NULL OR NOT (public.org_visible(v_org) AND public.is_tenant_content_editor(v_org)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'department_id', p_department_id,
    'competencies', COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'required_level', r.required_level))
      FROM public.role_competency_requirements r JOIN public.competencies c ON c.id = r.competency_id
      WHERE r.organization_id = v_org AND (r.department_id = p_department_id OR r.department_id IS NULL)), '[]'::jsonb),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', p.full_name, 'role', m.role::text,
        'levels', (SELECT COALESCE(jsonb_object_agg(uc.competency_id, uc.current_level), '{}'::jsonb)
                   FROM public.user_competencies uc WHERE uc.user_id = m.user_id)))
      FROM public.organization_memberships m JOIN public.profiles p ON p.id = m.user_id
      WHERE m.department_id = p_department_id AND m.is_active = true), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_skill_gaps(uuid), public.get_department_skill_matrix(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_skill_gaps(uuid), public.get_department_skill_matrix(uuid) TO authenticated;
