# Automated Workflow System

This system runs scheduled background tasks using Supabase Edge Functions and `pg_cron`.

## Deployed Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `daily-workflows` | Daily (9:00 AM UTC) | Sends training reminders, task notifications, and leave balance alerts. |
| `approval-escalation` | Every 6 hours | Checks for pending approvals > 48h and escalates them. |
| `ai-metrics-collector` | Hourly | Captures operational metrics for AI governance. |
| `ai-optimizer` | Daily | Generates AI policy proposals from metrics. |
| `ai-safety-validator` | On-demand | Validates AI proposals against schemas and constraints. |
| `ai-policy-applier` | On-demand | Applies validated policy proposals. |
| `ai-rollback-engine` | Hourly | Rolls back policies when metrics degrade. |

## Deployment Status
✅ **Database Migration:** Applied (`009_workflow_system.sql`)
✅ **Edge Functions:** Deployed (`daily-workflows`, `approval-escalation`)

## ⚡ FINAL STEP: Configure Cron Schedule

Run the following SQL in your Supabase SQL Editor to start the automation.
Replace `[YOUR_SERVICE_ROLE_KEY]` with the `service_role` key from **Project Settings > API**.

```sql
-- Enable necessary extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Daily Workflows (Every day at 9 AM UTC)
select cron.schedule(
  'daily-workflows-job',
  '0 9 * * *',
  $$
  select
    net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/daily-workflows',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);

-- 2. Approval Escalation (Every 6 hours)
select cron.schedule(
  'approval-escalation-job',
  '0 */6 * * *',
  $$
  select
    net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/approval-escalation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);

-- 3. AI Metrics Collector (Hourly)
select cron.schedule(
  'ai-metrics-collector-job',
  '0 * * * *',
  $$
  select
    net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-metrics-collector',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);

-- 4. AI Optimizer (Daily at 2 AM UTC)
select cron.schedule(
  'ai-optimizer-job',
  '0 2 * * *',
  $$
  select
    net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-optimizer',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);

-- 5. AI Rollback Engine (Hourly, after metrics)
select cron.schedule(
  'ai-rollback-engine-job',
  '15 * * * *',
  $$
  select
    net.http_post(
      url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/ai-rollback-engine',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);
```

## Monitoring
View execution logs in the Admin Dashboard: `Admin > Automations`.

## Manual Testing
You can manually run the functions using the Supabase CLI:
```bash
supabase functions serve daily-workflows --no-verify-jwt
```
Or trigger them from the **Admin > Automations** UI.
