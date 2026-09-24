create or replace function public.get_ai_daily_spend_usd()
returns numeric
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(sum(estimated_cost_usd), 0)::numeric
  from public.ai_usage_log
  where created_at >= date_trunc('day', now() at time zone 'utc')
    and coalesce(success, true) = true;
$$;

revoke all on function public.get_ai_daily_spend_usd() from public, anon;
grant execute on function public.get_ai_daily_spend_usd() to authenticated, service_role;

comment on function public.get_ai_daily_spend_usd() is
  'Sum of estimated_cost_usd across all users since 00:00 UTC today. Used by the AI Course Generator to enforce the platform daily spend cap.';
