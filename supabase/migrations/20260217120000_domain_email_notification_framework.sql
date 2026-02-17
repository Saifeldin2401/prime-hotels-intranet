-- PHG Connect: Domain migration + scalable email notification framework

-- ============================================
-- 1) Extend queue/batch metadata for email workflows
-- ============================================
ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  ADD COLUMN IF NOT EXISTS template_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS business_domain TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS email_subject TEXT NULL,
  ADD COLUMN IF NOT EXISTS email_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS send_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.notification_batches
  ADD COLUMN IF NOT EXISTS email_sent_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_failed_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_queue_channels_allowed'
  ) THEN
    ALTER TABLE public.notification_queue
      ADD CONSTRAINT notification_queue_channels_allowed
      CHECK (channels <@ ARRAY['in_app', 'email']::TEXT[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_queue_business_domain_allowed'
  ) THEN
    ALTER TABLE public.notification_queue
      ADD CONSTRAINT notification_queue_business_domain_allowed
      CHECK (
        business_domain IN (
          'system',
          'user_management',
          'operations',
          'hr',
          'finance',
          'sales',
          'management'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_queue_priority_allowed'
  ) THEN
    ALTER TABLE public.notification_queue
      ADD CONSTRAINT notification_queue_priority_allowed
      CHECK (priority IN ('low', 'normal', 'high', 'critical'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_pending
  ON public.notification_queue (status, scheduled_for, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_domain_type
  ON public.notification_queue (business_domain, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_template
  ON public.notification_queue (template_key);

-- ============================================
-- 2) Reusable email templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  business_domain TEXT NOT NULL DEFAULT 'system' CHECK (
    business_domain IN (
      'system',
      'user_management',
      'operations',
      'hr',
      'finance',
      'sales',
      'management'
    )
  ),
  notification_type TEXT NOT NULL DEFAULT 'system',
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NULL,
  from_name TEXT NOT NULL DEFAULT 'PHG Connect',
  from_email TEXT NOT NULL DEFAULT 'notifications@phg-connect.com',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_email_templates_domain_type
  ON public.notification_email_templates (business_domain, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_email_templates_active
  ON public.notification_email_templates (is_active);

DROP TRIGGER IF EXISTS update_notification_email_templates_updated_at ON public.notification_email_templates;
CREATE TRIGGER update_notification_email_templates_updated_at
  BEFORE UPDATE ON public.notification_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_notification_email_templates" ON public.notification_email_templates;
CREATE POLICY "service_role_full_access_notification_email_templates"
  ON public.notification_email_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admins_read_notification_email_templates" ON public.notification_email_templates;
CREATE POLICY "admins_read_notification_email_templates"
  ON public.notification_email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- ============================================
-- 3) Delivery tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NULL REFERENCES public.notification_queue(id) ON DELETE SET NULL,
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  batch_id UUID NULL REFERENCES public.notification_batches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT NULL,
  template_key TEXT NULL,
  business_domain TEXT NOT NULL DEFAULT 'system' CHECK (
    business_domain IN (
      'system',
      'user_management',
      'operations',
      'hr',
      'finance',
      'sales',
      'management'
    )
  ),
  notification_type TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'suppressed', 'failed')
  ),
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicked_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_user_created
  ON public.notification_delivery_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_status
  ON public.notification_delivery_events (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_provider_message
  ON public.notification_delivery_events (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_batch
  ON public.notification_delivery_events (batch_id);

DROP TRIGGER IF EXISTS update_notification_delivery_events_updated_at ON public.notification_delivery_events;
CREATE TRIGGER update_notification_delivery_events_updated_at
  BEFORE UPDATE ON public.notification_delivery_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_notification_delivery_events" ON public.notification_delivery_events;
CREATE POLICY "service_role_full_access_notification_delivery_events"
  ON public.notification_delivery_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "users_view_own_notification_delivery_events" ON public.notification_delivery_events;
CREATE POLICY "users_view_own_notification_delivery_events"
  ON public.notification_delivery_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 4) Helper functions for automation/workflow integration
-- ============================================
CREATE OR REPLACE FUNCTION public.create_workflow_notification_batch(
  p_job_type TEXT,
  p_user_ids UUID[],
  p_notification_type TEXT,
  p_notification_data JSONB DEFAULT '{}'::JSONB,
  p_business_domain TEXT DEFAULT 'system',
  p_template_key TEXT DEFAULT NULL,
  p_channels TEXT[] DEFAULT ARRAY['in_app', 'email']::TEXT[],
  p_created_by UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
  v_domain TEXT;
  v_channels TEXT[];
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one recipient';
  END IF;

  v_domain := lower(coalesce(p_business_domain, 'system'));
  IF v_domain NOT IN ('system', 'user_management', 'operations', 'hr', 'finance', 'sales', 'management') THEN
    v_domain := 'system';
  END IF;

  v_channels := coalesce(p_channels, ARRAY['in_app']::TEXT[]);

  INSERT INTO public.notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), coalesce(p_notification_data, '{}'::JSONB), p_created_by)
  RETURNING id INTO v_batch_id;

  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notification_queue (
      batch_id,
      user_id,
      notification_type,
      notification_data,
      channels,
      template_key,
      business_domain,
      email_payload,
      send_email,
      priority,
      scheduled_for
    )
    VALUES (
      v_batch_id,
      v_user_id,
      p_notification_type,
      coalesce(p_notification_data, '{}'::JSONB),
      v_channels,
      p_template_key,
      v_domain,
      coalesce(p_notification_data, '{}'::JSONB),
      ('email' = ANY(v_channels)),
      CASE WHEN p_priority IN ('low', 'normal', 'high', 'critical') THEN p_priority ELSE 'normal' END,
      p_scheduled_for
    );
  END LOOP;

  RETURN v_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_batch_email_counters(
  p_batch_id UUID,
  p_sent INT DEFAULT 0,
  p_failed INT DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.notification_batches
  SET
    email_sent_count = email_sent_count + coalesce(p_sent, 0),
    email_failed_count = email_failed_count + coalesce(p_failed, 0),
    last_processed_at = now()
  WHERE id = p_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workflow_notification_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_batch_email_counters TO authenticated;

-- ============================================
-- 5) Seed professional templates for major business domains
-- ============================================
INSERT INTO public.notification_email_templates (
  template_key,
  business_domain,
  notification_type,
  subject_template,
  html_template,
  text_template,
  from_name,
  from_email,
  metadata
) VALUES
  (
    'user_management_welcome',
    'user_management',
    'system',
    'Welcome to PHG Connect - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#0b1c3e;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">PHG Connect</td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">User Management</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p><p style="margin:0 0 20px 0;line-height:1.6;">If this action requires your confirmation, use the secure link below.</p><a href="{{action_url}}" style="display:inline-block;background:#0b1c3e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open PHG Connect</a><p style="margin:22px 0 0 0;font-size:12px;color:#7b8798;">This notification was sent by PHG Connect. Domain: phg-connect.com</p></td></tr></table></td></tr></table></body></html>',
    'User Management | {{title}}\n\nHello {{recipient_name}},\n\n{{message}}\n\nOpen: {{action_url}}\n\nPHG Connect - phg-connect.com',
    'PHG Connect',
    'notifications@phg-connect.com',
    '{"category":"user_management","purpose":"user_lifecycle"}'::JSONB
  ),
  (
    'operations_incident_alert',
    'operations',
    'escalation_alert',
    'Operations Alert - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#9a3412;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">Operations Alert</td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">Operations</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p><p style="margin:0 0 16px 0;line-height:1.6;">Priority: {{priority}}</p><a href="{{action_url}}" style="display:inline-block;background:#9a3412;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Review Incident</a></td></tr></table></td></tr></table></body></html>',
    'Operations Alert | {{title}}\n\n{{message}}\nPriority: {{priority}}\n\nReview: {{action_url}}',
    'PHG Connect Operations',
    'notifications@phg-connect.com',
    '{"category":"operations","purpose":"incident_management"}'::JSONB
  ),
  (
    'hr_employee_update',
    'hr',
    'request_approved',
    'HR Update - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#0f766e;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">HR Notification</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p><a href="{{action_url}}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">View HR Workflow</a></td></tr></table></td></tr></table></body></html>',
    'HR Update | {{title}}\n\n{{message}}\n\nOpen: {{action_url}}',
    'PHG Connect HR',
    'notifications@phg-connect.com',
    '{"category":"hr","purpose":"employee_workflows"}'::JSONB
  ),
  (
    'finance_approval_alert',
    'finance',
    'approval_required',
    'Finance Approval Required - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#1d4ed8;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">Finance Workflow</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 12px 0;line-height:1.6;">{{message}}</p><p style="margin:0 0 16px 0;line-height:1.6;">Amount: {{amount}}</p><a href="{{action_url}}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Review Approval</a></td></tr></table></td></tr></table></body></html>',
    'Finance Approval Required | {{title}}\n\n{{message}}\nAmount: {{amount}}\n\nReview: {{action_url}}',
    'PHG Connect Finance',
    'notifications@phg-connect.com',
    '{"category":"finance","purpose":"approval_and_control"}'::JSONB
  ),
  (
    'sales_pipeline_alert',
    'sales',
    'system',
    'Sales Alert - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#7c3aed;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">Sales Notification</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p><p style="margin:0 0 16px 0;line-height:1.6;">Opportunity Stage: {{stage}}</p><a href="{{action_url}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open Sales Dashboard</a></td></tr></table></td></tr></table></body></html>',
    'Sales Alert | {{title}}\n\n{{message}}\nStage: {{stage}}\n\nOpen: {{action_url}}',
    'PHG Connect Sales',
    'notifications@phg-connect.com',
    '{"category":"sales","purpose":"pipeline_management"}'::JSONB
  ),
  (
    'management_kpi_alert',
    'management',
    'system',
    'Management KPI Alert - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#111827;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">Management Alert</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p><p style="margin:0 0 16px 0;line-height:1.6;">Reporting Window: {{period}}</p><a href="{{action_url}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open Executive Dashboard</a></td></tr></table></td></tr></table></body></html>',
    'Management KPI Alert | {{title}}\n\n{{message}}\nWindow: {{period}}\n\nDashboard: {{action_url}}',
    'PHG Connect Management',
    'notifications@phg-connect.com',
    '{"category":"management","purpose":"executive_visibility"}'::JSONB
  ),
  (
    'system_generic_alert',
    'system',
    'system',
    'PHG Connect Notification - {{title}}',
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#0b1c3e;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;">PHG Connect</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 16px 0;line-height:1.6;">{{message}}</p><a href="{{action_url}}" style="display:inline-block;background:#0b1c3e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open Platform</a></td></tr></table></td></tr></table></body></html>',
    'PHG Connect Notification | {{title}}\n\n{{message}}\n\nOpen: {{action_url}}',
    'PHG Connect',
    'notifications@phg-connect.com',
    '{"category":"system","purpose":"fallback"}'::JSONB
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
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = now();
