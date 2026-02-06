-- Reports, Audits, and Operations Automation
-- Date: 2026-02-06

BEGIN;

-- Extend report/audit scheduling
ALTER TABLE public.report_definitions
  ADD COLUMN IF NOT EXISTS schedule_frequency text CHECK (schedule_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

ALTER TABLE public.audit_templates
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

-- Next run helper
CREATE OR REPLACE FUNCTION public.next_run_from_frequency(freq text, from_time timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE freq
    WHEN 'hourly' THEN from_time + interval '1 hour'
    WHEN 'daily' THEN from_time + interval '1 day'
    WHEN 'weekly' THEN from_time + interval '7 days'
    WHEN 'monthly' THEN from_time + interval '1 month'
    ELSE from_time + interval '1 day'
  END;
$$;

-- Enqueue report runs for due schedules
CREATE OR REPLACE FUNCTION public.enqueue_due_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  r record;
  cnt int := 0;
BEGIN
  UPDATE public.report_definitions
    SET next_run_at = now()
  WHERE is_active = true
    AND schedule_frequency IS NOT NULL
    AND next_run_at IS NULL;

  FOR r IN
    SELECT * FROM public.report_definitions
    WHERE is_active = true
      AND schedule_frequency IS NOT NULL
      AND next_run_at <= now()
  LOOP
    INSERT INTO public.report_runs (report_id, status, started_at, triggered_by)
    VALUES (r.id, 'queued', now(), r.created_by);

    UPDATE public.report_definitions
      SET last_run_at = now(),
          next_run_at = public.next_run_from_frequency(r.schedule_frequency, now())
      WHERE id = r.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN cnt;
END;
$$;

-- Enqueue audit runs for due schedules
CREATE OR REPLACE FUNCTION public.enqueue_due_audits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  r record;
  cnt int := 0;
BEGIN
  UPDATE public.audit_templates
    SET next_run_at = now()
  WHERE is_active = true
    AND frequency IS NOT NULL
    AND next_run_at IS NULL;

  FOR r IN
    SELECT * FROM public.audit_templates
    WHERE is_active = true
      AND frequency IS NOT NULL
      AND next_run_at <= now()
  LOOP
    INSERT INTO public.audit_runs (template_id, status, scheduled_for, started_at, created_by)
    VALUES (r.id, 'draft', now(), now(), r.created_by);

    UPDATE public.audit_templates
      SET last_run_at = now(),
          next_run_at = public.next_run_from_frequency(r.frequency, now())
      WHERE id = r.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN cnt;
END;
$$;

-- Operations SLA rules and breaches
CREATE TABLE IF NOT EXISTS public.operations_sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('tasks', 'maintenance')),
  priority text,
  threshold_hours integer NOT NULL DEFAULT 48,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  rule_id uuid REFERENCES public.operations_sla_rules(id) ON DELETE SET NULL,
  severity text,
  breached_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_sla_breaches_unique
  ON public.operations_sla_breaches(entity_type, entity_id)
  WHERE resolved_at IS NULL;

-- updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_operations_sla_rules_updated_at
      BEFORE UPDATE ON public.operations_sla_rules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.operations_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_sla_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY operations_sla_rules_select ON public.operations_sla_rules
  FOR SELECT TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY operations_sla_rules_manage ON public.operations_sla_rules
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  );

CREATE POLICY operations_sla_breaches_select ON public.operations_sla_breaches
  FOR SELECT TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  );

CREATE POLICY operations_sla_breaches_manage ON public.operations_sla_breaches
  FOR ALL TO authenticated
  USING (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  );

