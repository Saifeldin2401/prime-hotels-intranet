-- ============================================================================
-- P7b: Tenant authorization guards for client-callable SECURITY DEFINER RPCs
-- ----------------------------------------------------------------------------
-- Each function below is granted to `authenticated` and takes an org_id /
-- user_id / document_id parameter, then READS or MUTATES tenant data WITHOUT
-- verifying the caller belongs to (or may act on behalf of) that tenant.
-- We prepend a guard only; every body is otherwise preserved byte-identical
-- (signature / return type / search_path / volatility / language unchanged).
--
-- Guard helpers used (all pre-existing):
--   public.is_platform_super_admin()
--   public.org_visible(uuid)
--   public.is_tenant_admin(uuid)
--   public.is_tenant_content_editor(uuid)
--   public.is_hr_or_admin(uuid)
--   public.current_user_organization_ids() -> uuid[]
--
-- Server/automation contexts (Edge Functions with the service_role key, pg_cron
-- jobs, internal maintenance) run as a privileged DB role rather than an
-- end-user JWT; those legitimately bypass the tenant check.
-- ============================================================================

BEGIN;

-- Privileged non-tenant execution context (service_role / cron / superuser).
CREATE OR REPLACE FUNCTION public._p7_is_service_context()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT current_user IN ('service_role', 'supabase_admin', 'postgres')
$$;
REVOKE ALL ON FUNCTION public._p7_is_service_context() FROM anon, public;
GRANT EXECUTE ON FUNCTION public._p7_is_service_context() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 1. publish_document_to_kb  (MUTATES public.documents for any org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_document_to_kb(p_document_id uuid, p_user_id uuid, p_visibility text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_supersedes_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_doc record;
    v_supersede_target uuid;
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.documents WHERE id = p_document_id;
    IF NOT (public.is_platform_super_admin() OR public._p7_is_service_context()
            OR public.is_tenant_admin(v_guard_org) OR public.is_tenant_content_editor(v_guard_org)) THEN
      RAISE EXCEPTION 'not authorized for organization %', v_guard_org USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document not found');
    END IF;

    v_supersede_target := COALESCE(p_supersedes_id, v_doc.supersedes_document_id);

    -- If this document supersedes an earlier version, deactivate the previous version from KB
    IF v_supersede_target IS NOT NULL THEN
        UPDATE public.documents
        SET
            knowledge_base_status = 'superseded',
            is_active_kb_version = false,
            updated_at = NOW()
        WHERE id = v_supersede_target;
    END IF;

    -- Update target document to Published KB status
    UPDATE public.documents
    SET
        status = 'PUBLISHED'::document_status,
        knowledge_base_status = 'indexed',
        is_active_kb_version = true,
        published_at = NOW(),
        published_by = p_user_id,
        last_published_by = p_user_id,
        visibility = COALESCE(p_visibility::document_visibility, visibility),
        category_id = COALESCE(p_category_id, category_id),
        department_id = COALESCE(p_department_id, department_id),
        supersedes_document_id = v_supersede_target,
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_document_id;

    RETURN jsonb_build_object('success', true, 'document_id', p_document_id, 'superseded_id', v_supersede_target);
END;
$function$;


-- ----------------------------------------------------------------------------
-- 2. remove_document_from_kb  (MUTATES public.documents for any org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_document_from_kb(p_document_id uuid, p_user_id uuid, p_reason text DEFAULT 'Removed by administrator'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.documents WHERE id = p_document_id;
    IF NOT (public.is_platform_super_admin() OR public._p7_is_service_context()
            OR public.is_tenant_admin(v_guard_org) OR public.is_tenant_content_editor(v_guard_org)) THEN
      RAISE EXCEPTION 'not authorized for organization %', v_guard_org USING ERRCODE = '42501';
    END IF;

    UPDATE public.documents
    SET
        knowledge_base_status = 'removed',
        is_active_kb_version = false,
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_document_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'document_id', p_document_id);
END;
$function$;


-- ----------------------------------------------------------------------------
-- 3. set_document_internal  (MUTATES public.documents for any org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_document_internal(p_document_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.documents WHERE id = p_document_id;
    IF NOT (public.is_platform_super_admin() OR public._p7_is_service_context()
            OR public.is_tenant_admin(v_guard_org) OR public.is_tenant_content_editor(v_guard_org)) THEN
      RAISE EXCEPTION 'not authorized for organization %', v_guard_org USING ERRCODE = '42501';
    END IF;

    UPDATE public.documents
    SET
        status = 'APPROVED'::document_status,
        knowledge_base_status = 'excluded',
        is_active_kb_version = false,
        reviewed_by = p_user_id,
        reviewed_at = NOW(),
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_document_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'document_id', p_document_id);
END;
$function$;


-- ----------------------------------------------------------------------------
-- 4. consume_ai_credit  (MUTATES public.organizations billing counters, any org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_org_id uuid, p_credits integer DEFAULT 1, p_tokens bigint DEFAULT 0, p_cost numeric DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_org_id IS NULL THEN RETURN; END IF;
  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin() OR public.is_tenant_admin(p_org_id)) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_org_id USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations
     SET ai_credits_used_this_month = COALESCE(ai_credits_used_this_month,0) + GREATEST(p_credits,0),
         updated_at = now()
   WHERE id = p_org_id;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 5. evaluate_organization_quotas  (MUTATES quota_warning_logs + notifications)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_organization_quotas(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin() OR public.is_tenant_admin(p_org_id)) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_org_id USING ERRCODE = '42501';
  END IF;

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
$function$;


-- ----------------------------------------------------------------------------
-- 6. emit_platform_event  (INSERTS platform_events attributed to any org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emit_platform_event(p_event_type text, p_organization_id uuid, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
          OR (p_organization_id IS NOT NULL AND public.org_visible(p_organization_id))) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_organization_id USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_events (event_type, organization_id, actor_id, resource_type, resource_id, payload)
  VALUES (p_event_type, p_organization_id, auth.uid(), p_resource_type, p_resource_id, COALESCE(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 7. get_tenant_email_context  (READS another tenant's org profile / billing email)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_email_context(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_primary text;
  v_secondary text;
  v_accent text;
  v_logo text;
  v_name text;
  v_name_ar text;
  v_sender_name text;
  v_reply_to text;
  v_support_email text;
  v_website text;
  v_footer text;
  v_footer_ar text;
BEGIN
  IF p_org_id IS NOT NULL
     AND NOT (public._p7_is_service_context() OR public.is_platform_super_admin() OR public.org_visible(p_org_id)) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_org_id USING ERRCODE = '42501';
  END IF;

  IF p_org_id IS NOT NULL THEN
    SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  END IF;

  -- Resolve brand colors with fallback
  v_primary := COALESCE(v_org.brand_colors->>'primary', '#0B1C3E');
  v_secondary := COALESCE(v_org.brand_colors->>'secondary', '#1a365d');
  v_accent := COALESCE(v_org.brand_colors->>'accent', '#D4AF37');

  -- Resolve logo with fallback
  v_logo := COALESCE(NULLIF(v_org.logo_url, ''), '/altus-emblem-icon.png');

  -- Resolve organization names
  v_name := COALESCE(NULLIF(v_org.name, ''), 'Altus Connect');
  v_name_ar := COALESCE(NULLIF(v_org.name_ar, ''), v_name);

  -- Resolve sender identity
  v_sender_name := COALESCE(NULLIF(v_org.email_sender_name, ''), v_name);
  v_support_email := COALESCE(NULLIF(v_org.support_email, ''), NULLIF(v_org.billing_email, ''), 'support@altus-advisory.com');
  v_reply_to := COALESCE(NULLIF(v_org.email_reply_to, ''), v_support_email);
  v_website := COALESCE(NULLIF(v_org.website_url, ''), 'https://www.altus-advisory.com');

  -- Resolve footers
  v_footer := COALESCE(NULLIF(v_org.email_footer_text, ''), 'All rights reserved.');
  v_footer_ar := COALESCE(NULLIF(v_org.email_footer_text_ar, ''), 'جميع الحقوق محفوظة.');

  RETURN jsonb_build_object(
    'org_id', v_org.id,
    'org_name', v_name,
    'org_name_ar', v_name_ar,
    'logo_url', v_logo,
    'brand_colors', jsonb_build_object(
      'primary', v_primary,
      'secondary', v_secondary,
      'accent', v_accent
    ),
    'sender_name', v_sender_name,
    'from_email', 'notifications@phg-connect.com',
    'reply_to', v_reply_to,
    'support_email', v_support_email,
    'website_url', v_website,
    'footer_text', v_footer,
    'footer_text_ar', v_footer_ar,
    'is_custom_branded', (v_org.id IS NOT NULL)
  );
END;
$function$;


-- ----------------------------------------------------------------------------
-- 8. create_notification  (INSERTS a notification for ANY user in ANY tenant)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb DEFAULT NULL::jsonb, p_action_url text DEFAULT NULL::text, p_related_entity_type text DEFAULT NULL::text, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id uuid;
  v_action_url text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    p_user_id = auth.uid()
    OR public._p7_is_service_context()
    OR public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = p_user_id
        AND m.organization_id = ANY (public.current_user_organization_ids())
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to notify user %', p_user_id USING ERRCODE = '42501';
  END IF;

  v_action_url := CASE WHEN p_action_url IS NOT NULL AND p_action_url LIKE '/%' THEN p_action_url ELSE NULL END;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, metadata, entity_type, entity_id
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, v_action_url,
    COALESCE(p_metadata, '{}'::jsonb), p_related_entity_type, p_related_entity_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 9. check_and_award_achievement  (INSERTS achievement rows for ANY user)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_definition RECORD;
    v_already_has BOOLEAN;
    v_qualifies BOOLEAN := false;
    v_training_count INTEGER;
    v_response_time DECIMAL;
BEGIN
    IF NOT (p_user_id = auth.uid() OR public._p7_is_service_context()
            OR public.is_platform_super_admin() OR public.is_hr_or_admin((SELECT auth.uid()))) THEN
        RAISE EXCEPTION 'not authorized to award achievements for user %', p_user_id USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_achievements
        WHERE user_id = p_user_id
          AND achievement_type = p_achievement_type
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN false;
    END IF;

    SELECT *
    INTO v_definition
    FROM public.achievement_definitions
    WHERE achievement_type = p_achievement_type
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    CASE p_achievement_type
        WHEN 'training_master' THEN
            SELECT COUNT(*)
            INTO v_training_count
            FROM public.training_progress
            WHERE user_id = p_user_id
              AND status = 'completed';

            v_qualifies := v_training_count >= COALESCE((v_definition.criteria->>'training_count')::INTEGER, 10);

        WHEN 'perfect_completion' THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.training_progress
                WHERE user_id = p_user_id
                  AND COALESCE(score_percentage, 0) = 100
            ) INTO v_qualifies;

        WHEN 'fast_responder' THEN
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            INTO v_response_time
            FROM public.tasks
            WHERE created_by = p_user_id
              AND status = 'completed'
              AND completed_at IS NOT NULL;

            v_qualifies := v_response_time IS NOT NULL
              AND v_response_time <= COALESCE((v_definition.criteria->>'max_hours')::INTEGER, 2);

        WHEN 'streak_master' THEN
            v_qualifies := false;

        ELSE
            v_qualifies := false;
    END CASE;

    IF v_qualifies THEN
        INSERT INTO public.user_achievements (
            user_id, achievement_type, title, description, icon, color, points
        ) VALUES (
            p_user_id, p_achievement_type, v_definition.title, v_definition.description,
            v_definition.icon, v_definition.color, v_definition.points
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING;

        RETURN FOUND;
    END IF;

    RETURN false;
END;
$function$;

-- 10. approve_training_module
CREATE OR REPLACE FUNCTION public.approve_training_module(p_module_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_author uuid;
    v_block record;
    v_quiz_id uuid;
    v_question_count integer;
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.training_modules WHERE id = p_module_id;
    IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
            OR (v_guard_org IS NOT NULL AND public.is_tenant_admin(v_guard_org))
            OR (v_guard_org IS NOT NULL AND public.is_tenant_content_editor(v_guard_org))
            OR (EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                  AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
            ) AND (v_guard_org IS NULL OR public.org_visible(v_guard_org)))) THEN
        RAISE EXCEPTION 'Not authorized to approve training modules for organization %', v_guard_org USING ERRCODE = '42501';
    END IF;

    FOR v_block IN
        SELECT id, content_data, is_mandatory
          FROM public.training_content_blocks_v
         WHERE training_module_id = p_module_id AND is_deleted = false AND type = 'quiz'
    LOOP
        IF v_block.is_mandatory IS FALSE THEN
            CONTINUE;
        END IF;

        v_quiz_id := public._safe_uuid(v_block.content_data ->> 'quiz_id');
        IF v_quiz_id IS NULL THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz block is not linked to a quiz';
        END IF;

        SELECT count(*) INTO v_question_count
          FROM public.unified_quiz_questions uq
          JOIN public.unified_questions q ON q.id = uq.question_id
         WHERE uq.quiz_id = v_quiz_id AND q.status = 'published';

        IF v_question_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish: a required quiz has no published questions';
        END IF;
    END LOOP;

    UPDATE public.training_modules
    SET status = 'published', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    PERFORM public.snapshot_training_module_version(p_module_id);

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
        VALUES (
            v_author,
            'training_review_approved',
            'Training module approved',
            '"' || v_title || '" was approved and is now published.',
            '/training/hub/' || p_module_id,
            'training_module',
            p_module_id
        );
    END IF;
END;
$function$;


-- 11. reject_training_module
CREATE OR REPLACE FUNCTION public.reject_training_module(p_module_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_author uuid;
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.training_modules WHERE id = p_module_id;
    IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
            OR (v_guard_org IS NOT NULL AND public.is_tenant_admin(v_guard_org))
            OR (v_guard_org IS NOT NULL AND public.is_tenant_content_editor(v_guard_org))
            OR (EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                  AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
            ) AND (v_guard_org IS NULL OR public.org_visible(v_guard_org)))) THEN
        RAISE EXCEPTION 'Not authorized to reject training modules for organization %', v_guard_org USING ERRCODE = '42501';
    END IF;

    UPDATE public.training_modules
    SET status = 'draft', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id AND status = 'pending_review'
    RETURNING title, created_by INTO v_title, v_author;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found or not pending review';
    END IF;

    IF v_author IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id, metadata)
        VALUES (
            v_author,
            'training_review_rejected',
            'Training module needs changes',
            '"' || v_title || '" was sent back to draft.' || CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
            '/training/hub/' || p_module_id || '?view=builder',
            'training_module',
            p_module_id,
            jsonb_build_object('reason', p_reason)
        );
    END IF;
END;
$function$;


-- 12. submit_training_module_for_review
CREATE OR REPLACE FUNCTION public.submit_training_module_for_review(p_module_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_title text;
    v_guard_org uuid;
BEGIN
    SELECT organization_id INTO v_guard_org FROM public.training_modules WHERE id = p_module_id;
    IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
            OR (v_guard_org IS NOT NULL AND public.org_visible(v_guard_org) AND (
                EXISTS (SELECT 1 FROM public.training_modules m WHERE m.id = p_module_id AND (m.created_by = auth.uid() OR m.updated_by = auth.uid()))
                OR public.is_tenant_admin(v_guard_org)
                OR public.is_tenant_content_editor(v_guard_org)
            ))) THEN
        RAISE EXCEPTION 'Not authorized to submit this module for review' USING ERRCODE = '42501';
    END IF;

    UPDATE public.training_modules
    SET status = 'pending_review', updated_at = now(), updated_by = auth.uid()
    WHERE id = p_module_id
    RETURNING title INTO v_title;

    IF v_title IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
    SELECT
        ur.user_id,
        'training_review_requested',
        'Training module awaiting review',
        '"' || v_title || '" was submitted for review before publishing.',
        '/training/hub/' || p_module_id,
        'training_module',
        p_module_id
    FROM public.user_roles ur
    WHERE (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr'])
      AND (v_guard_org IS NULL OR ur.user_id IN (
        SELECT om.user_id FROM public.organization_memberships om WHERE om.organization_id = v_guard_org AND om.is_active = true
      ));
END;
$function$;


-- 13. duplicate_training_module
CREATE OR REPLACE FUNCTION public.duplicate_training_module(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_new_module_id uuid;
    v_source public.training_modules%ROWTYPE;
BEGIN
    SELECT * INTO v_source FROM public.training_modules WHERE id = p_module_id;
    IF v_source IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
            OR (v_source.organization_id IS NOT NULL AND public.org_visible(v_source.organization_id) AND (
                v_source.created_by = auth.uid() OR v_source.updated_by = auth.uid()
                OR public.is_tenant_admin(v_source.organization_id)
                OR public.is_tenant_content_editor(v_source.organization_id)
            ))) THEN
        RAISE EXCEPTION 'Not authorized to duplicate this module' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.training_modules (
        title, description, estimated_duration_minutes, property_id, department_id,
        validity_period_days, allow_retake, max_attempts, auto_advance, show_feedback,
        randomize_questions, show_answers, time_limit_minutes, audience, content_language,
        template_id, passing_score_percentage, status, category, difficulty_level,
        certificate_enabled, created_by, organization_id
    )
    VALUES (
        v_source.title || ' (Copy)', v_source.description, v_source.estimated_duration_minutes,
        v_source.property_id, v_source.department_id, v_source.validity_period_days,
        v_source.allow_retake, v_source.max_attempts, v_source.auto_advance, v_source.show_feedback,
        v_source.randomize_questions, v_source.show_answers, v_source.time_limit_minutes,
        v_source.audience, v_source.content_language, v_source.template_id,
        v_source.passing_score_percentage, 'draft', v_source.category, v_source.difficulty_level,
        v_source.certificate_enabled, auth.uid(), v_source.organization_id
    )
    RETURNING id INTO v_new_module_id;

    INSERT INTO public.documents (
        title, status, created_by, content, content_type, training_module_id,
        block_type, block_order, content_data, is_mandatory, duration_seconds, points,
        content_url, ai_generated, ai_source_content, visibility, organization_id
    )
    SELECT
        d.title, d.status, auth.uid(), d.content, 'training_block', v_new_module_id,
        d.block_type, d.block_order, d.content_data, d.is_mandatory, d.duration_seconds, d.points,
        d.content_url, d.ai_generated, d.ai_source_content, d.visibility, d.organization_id
    FROM public.documents d
    WHERE d.training_module_id = p_module_id
      AND d.content_type = 'training_block'
      AND d.is_deleted = false;

    RETURN v_new_module_id;
END;
$function$;


-- 14. snapshot_training_module_version
CREATE OR REPLACE FUNCTION public.snapshot_training_module_version(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_next_version integer;
    v_module jsonb;
    v_blocks jsonb;
    v_version_id uuid;
    v_source public.training_modules%ROWTYPE;
BEGIN
    SELECT * INTO v_source FROM public.training_modules WHERE id = p_module_id;
    IF v_source IS NULL THEN
        RAISE EXCEPTION 'Module not found';
    END IF;

    IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
            OR (v_source.organization_id IS NOT NULL AND public.org_visible(v_source.organization_id) AND (
                v_source.created_by = auth.uid() OR v_source.updated_by = auth.uid()
                OR public.is_tenant_admin(v_source.organization_id)
                OR public.is_tenant_content_editor(v_source.organization_id)
            ))) THEN
        RAISE EXCEPTION 'Not authorized to version this module' USING ERRCODE = '42501';
    END IF;

    SELECT to_jsonb(m) INTO v_module FROM public.training_modules m WHERE m.id = p_module_id;

    SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b."order"), '[]'::jsonb)
    INTO v_blocks
    FROM public.training_content_blocks_v b
    WHERE b.training_module_id = p_module_id AND b.is_deleted = false;

    SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.training_module_versions
    WHERE training_module_id = p_module_id;

    INSERT INTO public.training_module_versions (training_module_id, version_number, snapshot, published_by, organization_id)
    VALUES (
        p_module_id,
        v_next_version,
        jsonb_build_object('module', v_module, 'blocks', v_blocks),
        auth.uid(),
        v_source.organization_id
    )
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$function$;


-- 15. approve_pending_user
CREATE OR REPLACE FUNCTION public.approve_pending_user(p_user_id uuid, p_approve boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_orgs uuid[];
BEGIN
  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
          OR has_any_role((SELECT auth.uid()), ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr']::app_role[])) THEN
    RAISE EXCEPTION 'Not authorized to review user approvals' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(organization_id) INTO v_user_orgs
  FROM public.organization_memberships
  WHERE user_id = p_user_id;

  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin()
          OR (v_user_orgs IS NOT NULL AND v_user_orgs && public.current_user_organization_ids())) THEN
    RAISE EXCEPTION 'Not authorized to manage users in other organizations' USING ERRCODE = '42501';
  END IF;

  UPDATE pending_user_approvals
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         reviewed_by = (SELECT auth.uid()),
         reviewed_at = now()
   WHERE user_id = p_user_id;

  IF p_approve THEN
    UPDATE profiles SET account_status = 'active', is_active = true WHERE id = p_user_id;
  ELSE
    UPDATE profiles SET is_active = false WHERE id = p_user_id;
  END IF;

  RETURN json_build_object('success', true, 'user_id', p_user_id, 'approved', p_approve);
END;
$function$;


-- 16. export_birthdays_for_month
CREATE OR REPLACE FUNCTION public.export_birthdays_for_month(p_month integer, p_year integer DEFAULT (date_part('year'::text, CURRENT_DATE))::integer, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(full_name text, job_title text, hotel text, department text, birthday_date date, age integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12' USING ERRCODE = '22023';
  END IF;

  IF NOT (public._p7_is_service_context() OR public.is_platform_super_admin() OR public.is_hr_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only HR/Admin roles can export birthday lists' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.full_name,
    p.job_title,
    h.name AS hotel,
    dept.name AS department,
    p.date_of_birth AS birthday_date,
    date_part('year', age(make_date(p_year, p_month, 1), p.date_of_birth))::int AS age
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT om.hotel_id, om.department_id
    FROM public.organization_memberships om
    WHERE om.user_id = p.id AND om.is_active = true
    ORDER BY om.is_primary DESC NULLS LAST, om.created_at ASC
    LIMIT 1
  ) m ON true
  LEFT JOIN public.hotels h ON h.id = m.hotel_id
  LEFT JOIN public.departments dept ON dept.id = m.department_id
  WHERE COALESCE(p.is_deleted, false) = false
    AND p.is_active = true
    AND (p.organization_id IS NULL OR public.org_visible(p.organization_id))
    AND date_part('month', p.date_of_birth)::int = p_month
    AND public.can_view_employee_public_profile(p.id)
    AND (
      p_property_id IS NULL OR m.hotel_id = p_property_id
    )
  ORDER BY date_part('day', p.date_of_birth), p.full_name;
END;
$function$;


-- 17. get_todays_birthdays
CREATE OR REPLACE FUNCTION public.get_todays_birthdays(p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, property_name text, birthday date, age integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.job_title,
  h.name AS property_name,
  p.date_of_birth AS birthday,
  date_part('year', age(current_date, p.date_of_birth))::int AS age
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT om.hotel_id
  FROM public.organization_memberships om
  WHERE om.user_id = p.id AND om.is_active = true
  ORDER BY om.is_primary DESC NULLS LAST, om.created_at ASC
  LIMIT 1
) m ON true
LEFT JOIN public.hotels h ON h.id = m.hotel_id
WHERE COALESCE(p.is_deleted, false) = false
  AND p.is_active = true
  AND (p.organization_id IS NULL OR public.org_visible(p.organization_id))
  AND date_part('month', p.date_of_birth) = date_part('month', current_date)
  AND date_part('day', p.date_of_birth) = date_part('day', current_date)
  AND public.can_view_employee_public_profile(p.id)
  AND (
    p_property_id IS NULL OR m.hotel_id = p_property_id
  )
ORDER BY p.full_name;
$function$;

COMMIT;
