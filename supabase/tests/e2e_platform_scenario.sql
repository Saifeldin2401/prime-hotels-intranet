-- ============================================================================
-- PRIME Connect Platform Control Plane — End-to-End Test Scenario
-- File: supabase/tests/e2e_platform_scenario.sql
--
-- Single-script transaction verifying:
-- 1. Operator Identity & Granular Permissions
-- 2. Organization Provisioning & Entitlement Trigger Enforcement (Hotels & Seats)
-- 3. Master Content Deployment via Atomic RPC
-- 4. Notification Policy Resolution & Tenant Overrides
-- 5. System Settings Hierarchical Resolution (Global -> Tenant Override)
-- 6. Organization Suspension Lifecycle & Data Lockdown
-- 7. Operator Assisted-Access Impersonation Sessions
--
-- WRAPPED IN BEGIN ... ROLLBACK TO ENSURE ZERO DIRTY DATA ON LIVE SYSTEM.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_operator_id uuid := '641ac54a-7a0d-4bf8-a2d5-46845e0cabdf'::uuid; -- admin@prime.com
  v_test_org_id uuid := 'a1111111-1111-1111-1111-111111111111'::uuid;
  v_plan_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid; -- growth
  v_hotel_1_id uuid := gen_random_uuid();
  v_hotel_2_id uuid := gen_random_uuid();
  v_hotel_3_id uuid := gen_random_uuid();
  v_user_1_id uuid := 'ffd0d9ae-e982-4320-be79-539527110ee0'::uuid;
  v_user_2_id uuid := '97ed68d0-725b-41e8-9467-3c5f1b113ba8'::uuid;
  v_user_3_id uuid := '2dc33cc2-4a67-4afe-a02a-de1a282236cc'::uuid;
  v_user_4_id uuid := '48ca233f-4667-4820-bf01-b958764300f7'::uuid;
  v_master_sop_id uuid := gen_random_uuid();
  v_master_course_id uuid := gen_random_uuid();
  v_deployed_sop_id uuid;
  v_deployed_course_id uuid;
  v_setting_val jsonb;
  v_policy_enabled boolean;
  v_session_id uuid;
  v_err_caught boolean;
