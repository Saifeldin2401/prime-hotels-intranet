
-- ============================================================================
-- §70 / §72 — data retention policy + scheduled lifecycle jobs.
--   * data_retention_policies: configurable windows per data class
--   * organizations.archived_at / purge_scheduled_at
--   * set_organization_status('archived') schedules a purge after the window
--   * purge_archived_organizations(): the ONE sanctioned hard-delete path (§70)
--   * cleanup_transient_records(): drops the platform_events outbox + resolved
--     webhook_deliveries past their window (audit logs are NOT touched here)
--   * cron: monthly AI-credit reset, nightly purge check, nightly cleanup
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_class text NOT NULL UNIQUE,          -- 'archived_org' | 'platform_events' | 'webhook_deliveries' | 'training_records' | 'audit_logs'
  retention_days integer NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.data_retention_policies (data_class, retention_days, description) VALUES
  ('archived_org',        90,   'Days a cancelled/archived organization is retained before hard purge'),
  ('platform_events',     90,   'Event outbox rows (transient integration events)'),
  ('webhook_deliveries',  30,   'Delivered/abandoned webhook delivery records'),
  ('training_records',    2555, 'Training progress / certificates / assessments (~7y for compliance)'),
  ('audit_logs',          2555, 'platform_audit_logs + system_events (~7y)')
ON CONFLICT (data_class) DO NOTHING;

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drp_sel   ON public.data_retention_policies;
DROP POLICY IF EXISTS drp_write ON public.data_retention_policies;
CREATE POLICY drp_sel ON public.data_retention_policies FOR SELECT TO authenticated USING (public.is_platform_operator());
CREATE POLICY drp_write ON public.data_retention_policies FOR ALL TO authenticated
  USING (public.platform_operator_has_role('system_owner')) WITH CHECK (public.platform_operator_has_role('system_owner'));
REVOKE ALL ON public.data_retention_policies FROM anon, public;
GRANT SELECT ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS purge_scheduled_at timestamptz;

-- set_organization_status: schedule / cancel a purge on archive transitions
CREATE OR REPLACE FUNCTION public.set_organization_status(p_org_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_old text; v_window int;
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

  SELECT retention_days INTO v_window FROM public.data_retention_policies WHERE data_class = 'archived_org' AND is_active;

  UPDATE public.organizations SET
    lifecycle_status  = p_status::public.tenant_lifecycle_status,
    is_active         = (p_status NOT IN ('suspended','archived')),
    suspension_reason = CASE WHEN p_status IN ('suspended','archived') THEN btrim(p_reason) ELSE NULL END,
    archived_at        = CASE WHEN p_status = 'archived' THEN now() ELSE NULL END,
    purge_scheduled_at = CASE WHEN p_status = 'archived' THEN now() + (COALESCE(v_window,90) || ' days')::interval ELSE NULL END,
    updated_at = now()
  WHERE id = p_org_id;

  INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_org_id, 'set_organization_status', 'organization', p_org_id::text,
          jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason,
            'purge_scheduled_at', CASE WHEN p_status = 'archived' THEN (now() + (COALESCE(v_window,90) || ' days')::interval) END));
END;
$function$;

-- §70: the single sanctioned hard-delete path — archived orgs past their purge date.
CREATE OR REPLACE FUNCTION public.purge_archived_organizations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, name FROM public.organizations
    WHERE lifecycle_status = 'archived'
      AND purge_scheduled_at IS NOT NULL
      AND purge_scheduled_at < now()
  LOOP
    -- final audit BEFORE the delete (platform_audit_logs is retained ~7y, no target FK cascade)
    INSERT INTO public.platform_audit_logs (actor_id, target_organization_id, action, resource_type, resource_id, metadata)
    VALUES (NULL, NULL, 'purge_organization', 'organization', r.id::text,
            jsonb_build_object('name', r.name, 'purged_at', now()));
    DELETE FROM public.organizations WHERE id = r.id;   -- ON DELETE CASCADE fans out to tenant data
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

-- transient cleanup — NEVER touches training records or audit logs
CREATE OR REPLACE FUNCTION public.cleanup_transient_records()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_ev int; v_wh int; v_pe_days int; v_wh_days int;
BEGIN
  SELECT retention_days INTO v_pe_days FROM public.data_retention_policies WHERE data_class = 'platform_events' AND is_active;
  SELECT retention_days INTO v_wh_days FROM public.data_retention_policies WHERE data_class = 'webhook_deliveries' AND is_active;
  DELETE FROM public.platform_events WHERE created_at < now() - (COALESCE(v_pe_days,90) || ' days')::interval;
  GET DIAGNOSTICS v_ev = ROW_COUNT;
  DELETE FROM public.webhook_deliveries
   WHERE status IN ('delivered','abandoned') AND created_at < now() - (COALESCE(v_wh_days,30) || ' days')::interval;
  GET DIAGNOSTICS v_wh = ROW_COUNT;
  RETURN jsonb_build_object('platform_events_deleted', v_ev, 'webhook_deliveries_deleted', v_wh);
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_archived_organizations(), public.cleanup_transient_records() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_archived_organizations(), public.cleanup_transient_records() TO service_role;

-- ---- schedule ----
SELECT cron.schedule('reset-monthly-ai-credits', '5 0 1 * *', $$SELECT public.reset_monthly_ai_credits();$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-monthly-ai-credits');
SELECT cron.schedule('purge-archived-organizations', '30 2 * * *', $$SELECT public.purge_archived_organizations();$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-archived-organizations');
SELECT cron.schedule('cleanup-transient-records', '45 2 * * *', $$SELECT public.cleanup_transient_records();$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-transient-records');
SELECT cron.schedule('evaluate-org-quotas-daily', '0 7 * * *',
  $$SELECT public.evaluate_organization_quotas(id) FROM public.organizations WHERE is_deleted = false AND lifecycle_status NOT IN ('archived','suspended');$$)
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-org-quotas-daily');
