CREATE OR REPLACE FUNCTION public.update_recurring_tasks_schedule(p_run_time text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, cron
AS $function$
DECLARE
  v_hour int;
  v_min int;
  v_schedule text;
  v_job record;
  v_command text;
BEGIN
  IF p_run_time IS NULL OR length(trim(p_run_time)) = 0 THEN
    RAISE EXCEPTION 'run_time is required';
  END IF;

  v_hour := split_part(p_run_time, ':', 1)::int;
  v_min := split_part(p_run_time, ':', 2)::int;

  IF v_hour < 0 OR v_hour > 23 OR v_min < 0 OR v_min > 59 THEN
    RAISE EXCEPTION 'Invalid run_time: %', p_run_time;
  END IF;

  IF NOT (
    has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR has_role(auth.uid(), 'property_manager'::public.app_role)
    OR has_role(auth.uid(), 'property_hr'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized to update recurring task schedule';
  END IF;

  v_schedule := format('%s %s * * *', v_min, v_hour);

  SELECT * INTO v_job
  FROM cron.job
  WHERE jobname = 'recurring-tasks-job'
  LIMIT 1;

  IF v_job.jobid IS NOT NULL THEN
    v_command := v_job.command;
    PERFORM cron.unschedule(v_job.jobid);
  END IF;

  IF v_command IS NULL THEN
    v_command := $cmd$
    SELECT
        net.http_post(
            url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/generate-template-tasks',
            headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
            )
        ) as request_id;
    $cmd$;
  END IF;

  PERFORM cron.schedule('recurring-tasks-job', v_schedule, v_command);
END;
$function$;;
