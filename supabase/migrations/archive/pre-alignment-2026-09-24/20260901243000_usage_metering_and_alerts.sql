-- Migration: 20260901243000_usage_metering_and_alerts
-- Step 1: Usage Metering & Proactive 80%/90%/100% Capacity Alert Notifications

-- 1. Ensure storage_used_bytes column exists on organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;

-- 2. Create quota_warning_logs table
CREATE TABLE IF NOT EXISTS public.quota_warning_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    quota_type text NOT NULL, -- 'hotels', 'learners', 'storage', 'ai_credits'
    threshold_pct integer NOT NULL, -- 80, 90, 100
    billing_period text NOT NULL, -- 'YYYY-MM'
    notified_at timestamptz DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quota_warning_logs_dedup
ON public.quota_warning_logs (organization_id, quota_type, threshold_pct, billing_period);

CREATE INDEX IF NOT EXISTS idx_quota_warning_logs_org_id
ON public.quota_warning_logs (organization_id);

-- Enable RLS
ALTER TABLE public.quota_warning_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quota_warning_logs_select ON public.quota_warning_logs;
CREATE POLICY quota_warning_logs_select ON public.quota_warning_logs
FOR SELECT USING (
  public.is_platform_operator()
  OR (organization_id IN (SELECT unnest(public.current_user_organization_ids())))
  OR public.has_active_platform_session(organization_id)
);

DROP POLICY IF EXISTS quota_warning_logs_write ON public.quota_warning_logs;
CREATE POLICY quota_warning_logs_write ON public.quota_warning_logs
FOR ALL USING (
  public.is_platform_operator()
  OR public.is_tenant_admin(organization_id)
);