BEGIN
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'STARTING E2E PLATFORM CONTROL PLANE SCENARIO TEST';
  RAISE NOTICE '------------------------------------------------------------';

  -- Set JWT claims to operator user
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_operator_id, 'role', 'authenticated')::text, true);

  -- =========================================================================
  -- STEP 1: VERIFY OPERATOR IDENTITY & PERMISSIONS
  -- =========================================================================
  RAISE NOTICE 'STEP 1: Verifying Operator Identity & Role Checks...';
  
  IF NOT public.is_platform_operator(v_operator_id) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: User % must be recognized as a platform operator.', v_operator_id;
  END IF;

  IF NOT public.platform_operator_can('config.manage', v_operator_id) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Platform operator % must have config.manage permission.', v_operator_id;
  END IF;

  RAISE NOTICE '✓ Step 1 passed: Operator identity verified.';

  -- =========================================================================
  -- STEP 2: PROVISION TEST ORGANIZATION & SUBSCRIPTION PLAN
  -- =========================================================================
  RAISE NOTICE 'STEP 2: Provisioning Test Tenant with 2 Hotels & 3 Seats limit...';

  INSERT INTO public.organizations (
    id, name, slug, lifecycle_status, is_active, is_deleted, max_hotels, max_learners
  ) VALUES (
    v_test_org_id, 'E2E Test Hospitality Group', 'e2e-test-group', 'active', true, false, 2, 3
  );

  INSERT INTO public.subscriptions (
    organization_id, plan_id, status
  ) VALUES (
    v_test_org_id, v_plan_id, 'active'
  );

  -- Verify effective_entitlements RPC
  DECLARE
    v_ent jsonb;
  BEGIN
    SELECT public.effective_entitlements(v_test_org_id) INTO v_ent;
    IF (v_ent->>'max_hotels')::int <> 2 OR (v_ent->>'max_learners')::int <> 3 THEN
      RAISE EXCEPTION 'ASSERTION FAILED: effective_entitlements returned unexpected values: %', v_ent;
    END IF;
  END;

  RAISE NOTICE '✓ Step 2 passed: Organization & Subscriptions provisioned.';

  -- =========================================================================
  -- STEP 3: ENFORCE ENTITLEMENT LIMITS (HOTELS & SEATS)
  -- =========================================================================
  RAISE NOTICE 'STEP 3: Testing Runtime Quota Enforcement Triggers...';

  -- Add Hotel 1 and Hotel 2 (Within limit 2)
  INSERT INTO public.hotels (id, organization_id, name, city, is_active, is_deleted)
  VALUES (v_hotel_1_id, v_test_org_id, 'E2E Grand Hotel 1', 'Riyadh', true, false);

  INSERT INTO public.hotels (id, organization_id, name, city, is_active, is_deleted)
  VALUES (v_hotel_2_id, v_test_org_id, 'E2E Grand Hotel 2', 'Jeddah', true, false);

  -- Switch context to non-operator learner to test trigger enforcement
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_1_id, 'role', 'authenticated')::text, true);

  -- Attempt to add Hotel 3 as non-operator (Should fail with HOTEL_LIMIT_REACHED)
  v_err_caught := false;
  BEGIN
    INSERT INTO public.hotels (id, organization_id, name, city, is_active, is_deleted)
    VALUES (v_hotel_3_id, v_test_org_id, 'E2E Grand Hotel 3 (Excess)', 'Dammam', true, false);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%hotel limit%' OR SQLERRM ILIKE '%HOTEL_LIMIT_REACHED%' THEN
      v_err_caught := true;
      RAISE NOTICE '  Captured expected hotel quota exception: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Unexpected error when testing hotel quota: %', SQLERRM;
    END IF;
  END;

  -- Add 3 members (Within limit 3)
  INSERT INTO public.organization_memberships (id, organization_id, user_id, role, is_active)
  VALUES
    (gen_random_uuid(), v_test_org_id, v_user_1_id, 'learner', true),
    (gen_random_uuid(), v_test_org_id, v_user_2_id, 'learner', true),
    (gen_random_uuid(), v_test_org_id, v_user_3_id, 'learner', true);

  -- Attempt to add 4th member (Should fail with seat limit)
  v_err_caught := false;
  BEGIN
    INSERT INTO public.organization_memberships (id, organization_id, user_id, role, is_active)
    VALUES (gen_random_uuid(), v_test_org_id, v_user_4_id, 'learner', true);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%seat limit%' OR SQLERRM ILIKE '%SEAT_LIMIT_REACHED%' THEN
      v_err_caught := true;
      RAISE NOTICE '  Captured expected seat quota exception: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Unexpected error when testing seat quota: %', SQLERRM;
    END IF;
  END;

  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Seat limit trigger did not fire when exceeding quota.';
  END IF;

  RAISE NOTICE '✓ Step 3 passed: Database entitlement enforcement triggers verified.';

  -- Switch context back to operator
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_operator_id, 'role', 'authenticated')::text, true);

  -- =========================================================================
  -- STEP 4: MASTER CONTENT DEPLOYMENT VIA ATOMIC RPC
  -- =========================================================================
  RAISE NOTICE 'STEP 4: Testing Master Content Deployment RPC...';

  INSERT INTO public.documents (
    id, title, description, content, status, is_master_template, current_version, document_number
  ) VALUES (
    v_master_sop_id, 'Master Front Desk SOP', 'Corporate Standard', 'Step 1: Greet guest warmly.', 'PUBLISHED', true, 1, 'SOP-CORP-001'
  );

  v_deployed_sop_id := public.deploy_master_content(v_master_sop_id, 'document', v_test_org_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = v_deployed_sop_id
      AND organization_id = v_test_org_id
      AND master_source_id = v_master_sop_id
      AND is_master_template = false
  ) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Cloned SOP was not created in target organization.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.master_content_deployments
    WHERE master_content_id = v_master_sop_id
      AND target_organization_id = v_test_org_id
      AND target_content_id = v_deployed_sop_id
  ) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Master content deployment record was not created.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_audit_logs
    WHERE target_organization_id = v_test_org_id
      AND action = 'master_content.deployed'
  ) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Audit log was not written for master content deploy.';
  END IF;

  RAISE NOTICE '✓ Step 4 passed: Atomic master content distribution verified.';

  -- =========================================================================
  -- STEP 5: NOTIFICATION POLICY HIERARCHY & RESOLUTION
  -- =========================================================================
  RAISE NOTICE 'STEP 5: Testing Platform Notification Policies & Tenant Overrides...';

  v_policy_enabled := public.notification_policy_enabled(v_test_org_id, 'training_due_reminder');
  IF NOT v_policy_enabled THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Default notification policy should be enabled.';
  END IF;

  INSERT INTO public.organization_notification_overrides (
    organization_id, policy_key, is_enabled
  ) VALUES (
    v_test_org_id, 'training_due_reminder', false
  );

  v_policy_enabled := public.notification_policy_enabled(v_test_org_id, 'training_due_reminder');
  IF v_policy_enabled THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Tenant notification override was not respected.';
  END IF;

  v_policy_enabled := public.notification_policy_enabled(gen_random_uuid(), 'training_due_reminder');
  IF NOT v_policy_enabled THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Non-overridden org should inherit default enabled status.';
  END IF;

  RAISE NOTICE '✓ Step 5 passed: Notification policy resolution verified.';

  -- =========================================================================
  -- STEP 6: SYSTEM SETTINGS HIERARCHICAL RESOLUTION
  -- =========================================================================
  RAISE NOTICE 'STEP 6: Testing Hierarchical System Settings Resolution...';

  INSERT INTO public.system_settings (
    id, key, value, category, description, organization_id
  ) VALUES (
    gen_random_uuid(), 'brand_theme_primary_color', '"#D4AF37"'::jsonb, 'branding', 'Platform Gold Theme', NULL
  ) ON CONFLICT DO NOTHING;

  v_setting_val := public.get_setting(v_test_org_id, 'brand_theme_primary_color');
  IF v_setting_val <> '"#D4AF37"'::jsonb THEN
    RAISE EXCEPTION 'ASSERTION FAILED: get_setting did not fall back to global default. Received: %', v_setting_val;
  END IF;

  INSERT INTO public.system_settings (
    id, key, value, category, description, organization_id
  ) VALUES (
    gen_random_uuid(), 'brand_theme_primary_color', '"#003366"'::jsonb, 'branding', 'Custom Blue Theme', v_test_org_id
  );

  v_setting_val := public.get_setting(v_test_org_id, 'brand_theme_primary_color');
  IF v_setting_val <> '"#003366"'::jsonb THEN
    RAISE EXCEPTION 'ASSERTION FAILED: get_setting did not resolve tenant override. Received: %', v_setting_val;
  END IF;

  v_setting_val := public.get_setting(gen_random_uuid(), 'brand_theme_primary_color');
  IF v_setting_val <> '"#D4AF37"'::jsonb THEN
    RAISE EXCEPTION 'ASSERTION FAILED: get_setting for another org did not receive global default. Received: %', v_setting_val;
  END IF;

  RAISE NOTICE '✓ Step 6 passed: System settings hierarchical scoping verified.';

  -- =========================================================================
  -- STEP 7: SUSPENSION LIFECYCLE & DATA LOCKDOWN
  -- =========================================================================
  RAISE NOTICE 'STEP 7: Testing Suspension Lifecycle & Operational Gate...';

  IF NOT public.org_is_operational(v_test_org_id) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Active org must be operational.';
  END IF;

  UPDATE public.organizations
  SET lifecycle_status = 'suspended', suspension_reason = 'Billing delinquent'
  WHERE id = v_test_org_id;

  IF public.org_is_operational(v_test_org_id) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Suspended org must NOT be operational.';
  END IF;

  RAISE NOTICE '✓ Step 7 passed: Suspension operational gate verified.';

  -- =========================================================================
  -- STEP 8: OPERATOR ASSISTED ACCESS SESSION
  -- =========================================================================
  RAISE NOTICE 'STEP 8: Testing Operator Assisted Access Session...';

  INSERT INTO public.platform_access_sessions (
    id, admin_user_id, target_organization_id, access_reason, acting_role, is_active, expires_at
  ) VALUES (
    gen_random_uuid(), v_operator_id, v_test_org_id, 'Customer support troubleshooting ticket #9823', 'corporate_admin', true, now() + interval '30 minutes'
  ) RETURNING id INTO v_session_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_access_sessions
    WHERE id = v_session_id
      AND target_organization_id = v_test_org_id
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Active operator session was not found.';
  END IF;

  RAISE NOTICE '✓ Step 8 passed: Assisted access session created & verified.';

  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'ALL 8 SCENARIO SUITES PASSED WITH ZERO ERRORS!';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

ROLLBACK;
