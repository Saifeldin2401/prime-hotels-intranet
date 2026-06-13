-- Phase 2: Scheduled report processing automation via Edge Function

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.report_runs
  ADD COLUMN IF NOT EXISTS output_bucket text NOT NULL DEFAULT 'reports-exports',
  ADD COLUMN IF NOT EXISTS output_path text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS triggered_via text;

CREATE INDEX IF NOT EXISTS idx_report_runs_status_created
  ON public.report_runs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_report_runs_output_path
  ON public.report_runs(output_path)
  WHERE output_path IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports-exports',
  'reports-exports',
  false,
  100 * 1024 * 1024,
  ARRAY['text/csv', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.report_run_id_from_storage_path(storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parts text[];
  candidate text;
BEGIN
  parts := string_to_array(coalesce(storage_path, ''), '/');
  IF array_length(parts, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  IF array_length(parts, 1) >= 2 THEN
    candidate := regexp_replace(parts[2], '\..*$', '');
  ELSE
    candidate := regexp_replace(parts[1], '\..*$', '');
  END IF;

  RETURN candidate::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS reports_exports_select_authorized ON storage.objects;
CREATE POLICY reports_exports_select_authorized
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports-exports'
    AND EXISTS (
      SELECT 1
      FROM public.report_runs rr
      JOIN public.report_definitions rd ON rd.id = rr.report_id
      WHERE rr.id = public.report_run_id_from_storage_path(name)
        AND (
          rd.created_by = auth.uid()
          OR public.has_role_optimized('corporate_admin'::public.app_role)
          OR public.has_role_optimized('regional_admin'::public.app_role)
          OR public.has_role_optimized('regional_hr'::public.app_role)
          OR public.has_role_optimized('property_manager'::public.app_role)
          OR public.has_role_optimized('property_hr'::public.app_role)
          OR public.has_role_optimized('department_head'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS reports_exports_insert_service ON storage.objects;
CREATE POLICY reports_exports_insert_service
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports-exports'
    AND (
      public.has_role_optimized('corporate_admin'::public.app_role)
      OR public.has_role_optimized('regional_admin'::public.app_role)
      OR public.has_role_optimized('property_manager'::public.app_role)
      OR public.has_role_optimized('property_hr'::public.app_role)
      OR public.has_role_optimized('department_head'::public.app_role)
    )
  );

CREATE OR REPLACE FUNCTION public.get_secure_report_run_url(p_run_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_run record;
  v_signed text;
  v_path text;
BEGIN
  SELECT
    rr.id,
    rr.output_url,
    rr.output_bucket,
    rr.output_path,
    rd.created_by
  INTO v_run
  FROM public.report_runs rr
  JOIN public.report_definitions rd ON rd.id = rr.report_id
  WHERE rr.id = p_run_id
  LIMIT 1;

  IF v_run IS NULL THEN
    RAISE EXCEPTION 'Report run not found';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    v_run.created_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
    OR public.has_role_optimized('property_manager'::public.app_role)
    OR public.has_role_optimized('property_hr'::public.app_role)
    OR public.has_role_optimized('department_head'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this report run';
  END IF;

  v_path := COALESCE(NULLIF(v_run.output_path, ''), NULLIF(v_run.output_url, ''));

  IF v_path IS NULL THEN
    RAISE EXCEPTION 'Report output is not available';
  END IF;

  IF v_path ~* '^https?://' THEN
    RETURN v_path;
  END IF;

  SELECT storage.create_signed_url(
    COALESCE(NULLIF(v_run.output_bucket, ''), 'reports-exports'),
    v_path,
    3600
  )
  INTO v_signed;

  RETURN v_signed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_secure_report_run_url(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" is required for scheduled reports automation.';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public._reset_edge_http_cron_job_reporting(
  p_job_name text,
  p_schedule text,
  p_function_slug text,
  p_timeout_ms integer DEFAULT 45000,
  p_body jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
  v_url text;
  v_command text;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  v_url := format('https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/%s', p_function_slug);

  v_command := format(
$cmd$
select net.http_post(
  url:=%L,
  headers:=jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)
  ),
  timeout_milliseconds:=%s%s
) as request_id;
$cmd$,
    v_url,
    p_timeout_ms,
    CASE
      WHEN p_body IS NULL THEN ''
      ELSE format(', body:=%L::jsonb', p_body::text)
    END
  );

  PERFORM cron.schedule(p_job_name, p_schedule, v_command);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enqueue-report-runs') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'enqueue-report-runs';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-report-runs') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-report-runs';
  END IF;
END
$$;

SELECT public._reset_edge_http_cron_job_reporting(
  'scheduled-reports-job',
  '*/30 * * * *',
  'scheduled-reports',
  45000,
  '{}'::jsonb
);

DROP FUNCTION public._reset_edge_http_cron_job_reporting(text, text, text, integer, jsonb);

COMMIT;
NOTIFY pgrst, 'reload schema';;
