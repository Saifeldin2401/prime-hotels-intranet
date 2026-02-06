-- Report Processing (server-side aggregation)
-- Date: 2026-02-06

BEGIN;

CREATE OR REPLACE FUNCTION public.process_report_runs(max_runs integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  r record;
  cnt int := 0;
  total_rows int := 0;
BEGIN
  FOR r IN
    SELECT rr.id, rd.report_type
    FROM public.report_runs rr
    JOIN public.report_definitions rd ON rd.id = rr.report_id
    WHERE rr.status = 'queued'
    ORDER BY rr.created_at ASC
    LIMIT max_runs
  LOOP
    total_rows := 0;

    IF r.report_type = 'operations' THEN
      SELECT COALESCE((SELECT count(*) FROM public.tasks),0)
           + COALESCE((SELECT count(*) FROM public.maintenance_tickets),0)
        INTO total_rows;
    ELSIF r.report_type = 'hr' THEN
      SELECT COALESCE((SELECT count(*) FROM public.profiles),0)
           + COALESCE((SELECT count(*) FROM public.leave_requests),0)
        INTO total_rows;
    ELSIF r.report_type = 'training' THEN
      SELECT COALESCE((SELECT count(*) FROM public.learning_assignments),0)
           + COALESCE((SELECT count(*) FROM public.learning_progress),0)
        INTO total_rows;
    ELSIF r.report_type = 'audits' THEN
      SELECT COALESCE((SELECT count(*) FROM public.audit_runs),0)
           + COALESCE((SELECT count(*) FROM public.audit_findings),0)
        INTO total_rows;
    ELSE
      SELECT 0 INTO total_rows;
    END IF;

    UPDATE public.report_runs
      SET status = 'success',
          finished_at = now(),
          row_count = total_rows
      WHERE id = r.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN cnt;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-report-runs') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-report-runs';
  END IF;

  PERFORM cron.schedule('process-report-runs', '*/30 * * * *', $cron$SELECT public.process_report_runs(10);$cron$);
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
