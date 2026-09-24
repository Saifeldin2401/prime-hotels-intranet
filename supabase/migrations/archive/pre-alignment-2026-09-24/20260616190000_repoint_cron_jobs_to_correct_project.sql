-- All 13 pg_cron HTTP-post jobs were calling edge functions on a stale project
-- (htsvjfrofcpkfzvjpwvx.supabase.co) left over from a project migration, so every
-- scheduled job (escalations, reports, maintenance, training notifications, news,
-- and the AI automation jobs) was firing into the wrong project. The target
-- functions are all deployed on this project, so repoint the URLs here.
--
-- Idempotent: the replace is a no-op once URLs already reference the current project.
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobid, command FROM cron.job WHERE command LIKE '%htsvjfrofcpkfzvjpwvx%' LOOP
    PERFORM cron.alter_job(
      j.jobid,
      command := replace(j.command, 'htsvjfrofcpkfzvjpwvx', 'dhbfaclkfysqwfppuxxa')
    );
  END LOOP;
END $$;
