-- Governance Phase 2b (Control Audit + Frontend RPC Controls)
-- Safe additive extension for frontend-managed governance operations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gov_control_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (
    event_type IN (
      'role_assignment_created',
      'role_assignment_updated',
      'role_assignment_deleted',
      'feature_flag_changed',
      'delegation_updated',
      'delegation_deleted',
      'delegation_expired',
      'financial_action_recorded'
    )
  ),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scope_type text,
  scope_id uuid,
  entity_table text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  event_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'governance_engine'
);

CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_event_type
  ON public.gov_control_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_actor
  ON public.gov_control_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_subject_user
  ON public.gov_control_audit_log(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_scope
  ON public.gov_control_audit_log(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_entity
  ON public.gov_control_audit_log(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_control_audit_log_event_at
  ON public.gov_control_audit_log(event_at DESC);

CREATE OR REPLACE FUNCTION public.gov_assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.gov_is_governance_admin() THEN
    RAISE EXCEPTION 'governance_admin_required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_log_role_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gov_control_audit_log (
    event_type,
    severity,
    actor_id,
    subject_user_id,
    scope_type,
    scope_id,
    entity_table,
    entity_id,
    old_data,
    new_data
  )
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'role_assignment_created'
      WHEN 'UPDATE' THEN 'role_assignment_updated'
      ELSE 'role_assignment_deleted'
    END,
    CASE TG_OP
      WHEN 'DELETE' THEN 'warning'
      ELSE 'info'
    END,
    auth.uid(),
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.scope_type, OLD.scope_type),
    COALESCE(NEW.scope_id, OLD.scope_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_log_feature_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_enabled IS DISTINCT FROM OLD.is_enabled THEN
    INSERT INTO public.gov_control_audit_log (
      event_type,
      severity,
      actor_id,
      entity_table,
      entity_id,
      old_data,
      new_data
    )
    VALUES (
      'feature_flag_changed',
      'warning',
      auth.uid(),
      TG_TABLE_NAME,
      NULL,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_log_delegation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gov_control_audit_log (
    event_type,
    severity,
    actor_id,
    subject_user_id,
    scope_type,
    scope_id,
    entity_table,
    entity_id,
    old_data,
    new_data
  )
  VALUES (
    CASE TG_OP
      WHEN 'DELETE' THEN 'delegation_deleted'
      ELSE 'delegation_updated'
    END,
    CASE
      WHEN TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL) THEN 'warning'
      ELSE 'info'
    END,
    auth.uid(),
    COALESCE(NEW.delegate_id, OLD.delegate_id),
    COALESCE(NEW.scope_type, OLD.scope_type),
    COALESCE(NEW.scope_id, OLD.scope_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_log_financial_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gov_control_audit_log (
    event_type,
    severity,
    actor_id,
    scope_type,
    scope_id,
    entity_table,
    entity_id,
    new_data
  )
  VALUES (
    'financial_action_recorded',
    CASE WHEN NEW.was_override THEN 'critical' ELSE 'info' END,
    NEW.actor_id,
    CASE
      WHEN NEW.department_id IS NOT NULL THEN 'department'
      WHEN NEW.property_id IS NOT NULL THEN 'property'
      ELSE 'corporate'
    END,
    COALESCE(NEW.department_id, NEW.property_id, NULL),
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_gov_role_assignment_audit'
      AND tgrelid = 'public.gov_user_role_assignments'::regclass
  ) THEN
    CREATE TRIGGER trg_gov_role_assignment_audit
      AFTER INSERT OR UPDATE OR DELETE ON public.gov_user_role_assignments
      FOR EACH ROW EXECUTE FUNCTION public.gov_log_role_assignment_change();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_gov_feature_flag_audit'
      AND tgrelid = 'public.gov_feature_flags'::regclass
  ) THEN
    CREATE TRIGGER trg_gov_feature_flag_audit
      AFTER UPDATE ON public.gov_feature_flags
      FOR EACH ROW EXECUTE FUNCTION public.gov_log_feature_flag_change();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_gov_delegation_audit'
      AND tgrelid = 'public.gov_authority_delegations'::regclass
  ) THEN
    CREATE TRIGGER trg_gov_delegation_audit
      AFTER UPDATE OR DELETE ON public.gov_authority_delegations
      FOR EACH ROW EXECUTE FUNCTION public.gov_log_delegation_change();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_gov_financial_action_audit'
      AND tgrelid = 'public.gov_financial_actions_log'::regclass
  ) THEN
    CREATE TRIGGER trg_gov_financial_action_audit
      AFTER INSERT ON public.gov_financial_actions_log
      FOR EACH ROW EXECUTE FUNCTION public.gov_log_financial_action();
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.gov_expire_delegations(p_reference_time timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  PERFORM public.gov_assert_admin();

  WITH expired AS (
    UPDATE public.gov_authority_delegations d
    SET revoked_at = p_reference_time,
        revoked_by = auth.uid(),
        updated_at = now()
    WHERE d.revoked_at IS NULL
      AND d.ends_at <= p_reference_time
    RETURNING d.*
  )
  INSERT INTO public.gov_control_audit_log (
    event_type,
    severity,
    actor_id,
    subject_user_id,
    scope_type,
    scope_id,
    entity_table,
    entity_id,
    new_data
  )
  SELECT
    'delegation_expired',
    'warning',
    auth.uid(),
    e.delegate_id,
    e.scope_type,
    e.scope_id,
    'gov_authority_delegations',
    e.id,
    to_jsonb(e)
  FROM expired e;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_set_feature_flag(
  p_flag_key text,
  p_is_enabled boolean,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.gov_assert_admin();

  IF p_flag_key NOT IN (
    'governance_rbac_enabled',
    'governance_financial_controls_enabled',
    'governance_incident_engine_enabled',
    'governance_exec_dashboards_enabled'
  ) THEN
    RAISE EXCEPTION 'unsupported_flag_key';
  END IF;

  UPDATE public.gov_feature_flags
  SET is_enabled = p_is_enabled,
      updated_by = auth.uid(),
      updated_at = now(),
      description = COALESCE(description, '') || CASE WHEN p_reason IS NOT NULL THEN E'\nChange reason: ' || p_reason ELSE '' END
  WHERE flag_key = p_flag_key;

  RETURN EXISTS (
    SELECT 1
    FROM public.gov_feature_flags
    WHERE flag_key = p_flag_key
      AND is_enabled = p_is_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.gov_revoke_delegation(
  p_delegation_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.gov_assert_admin();

  UPDATE public.gov_authority_delegations
  SET revoked_at = now(),
      revoked_by = auth.uid(),
      updated_at = now()
  WHERE id = p_delegation_id
    AND revoked_at IS NULL;

  UPDATE public.gov_control_audit_log
  SET reason = COALESCE(reason, p_reason)
  WHERE entity_table = 'gov_authority_delegations'
    AND entity_id = p_delegation_id
    AND event_type IN ('delegation_updated', 'delegation_deleted')
    AND reason IS NULL;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE VIEW public.gov_v_active_delegations
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.delegator_id,
  d.delegate_id,
  d.governance_role_code,
  d.scope_type,
  d.scope_id,
  d.starts_at,
  d.ends_at,
  d.acting_assignment,
  d.emergency_delegation,
  d.max_financial_limit
FROM public.gov_authority_delegations d
WHERE d.revoked_at IS NULL
  AND now() BETWEEN d.starts_at AND d.ends_at;

CREATE OR REPLACE VIEW public.gov_v_separation_of_duties_conflicts
WITH (security_invoker = true) AS
WITH active_assignments AS (
  SELECT
    a.user_id,
    a.governance_role_code
  FROM public.gov_user_role_assignments a
  WHERE a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
)
SELECT
  aa.user_id,
  bool_or(aa.governance_role_code = 'owner_observer') AS has_owner_observer_role,
  bool_or(aa.governance_role_code <> 'owner_observer') AS has_operational_role
FROM active_assignments aa
GROUP BY aa.user_id
HAVING bool_or(aa.governance_role_code = 'owner_observer')
   AND bool_or(aa.governance_role_code <> 'owner_observer');

CREATE OR REPLACE VIEW public.gov_v_financial_override_events
WITH (security_invoker = true) AS
SELECT
  fal.id,
  fal.created_at,
  fal.action_type,
  fal.entity_type,
  fal.entity_id,
  fal.property_id,
  fal.department_id,
  fal.actor_id,
  fal.actor_role_code,
  fal.amount,
  fal.currency,
  fal.override_reason
FROM public.gov_financial_actions_log fal
WHERE fal.was_override = true;

ALTER TABLE public.gov_control_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gov_control_audit_log'
      AND policyname = 'gov_admin_manage'
  ) THEN
    CREATE POLICY gov_admin_manage
      ON public.gov_control_audit_log
      FOR ALL
      TO authenticated
      USING (public.gov_is_governance_admin())
      WITH CHECK (public.gov_is_governance_admin());
  END IF;
END
$$;

COMMIT;
