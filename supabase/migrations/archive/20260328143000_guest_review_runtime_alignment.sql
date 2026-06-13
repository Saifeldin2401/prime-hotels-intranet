BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" is required for guest review cron automation.';
  END IF;
END
$$;

INSERT INTO public.notification_email_templates (
  template_key,
  business_domain,
  notification_type,
  subject_template,
  html_template,
  text_template,
  from_name,
  from_email,
  is_active,
  metadata
)
VALUES
(
  'review_negative_alert',
  'operations',
  'system',
  'Guest Review Alert - {{property_name}} - {{platform}} - {{rating_display}}',
  '<h1>Guest Review Alert</h1><p><strong>{{property_name}}</strong> received a new guest review on <strong>{{platform}}</strong>.</p><p><strong>Rating:</strong> {{rating_display}}</p><p><strong>Assigned to:</strong> {{assignee_name}}</p><p><strong>Required action:</strong> Review the complaint, acknowledge ownership, and confirm the public response inside PHG Connect.</p><p><strong>Summary:</strong> {{summary_en}}</p><p><a href="{{action_url}}">Open review workspace</a></p>',
  'Guest Review Alert\n\nProperty: {{property_name}}\nPlatform: {{platform}}\nRating: {{rating_display}}\nAssigned to: {{assignee_name}}\nSummary: {{summary_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Operations',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_critical_vip_alert',
  'operations',
  'escalation_alert',
  'Critical Guest Review - Immediate Action Required - {{property_name}}',
  '<h1>Critical Guest Review</h1><p><strong>{{property_name}}</strong> has received a critical or VIP review that requires immediate action.</p><p><strong>Platform:</strong> {{platform}}</p><p><strong>Rating:</strong> {{rating_display}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Issues:</strong> {{issue_categories}}</p><p><strong>Manager brief:</strong> {{manager_brief_en}}</p><p><a href="{{action_url}}">Open critical review</a></p>',
  'Critical Guest Review\n\nProperty: {{property_name}}\nPlatform: {{platform}}\nRating: {{rating_display}}\nSeverity: {{severity}}\nIssues: {{issue_categories}}\nBrief: {{manager_brief_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Operations',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_escalation_alert',
  'management',
  'escalation_alert',
  'Guest Review Escalation - {{property_name}} - Level {{escalation_level}}',
  '<h1>Guest Review Escalation</h1><p>A guest review has breached its response SLA and was escalated.</p><p><strong>Property:</strong> {{property_name}}</p><p><strong>Escalation level:</strong> {{escalation_level}}</p><p><strong>Next owner:</strong> {{assignee_name}}</p><p><strong>Review summary:</strong> {{summary_en}}</p><p><a href="{{action_url}}">Open escalated review</a></p>',
  'Guest Review Escalation\n\nProperty: {{property_name}}\nEscalation level: {{escalation_level}}\nNext owner: {{assignee_name}}\nSummary: {{summary_en}}\n\nOpen: {{action_url}}',
  'PHG Connect Management',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
),
(
  'review_daily_exec_digest',
  'management',
  'system',
  'Daily Guest Review Executive Digest - {{report_date}}',
  '<h1>Daily Guest Review Executive Digest</h1><p>Attached is the executive digest for {{report_date}}.</p><p><strong>Total reviews:</strong> {{total_reviews}}</p><p><strong>Average rating:</strong> {{average_rating}}</p><p><strong>Negative reviews:</strong> {{negative_reviews}}</p><p><strong>SLA compliance:</strong> {{sla_compliance}}</p><p><a href="{{action_url}}">Open executive dashboard</a></p>',
  'Daily Guest Review Executive Digest\n\nDate: {{report_date}}\nTotal reviews: {{total_reviews}}\nAverage rating: {{average_rating}}\nNegative reviews: {{negative_reviews}}\nSLA compliance: {{sla_compliance}}\n\nOpen: {{action_url}}',
  'PHG Connect Executive Reporting',
  'notifications@phg-connect.com',
  true,
  '{"domain":"guest_reviews"}'::jsonb
)
ON CONFLICT (template_key) DO UPDATE
SET
  business_domain = EXCLUDED.business_domain,
  notification_type = EXCLUDED.notification_type,
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  from_name = EXCLUDED.from_name,
  from_email = EXCLUDED.from_email,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = now();

CREATE OR REPLACE FUNCTION public._reset_edge_http_cron_job_guest_reviews_v2(
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

  v_url := format('https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/%s', p_function_slug);

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
END
$$;

DO $$
DECLARE
  legacy_job_id bigint;
BEGIN
  SELECT jobid
  INTO legacy_job_id
  FROM cron.job
  WHERE jobname = 'guest-review-collector-scheduled';

  IF legacy_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(legacy_job_id);
  END IF;
END
$$;

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-collector-0005-ksa',
  '5 21 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-collector-0500-ksa',
  '0 2 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-collector-1000-ksa',
  '0 7 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-collector-1500-ksa',
  '0 12 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-collector-2000-ksa',
  '0 17 * * *',
  'guest-review-collector',
  60000,
  '{"run_mode":"scheduled","timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-notifier-retry',
  '*/10 * * * *',
  'guest-review-notifier',
  45000,
  '{"batch_size":50}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-sla-monitor',
  '0 * * * *',
  'guest-review-sla-monitor',
  45000,
  '{"timezone":"Asia/Riyadh"}'::jsonb
);

SELECT public._reset_edge_http_cron_job_guest_reviews_v2(
  'guest-review-daily-report',
  '0 4 * * *',
  'guest-review-daily-report',
  60000,
  '{"timezone":"Asia/Riyadh"}'::jsonb
);

DROP FUNCTION public._reset_edge_http_cron_job_guest_reviews_v2(text, text, text, integer, jsonb);

COMMIT;
NOTIFY pgrst, 'reload schema';
