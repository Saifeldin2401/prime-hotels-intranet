-- Migration: phase5_notification_policies
-- Platform notification policies and tenant overrides

CREATE TABLE IF NOT EXISTS public.platform_notification_policies (
  key text PRIMARY KEY,
  name text NOT NULL,
  name_ar text,
  description text,
  description_ar text,
  category text NOT NULL DEFAULT 'system',
  default_enabled boolean NOT NULL DEFAULT true,
  allow_tenant_override boolean NOT NULL DEFAULT true,
  channels jsonb NOT NULL DEFAULT '["in_app"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_notification_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_key text NOT NULL REFERENCES public.platform_notification_policies(key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL,
  channels jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_notif_override UNIQUE (organization_id, policy_key)
);

-- Seed initial 5 platform notification policy keys
INSERT INTO public.platform_notification_policies (key, name, name_ar, description, description_ar, category, default_enabled, allow_tenant_override, channels)
VALUES
  ('training_due_reminder', 'Training Due Reminder', 'تذكير بموعد استحقاق التدريب', 'Automated reminders sent to employees prior to module/course due dates', 'تذكيرات تلقائية ترسل للموظفين قبل تاريخ استحقاق التدريب', 'training', true, true, '["in_app", "email"]'::jsonb),
  ('course_assigned', 'Course Assignment Notification', 'إشعار تعيين دورة تدريبية', 'Sent to learners immediately upon being assigned to a course or learning path', 'إشعار فوري للمتعلم عند إسناد دورة جديدة أو مسار تدريبي', 'training', true, true, '["in_app", "email"]'::jsonb),
  ('certificate_issued', 'Certificate Issued Notification', 'إشعار إصدار الشهادة', 'Notification when a learner earns and is issued a course completion certificate', 'إشعار عند إتمام الدورة والحصول على شهادة معتمدة', 'training', true, true, '["in_app", "email"]'::jsonb),
  ('document_published', 'New Document / SOP Published', 'إشعار نشر وثيقة أو إجراء تشغيلي', 'Alert broadcast to relevant properties and departments upon SOP publication', 'تنبيه يتم إرساله للفنادق والأقسام المعنية عند نشر وثيقة جديدة', 'knowledge', true, true, '["in_app"]'::jsonb),
  ('security_alert', 'Security & Account Alerts', 'تنبيهات الأمان والحساب', 'Critical security alerts including failed logins, credential changes, and suspensions', 'تنبيهات أمان بالغة الأهمية تشمل محاولات الدخول وتغيير بيانات الاعتماد', 'security', true, false, '["in_app", "email"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  category = EXCLUDED.category,
  default_enabled = EXCLUDED.default_enabled,
  allow_tenant_override = EXCLUDED.allow_tenant_override,
  channels = EXCLUDED.channels,
  updated_at = now();

-- Helper RPC to check if a notification policy is enabled for an org
CREATE OR REPLACE FUNCTION public.notification_policy_enabled(
  p_org_id uuid,
  p_key text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN NOT pnp.allow_tenant_override THEN pnp.default_enabled
        WHEN ono.is_enabled IS NOT NULL THEN ono.is_enabled
        ELSE pnp.default_enabled
      END
      FROM public.platform_notification_policies pnp
      LEFT JOIN public.organization_notification_overrides ono
        ON ono.policy_key = pnp.key AND ono.organization_id = p_org_id
      WHERE pnp.key = p_key
    ),
    true
  );
$$;

-- RLS
ALTER TABLE public.platform_notification_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_notification_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_notification_policies_read ON public.platform_notification_policies;
CREATE POLICY platform_notification_policies_read ON public.platform_notification_policies
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS platform_notification_policies_write ON public.platform_notification_policies;
CREATE POLICY platform_notification_policies_write ON public.platform_notification_policies
FOR ALL USING (
  public.is_platform_operator() AND public.platform_operator_can('tenant.manage')
);

DROP POLICY IF EXISTS org_notification_overrides_read ON public.organization_notification_overrides;
CREATE POLICY org_notification_overrides_read ON public.organization_notification_overrides
FOR SELECT USING (
  public.is_platform_operator()
  OR public.is_tenant_admin(organization_id)
);

DROP POLICY IF EXISTS org_notification_overrides_write ON public.organization_notification_overrides;
CREATE POLICY org_notification_overrides_write ON public.organization_notification_overrides
FOR ALL USING (
  public.is_platform_operator()
  OR public.is_tenant_admin(organization_id)
);