-- SLA breach detection
CREATE OR REPLACE FUNCTION public.check_ops_sla_breaches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  cnt integer := 0;
BEGIN
  WITH task_candidates AS (
    SELECT
      t.id,
      t.priority,
      t.property_id,
      t.department_id,
      COALESCE(t.due_date, t.created_at + (COALESCE(r.threshold_hours, 48) || ' hours')::interval) AS due_at,
      r.id AS rule_id,
      COALESCE(r.threshold_hours, 48) AS threshold_hours
    FROM public.tasks t
    LEFT JOIN LATERAL (
      SELECT r.*
      FROM public.operations_sla_rules r
      WHERE r.entity_type = 'tasks'
        AND r.is_active = true
        AND (r.priority IS NULL OR r.priority = t.priority)
        AND (r.property_id IS NULL OR r.property_id = t.property_id)
        AND (r.department_id IS NULL OR r.department_id = t.department_id)
      ORDER BY (r.property_id IS NOT NULL)::int DESC, (r.department_id IS NOT NULL)::int DESC, (r.priority IS NOT NULL)::int DESC
      LIMIT 1
    ) r ON true
    WHERE t.is_deleted = false
      AND t.status NOT IN ('completed', 'cancelled')
  ),
  maintenance_candidates AS (
    SELECT
      m.id,
      m.priority,
      m.property_id,
      m.department_id,
      (m.created_at + (COALESCE(r.threshold_hours, 48) || ' hours')::interval) AS due_at,
      r.id AS rule_id,
      COALESCE(r.threshold_hours, 48) AS threshold_hours
    FROM public.maintenance_tickets m
    LEFT JOIN LATERAL (
      SELECT r.*
      FROM public.operations_sla_rules r
      WHERE r.entity_type = 'maintenance'
        AND r.is_active = true
        AND (r.priority IS NULL OR r.priority = m.priority)
        AND (r.property_id IS NULL OR r.property_id = m.property_id)
        AND (r.department_id IS NULL OR r.department_id = m.department_id)
      ORDER BY (r.property_id IS NOT NULL)::int DESC, (r.department_id IS NOT NULL)::int DESC, (r.priority IS NOT NULL)::int DESC
      LIMIT 1
    ) r ON true
    WHERE m.status NOT IN ('completed', 'cancelled')
  ),
  task_breaches AS (
    SELECT 'tasks'::text AS entity_type, id AS entity_id, rule_id, priority AS severity
    FROM task_candidates
    WHERE due_at <= now()
  ),
  maintenance_breaches AS (
    SELECT 'maintenance'::text AS entity_type, id AS entity_id, rule_id, priority AS severity
    FROM maintenance_candidates
    WHERE due_at <= now()
  ),
  combined AS (
    SELECT * FROM task_breaches
    UNION ALL
    SELECT * FROM maintenance_breaches
  )
  INSERT INTO public.operations_sla_breaches(entity_type, entity_id, rule_id, severity)
  SELECT c.entity_type, c.entity_id, c.rule_id, c.severity
  FROM combined c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.operations_sla_breaches b
    WHERE b.entity_type = c.entity_type
      AND b.entity_id = c.entity_id
      AND b.resolved_at IS NULL
  );

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- Seed default SLA rules
INSERT INTO public.operations_sla_rules (entity_type, priority, threshold_hours)
SELECT v.entity_type, v.priority, v.threshold_hours
FROM (VALUES
  ('tasks', NULL, 48),
  ('maintenance', NULL, 72),
  ('maintenance', 'critical', 12),
  ('maintenance', 'urgent', 24)
) AS v(entity_type, priority, threshold_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM public.operations_sla_rules r
  WHERE r.entity_type = v.entity_type
    AND ((r.priority IS NULL AND v.priority IS NULL) OR r.priority = v.priority)
);

-- Schedule automation jobs (pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enqueue-report-runs') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'enqueue-report-runs';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enqueue-audit-runs') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'enqueue-audit-runs';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-ops-sla-breaches') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'check-ops-sla-breaches';
  END IF;

  PERFORM cron.schedule('enqueue-report-runs', '*/30 * * * *', $cron$SELECT public.enqueue_due_reports();$cron$);
  PERFORM cron.schedule('enqueue-audit-runs', '0 * * * *', $cron$SELECT public.enqueue_due_audits();$cron$);
  PERFORM cron.schedule('check-ops-sla-breaches', '0 * * * *', $cron$SELECT public.check_ops_sla_breaches();$cron$);
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
