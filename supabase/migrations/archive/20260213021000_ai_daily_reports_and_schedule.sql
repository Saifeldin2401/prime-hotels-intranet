begin;

create table if not exists ai_daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  summary_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table ai_daily_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_daily_reports'
      and policyname = 'ai_daily_reports_select_authenticated'
  ) then
    create policy ai_daily_reports_select_authenticated
      on ai_daily_reports
      for select
      to authenticated
      using (true);
  end if;
end
$$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ai-daily-report-job') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ai-daily-report-job';
  end if;

  perform cron.schedule(
    'ai-daily-report-job',
    '0 6 * * *',
    $cron$
    select
      net.http_post(
        url:='https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/ai-daily-report',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
        )
      ) as request_id;
    $cron$
  );
end
$$;

commit;