-- 3. Create public.evaluate_organization_quotas function
CREATE OR REPLACE FUNCTION public.evaluate_organization_quotas(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_org public.organizations;
  v_plan public.subscription_plans;
  v_billing_period text := to_char(now(), 'YYYY-MM');

  v_hotels_used bigint := 0;
  v_hotels_max bigint := 10;
  v_hotels_pct integer := 0;

  v_learners_used bigint := 0;
  v_learners_max bigint := 100;
  v_learners_pct integer := 0;

  v_storage_used_bytes bigint := 0;
  v_storage_max_gb bigint := 50;
  v_storage_max_bytes bigint := 53687091200; -- 50 * 1024^3
  v_storage_pct integer := 0;

  v_ai_credits_used bigint := 0;
  v_ai_credits_max bigint := 1000;
  v_ai_credits_pct integer := 0;

  v_warnings_triggered jsonb := '[]'::jsonb;
  v_thresholds integer[] := ARRAY[80, 90, 100];
  v_threshold integer;
  
  v_admin_recipients uuid[];
  v_admin_id uuid;
  v_already_logged boolean;
  v_notif_title text;
  v_notif_msg text;

  v_quota_type text;
  v_used bigint;
  v_max bigint;
  v_pct integer;
  v_items jsonb;
  v_item jsonb;
BEGIN
  -- 1. Fetch organization
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Organization not found', 'org_id', p_org_id);
  END IF;

  -- 2. Fetch active subscription plan (if any)
  SELECT sp.* INTO v_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = p_org_id AND s.status = 'active'
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1;

  -- 3. Calculate usage & max
  -- Hotels
  SELECT COUNT(*) INTO v_hotels_used
  FROM public.hotels
  WHERE organization_id = p_org_id AND is_deleted = false;
  v_hotels_max := COALESCE(v_org.max_hotels, v_plan.max_hotels, 10);
  IF v_hotels_max > 0 THEN
    v_hotels_pct := LEAST(100, ROUND((v_hotels_used::numeric / v_hotels_max::numeric) * 100));
  ELSE
    v_hotels_pct := 0;
  END IF;

  -- Learners
  SELECT COUNT(*) INTO v_learners_used
  FROM public.organization_memberships
  WHERE organization_id = p_org_id AND is_active = true;
  v_learners_max := COALESCE(v_org.max_learners, v_plan.max_users, 100);
  IF v_learners_max > 0 THEN
    v_learners_pct := LEAST(100, ROUND((v_learners_used::numeric / v_learners_max::numeric) * 100));
  ELSE
    v_learners_pct := 0;
  END IF;

  -- Storage
  v_storage_used_bytes := COALESCE(v_org.storage_used_bytes, 0);
  IF v_storage_used_bytes = 0 THEN
    SELECT COALESCE(SUM(file_size), 0) INTO v_storage_used_bytes
    FROM public.documents
    WHERE organization_id = p_org_id AND is_deleted = false;
  END IF;
  v_storage_max_gb := COALESCE(v_org.max_storage_gb, v_plan.max_storage_gb, 50);
  v_storage_max_bytes := v_storage_max_gb * 1024 * 1024 * 1024;
  IF v_storage_max_bytes > 0 THEN
    v_storage_pct := LEAST(100, ROUND((v_storage_used_bytes::numeric / v_storage_max_bytes::numeric) * 100));
  ELSE
    v_storage_pct := 0;
  END IF;

  -- AI Credits
  v_ai_credits_used := COALESCE(v_org.ai_credits_used_this_month, 0);
  v_ai_credits_max := COALESCE(v_org.max_ai_credits_monthly, 0);
  IF v_ai_credits_max > 0 THEN
    v_ai_credits_pct := LEAST(100, ROUND((v_ai_credits_used::numeric / v_ai_credits_max::numeric) * 100));
  ELSE
    v_ai_credits_pct := 0;
  END IF;

  -- 4. Prepare evaluation items
  v_items := jsonb_build_array(
    jsonb_build_object('quota_type', 'hotels', 'used', v_hotels_used, 'max', v_hotels_max, 'pct', v_hotels_pct),
    jsonb_build_object('quota_type', 'learners', 'used', v_learners_used, 'max', v_learners_max, 'pct', v_learners_pct),
    jsonb_build_object('quota_type', 'storage', 'used', v_storage_used_bytes, 'max', v_storage_max_bytes, 'pct', v_storage_pct),
    jsonb_build_object('quota_type', 'ai_credits', 'used', v_ai_credits_used, 'max', v_ai_credits_max, 'pct', v_ai_credits_pct)
  );

  -- 5. Iterate through quotas & thresholds
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_quota_type := v_item->>'quota_type';
    v_used := (v_item->>'used')::bigint;
    v_max := (v_item->>'max')::bigint;
    v_pct := (v_item->>'pct')::integer;

    IF v_max > 0 THEN
      FOREACH v_threshold IN ARRAY v_thresholds LOOP
        IF v_pct >= v_threshold THEN
          -- Check if already logged for this billing period & threshold
          SELECT EXISTS (
            SELECT 1 FROM public.quota_warning_logs
            WHERE organization_id = p_org_id
              AND quota_type = v_quota_type
              AND threshold_pct = v_threshold
              AND billing_period = v_billing_period
          ) INTO v_already_logged;

          IF NOT v_already_logged THEN
            -- 1. Insert into quota_warning_logs
            INSERT INTO public.quota_warning_logs (
              organization_id, quota_type, threshold_pct, billing_period, metadata
            ) VALUES (
              p_org_id, v_quota_type, v_threshold, v_billing_period,
              jsonb_build_object('used', v_used, 'max', v_max, 'pct', v_pct)
            )
            ON CONFLICT (organization_id, quota_type, threshold_pct, billing_period) DO NOTHING;

            -- 2. Fetch admin user recipients
            SELECT ARRAY_AGG(DISTINCT user_id) INTO v_admin_recipients
            FROM public.organization_memberships
            WHERE organization_id = p_org_id
              AND is_active = true
              AND role IN ('organization_owner', 'organization_admin');

            v_notif_title := 'Quota Warning: ' || v_quota_type || ' at ' || v_threshold || '%';
            v_notif_msg := 'Your organization has reached ' || v_pct || '% of allocated ' || v_quota_type || ' capacity. Upgrade plan to prevent service disruption.';

            -- 3. Insert notification for each admin
            IF v_admin_recipients IS NOT NULL AND array_length(v_admin_recipients, 1) > 0 THEN
              FOREACH v_admin_id IN ARRAY v_admin_recipients LOOP
                INSERT INTO public.notifications (
                  user_id, type, title, message, link, is_read, metadata, created_at, updated_at
                ) VALUES (
                  v_admin_id,
                  'quota_warning',
                  v_notif_title,
                  v_notif_msg,
                  '/admin/settings?tab=subscription',
                  false,
                  jsonb_build_object(
                    'organization_id', p_org_id,
                    'quota_type', v_quota_type,
                    'threshold_pct', v_threshold,
                    'current_pct', v_pct,
                    'billing_period', v_billing_period
                  ),
                  now(),
                  now()
                );
              END LOOP;
            END IF;

            -- 4. Append to warnings_triggered output
            v_warnings_triggered := v_warnings_triggered || jsonb_build_object(
              'quota_type', v_quota_type,
              'threshold_pct', v_threshold,
              'current_pct', v_pct,
              'recipients_count', COALESCE(array_length(v_admin_recipients, 1), 0)
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 6. Return response jsonb
  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'billing_period', v_billing_period,
    'utilization', jsonb_build_object(
      'hotels', jsonb_build_object('used', v_hotels_used, 'max', v_hotels_max, 'pct', v_hotels_pct),
      'learners', jsonb_build_object('used', v_learners_used, 'max', v_learners_max, 'pct', v_learners_pct),
      'storage', jsonb_build_object('used', v_storage_used_bytes, 'max', v_storage_max_bytes, 'pct', v_storage_pct, 'used_gb', ROUND((v_storage_used_bytes::numeric / (1024*1024*1024)::numeric), 2), 'max_gb', v_storage_max_gb),
      'ai_credits', jsonb_build_object('used', v_ai_credits_used, 'max', v_ai_credits_max, 'pct', v_ai_credits_pct)
    ),
    'warnings_triggered', v_warnings_triggered
  );
END;
$;

GRANT EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_organization_quotas(uuid) TO service_role;

-- 4. Update schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260901243000', 'usage_metering_and_alerts')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
