-- Global data retention automation for core operational logs
-- Covers notifications, audit logs, and PII access logs with configurable policy days.

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name text NOT NULL UNIQUE CHECK (
    entity_name IN ('notifications', 'audit_logs', 'pii_access_logs')
  ),
  retention_days integer NOT NULL CHECK (retention_days > 0),
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_enabled
  ON public.data_retention_policies(enabled);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retention_policies_select_admin_hr_compliance" ON public.data_retention_policies;
CREATE POLICY "retention_policies_select_admin_hr_compliance"
ON public.data_retention_policies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'corporate_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
  OR public.has_role(auth.uid(), 'compliance_officer'::public.app_role)
);

DROP POLICY IF EXISTS "retention_policies_manage_corporate_admin" ON public.data_retention_policies;
CREATE POLICY "retention_policies_manage_corporate_admin"
ON public.data_retention_policies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'corporate_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'corporate_admin'::public.app_role));

INSERT INTO public.data_retention_policies (entity_name, retention_days, enabled)
VALUES
  ('notifications', 90, true),
  ('audit_logs', 2555, true),      -- ~7 years
  ('pii_access_logs', 1095, true)  -- ~3 years
ON CONFLICT (entity_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_data_retention_policies()
RETURNS TABLE(entity_name text, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_row record;
  deleted_rows bigint;
BEGIN
  FOR policy_row IN
    SELECT entity_name, retention_days
    FROM public.data_retention_policies
    WHERE enabled = true
  LOOP
    deleted_rows := 0;

    IF policy_row.entity_name = 'notifications' THEN
      WITH deleted AS (
        DELETE FROM public.notifications
        WHERE created_at < now() - make_interval(days => policy_row.retention_days)
        RETURNING 1
      )
      SELECT COUNT(*) INTO deleted_rows FROM deleted;

    ELSIF policy_row.entity_name = 'audit_logs' THEN
      WITH deleted AS (
        DELETE FROM public.audit_logs
        WHERE created_at < now() - make_interval(days => policy_row.retention_days)
        RETURNING 1
      )
      SELECT COUNT(*) INTO deleted_rows FROM deleted;

    ELSIF policy_row.entity_name = 'pii_access_logs' THEN
      WITH deleted AS (
        DELETE FROM public.pii_access_logs
        WHERE created_at < now() - make_interval(days => policy_row.retention_days)
        RETURNING 1
      )
      SELECT COUNT(*) INTO deleted_rows FROM deleted;
    END IF;

    RETURN QUERY SELECT policy_row.entity_name::text, COALESCE(deleted_rows, 0)::bigint;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.apply_data_retention_policies IS
  'Applies configured retention windows for notifications, audit logs, and PII access logs.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-data-retention-policies') THEN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'apply-data-retention-policies';
    END IF;

    PERFORM cron.schedule(
      'apply-data-retention-policies',
      '15 2 * * *',
      $cron$SELECT public.apply_data_retention_policies();$cron$
    );
  END IF;
END $$;
