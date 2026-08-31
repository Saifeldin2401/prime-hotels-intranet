-- Migration: phase5_ai_ops_and_doc_processing
-- Platform AI operations summary RPC and job retry function

CREATE OR REPLACE FUNCTION public.get_platform_ai_operations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
DECLARE
  v_result jsonb;
  v_total_jobs bigint := 0;
  v_failed_jobs bigint := 0;
  v_processing_jobs bigint := 0;
  v_completed_jobs bigint := 0;
  v_recent_jobs jsonb := '[]'::jsonb;
  v_cron_jobs jsonb := '[]'::jsonb;
  v_cron_runs jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Access denied: platform operator privilege required'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Summarize course_generation_jobs
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status IN ('processing', 'pending', 'generating')),
    count(*) FILTER (WHERE status = 'completed')
  INTO v_total_jobs, v_failed_jobs, v_processing_jobs, v_completed_jobs
  FROM public.course_generation_jobs;

  -- 2. Recent jobs
  SELECT COALESCE(jsonb_agg(to_jsonb(j)), '[]'::jsonb)
  INTO v_recent_jobs
  FROM (
    SELECT id, mode, course_id, status, error_message, duration_ms, models_used, created_at, updated_at
    FROM public.course_generation_jobs
    ORDER BY created_at DESC
    LIMIT 20
  ) j;

  -- 3. Cron jobs summary
  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(cj)), '[]'::jsonb)
    INTO v_cron_jobs
    FROM (
      SELECT jobid, jobname, schedule, active
      FROM cron.job
      ORDER BY jobid
    ) cj;

    SELECT COALESCE(jsonb_agg(to_jsonb(cr)), '[]'::jsonb)
    INTO v_cron_runs
    FROM (
      SELECT r.jobid, j.jobname, r.runid, r.status, r.return_message, r.start_time, r.end_time
      FROM cron.job_run_details r
      LEFT JOIN cron.job j ON j.jobid = r.jobid
      ORDER BY r.start_time DESC
      LIMIT 15
    ) cr;
  EXCEPTION WHEN OTHERS THEN
    v_cron_jobs := '[]'::jsonb;
    v_cron_runs := '[]'::jsonb;
  END;

  v_result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_jobs', v_total_jobs,
      'failed_jobs', v_failed_jobs,
      'processing_jobs', v_processing_jobs,
      'completed_jobs', v_completed_jobs
    ),
    'recent_jobs', v_recent_jobs,
    'cron_jobs', v_cron_jobs,
    'recent_cron_runs', v_cron_runs
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_course_generation_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_platform_operator() AND public.platform_operator_can('system.manage')) THEN
    RAISE EXCEPTION 'Access denied: platform operator with system.manage capability required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.course_generation_jobs
  SET status = 'pending', error_message = NULL, updated_at = now()
  WHERE id = p_job_id;

  RETURN FOUND;
END;
$$;
