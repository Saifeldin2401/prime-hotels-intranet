-- =============================================================================
-- Hardening: Compliance dashboard surfaces, PII audit RLS, and mutable functions
-- Description:
--   1. Removes temporary open-access PII policies that leaked into production.
--   2. Locks down compliance views/materialized views from the Data API.
--   3. Adds explicit search_path to mutable functions flagged by advisors.
--   4. Tightens direct PII log writes to privileged roles only.
--   5. Adds missing foreign key indexes for recent compliance/governance tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Lock down compliance dashboard relations from broad API access
-- -----------------------------------------------------------------------------
ALTER VIEW public.vw_compliance_alerts
  SET (security_invoker = true, security_barrier = true);

DO $$
DECLARE
  role_name text;
  relation_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['public', 'anon', 'authenticated', 'dashboard_user', 'cli_login_postgres']
  LOOP
    IF role_name = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH relation_name IN ARRAY ARRAY[
        'vw_compliance_alerts',
        'mv_compliance_daily_metrics',
        'mv_compliance_pii_patterns',
        'mv_compliance_user_activity'
      ]
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', relation_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON TABLE public.vw_compliance_alerts TO service_role;
GRANT SELECT ON TABLE public.mv_compliance_daily_metrics TO service_role;
GRANT SELECT ON TABLE public.mv_compliance_pii_patterns TO service_role;
GRANT SELECT ON TABLE public.mv_compliance_user_activity TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Remove temporary PII policies and narrow direct writes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS temp_allow_all_select ON public.pii_access_logs;
DROP POLICY IF EXISTS temp_allow_all_insert ON public.pii_access_logs;
DROP POLICY IF EXISTS temp_allow_all_update ON public.pii_access_logs;
DROP POLICY IF EXISTS temp_allow_all_delete ON public.pii_access_logs;

DROP POLICY IF EXISTS pii_access_logs_insert_policy ON public.pii_access_logs;
CREATE POLICY pii_access_logs_insert_policy
  ON public.pii_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = ANY (
          ARRAY[
            'corporate_admin'::public.app_role,
            'compliance_officer'::public.app_role,
            'regional_admin'::public.app_role,
            'regional_hr'::public.app_role
          ]
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Restrict PII logging RPCs to authenticated callers and fail fast on anon
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_target_user_id uuid,
  p_fields_accessed text[],
  p_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.pii_access_logs (
    accessed_by,
    user_id,
    pii_fields,
    justification,
    resource_type,
    resource_id,
    access_type
  )
  VALUES (
    auth.uid(),
    p_target_user_id,
    p_fields_accessed,
    p_reason,
    'profile',
    p_target_user_id,
    'read'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_user_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_access_type text,
  p_pii_fields text[],
  p_justification text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.pii_access_logs (
    accessed_by,
    user_id,
    resource_type,
    resource_id,
    access_type,
    pii_fields,
    justification,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_access_type,
    p_pii_fields,
    p_justification,
    NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text, uuid, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text[], text) FROM anon;
REVOKE ALL ON FUNCTION public.log_pii_access(uuid, text, uuid, text, text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_pii_access(uuid, text[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_pii_access(uuid, text, uuid, text, text[], text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Set explicit search_path on functions flagged by advisors
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_refresh_vacation_balance(p_user_id uuid, p_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pending decimal(5,2);
  v_used decimal(5,2);
BEGIN
  SELECT COALESCE(SUM(end_date - start_date + 1), 0)
  INTO v_pending
  FROM public.leave_requests
  WHERE requester_id = p_user_id
    AND type = 'annual'
    AND status IN ('pending', 'submitted', 'pending_supervisor_approval', 'pending_hr_review')
    AND is_deleted = false
    AND EXTRACT(YEAR FROM start_date) = p_year;

  SELECT COALESCE(SUM(end_date - start_date + 1), 0)
  INTO v_used
  FROM public.leave_requests
  WHERE requester_id = p_user_id
    AND type = 'annual'
    AND status IN ('approved', 'completed')
    AND is_deleted = false
    AND EXTRACT(YEAR FROM start_date) = p_year;

  INSERT INTO public.user_vacation_balance (user_id, year, pending_days, used_days)
  VALUES (p_user_id, p_year, v_pending, v_used)
  ON CONFLICT (user_id, year)
  DO UPDATE SET
    pending_days = EXCLUDED.pending_days,
    used_days = EXCLUDED.used_days,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_user_vacation_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.fn_refresh_vacation_balance(NEW.requester_id, EXTRACT(YEAR FROM NEW.start_date)::integer);

    IF TG_OP = 'UPDATE'
      AND (
        OLD.requester_id != NEW.requester_id
        OR EXTRACT(YEAR FROM OLD.start_date) != EXTRACT(YEAR FROM NEW.start_date)
      )
    THEN
      PERFORM public.fn_refresh_vacation_balance(OLD.requester_id, EXTRACT(YEAR FROM OLD.start_date)::integer);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.fn_refresh_vacation_balance(OLD.requester_id, EXTRACT(YEAR FROM OLD.start_date)::integer);
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_audit_exports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_dashboard_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Add missing foreign key indexes for recent compliance/governance tables
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_export_retention_policies_created_by
  ON public.audit_export_retention_policies(created_by);

CREATE INDEX IF NOT EXISTS idx_audit_export_templates_created_by
  ON public.audit_export_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_audit_exports_verified_by
  ON public.audit_exports(verified_by);

CREATE INDEX IF NOT EXISTS idx_audit_exports_last_downloaded_by
  ON public.audit_exports(last_downloaded_by);

CREATE INDEX IF NOT EXISTS idx_gov_authority_delegations_delegator_id
  ON public.gov_authority_delegations(delegator_id);

CREATE INDEX IF NOT EXISTS idx_gov_authority_delegations_delegate_id
  ON public.gov_authority_delegations(delegate_id);

CREATE INDEX IF NOT EXISTS idx_gov_authority_delegations_role_code
  ON public.gov_authority_delegations(governance_role_code);

CREATE INDEX IF NOT EXISTS idx_gov_authority_delegations_revoked_by
  ON public.gov_authority_delegations(revoked_by);
