
-- Previously recent_cron_runs was "the 15 most recent runs across ALL cron jobs combined",
-- ORDER BY start_time DESC LIMIT 15. Once more than a few jobs exist, a job that runs
-- less often than others can fall out of that shared window entirely, and the frontend
-- (PlatformOperationsHub.tsx) just silently omits its "last run" section with no
-- indication anything was truncated -- it can look like a job has never run when it
-- actually has. Fix: return each job's own single most recent run via a LATERAL join,
-- so every active cron job always shows its true last-run status regardless of how
-- often other jobs fire.
CREATE OR REPLACE FUNCTION public.get_platform_ai_operations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
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

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status IN ('processing', 'pending', 'generating')),
    count(*) FILTER (WHERE status = 'completed')
  INTO v_total_jobs, v_failed_jobs, v_processing_jobs, v_completed_jobs
  FROM public.course_generation_jobs;

  SELECT COALESCE(jsonb_agg(to_jsonb(j)), '[]'::jsonb)
  INTO v_recent_jobs
  FROM (
    SELECT id, mode, course_id, status, error_message, duration_ms, models_used, created_at, updated_at
    FROM public.course_generation_jobs
    ORDER BY created_at DESC
    LIMIT 20
  ) j;

  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(cj)), '[]'::jsonb)
    INTO v_cron_jobs
    FROM (
      SELECT jobid, jobname, schedule, active
      FROM cron.job
      ORDER BY jobid
    ) cj;

    -- One row per cron job: its own most recent run, not a shared top-15 across all jobs.
    SELECT COALESCE(jsonb_agg(to_jsonb(cr)), '[]'::jsonb)
    INTO v_cron_runs
    FROM (
      SELECT j.jobid, j.jobname, r.runid, r.status, r.return_message, r.start_time, r.end_time
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT r2.runid, r2.status, r2.return_message, r2.start_time, r2.end_time
        FROM cron.job_run_details r2
        WHERE r2.jobid = j.jobid
        ORDER BY r2.start_time DESC
        LIMIT 1
      ) r ON true
      WHERE r.runid IS NOT NULL
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
$function$;
