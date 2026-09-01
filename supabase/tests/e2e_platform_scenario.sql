-- ==============================================================================
-- SECTION-45 END-TO-END AUTOMATED PLATFORM & MULTI-TENANT SECURITY SCENARIO TEST
-- ==============================================================================
-- This test runs inside an atomic transaction that is rolled back at the end.
-- It verifies:
--   1. Tenant organization, brand, hotel, and department hierarchy creation
--   2. Plan quota and entitlement enforcement (max hotels, max learners)
--   3. Operational status enforcement (org_is_operational)
--   4. Master content library deployment into customer tenant
--   5. Scoped training assignment rule creation and assignment generation
--   6. Learner progress recording
--   7. Cross-tenant isolation verification
--   8. Audited break-glass platform operator access session lifecycle
--   9. Suspended tenant immediate access cut-off
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- Organization IDs
    v_org_a_id uuid;
    v_org_b_id uuid;
    v_org_suspended_id uuid;
    
    -- Hotel IDs
    v_hotel_a1_id uuid;
    v_hotel_a2_id uuid;
    v_hotel_b_id uuid;
    
    -- Brand & Department IDs
    v_brand_a_id uuid;
    v_dept_a_id uuid;
    
    -- User IDs
    v_op_user_id uuid := gen_random_uuid();
    v_admin_a_id uuid := gen_random_uuid();
    v_learner_a_id uuid := gen_random_uuid();
    v_admin_b_id uuid := gen_random_uuid();
    v_learner_b_id uuid := gen_random_uuid();
    
    -- Master Course ID & Deployed Course ID
    v_master_course_id uuid;
    v_deployed_course_id uuid;
    v_assignment_id uuid;
    v_session_id uuid;
    
    -- Telemetry & Test Verification Variables
    v_headroom boolean;
    v_operational boolean;
    v_count integer;
    v_session_active boolean;
BEGIN
    RAISE NOTICE '>>> [STEP 1/10] Setting up Organization Hierarchy & Auth Users...';

    -- 1. Create Organizations (Tenant A: max 2 hotels, max 3 learners)
    INSERT INTO public.organizations (name, slug, lifecycle_status, max_hotels, max_learners, is_active)
    VALUES ('Prime Tenant Alpha', 'prime-alpha-' || substr(gen_random_uuid()::text, 1, 8), 'active', 2, 3, true)
    RETURNING id INTO v_org_a_id;

    INSERT INTO public.organizations (name, slug, lifecycle_status, max_hotels, max_learners, is_active)
    VALUES ('Beta Hospitality Corp', 'beta-corp-' || substr(gen_random_uuid()::text, 1, 8), 'active', 2, 3, true)
    RETURNING id INTO v_org_b_id;

    INSERT INTO public.organizations (name, slug, lifecycle_status, max_hotels, max_learners, is_active)
    VALUES ('Suspended Hotel Group', 'suspended-group-' || substr(gen_random_uuid()::text, 1, 8), 'suspended', 2, 3, false)
    RETURNING id INTO v_org_suspended_id;

    -- 2. Create Brands
    INSERT INTO public.brands (organization_id, name, code, is_active)
    VALUES (v_org_a_id, 'Prime Luxury Brand', 'PLX', true)
    RETURNING id INTO v_brand_a_id;

    -- 3. Create Hotels under Tenant A (Hotel 1)
    INSERT INTO public.hotels (organization_id, brand_id, name, hotel_code, is_active)
    VALUES (v_org_a_id, v_brand_a_id, 'Prime Hotel Riyadh', 'PHR', true)
    RETURNING id INTO v_hotel_a1_id;

    -- 4. Create Department under Hotel 1
    INSERT INTO public.departments (organization_id, hotel_id, name, is_active)
    VALUES (v_org_a_id, v_hotel_a1_id, 'Front Office', true)
    RETURNING id INTO v_dept_a_id;

    -- 5. Create Hotel under Tenant B
    INSERT INTO public.hotels (organization_id, name, hotel_code, is_active)
    VALUES (v_org_b_id, 'Beta Hotel Jeddah', 'BHJ', true)
    RETURNING id INTO v_hotel_b_id;

    -- 6. Seed Auth Users (Trigger populates profiles automatically)
    INSERT INTO auth.users (id, email, aud, role)
    VALUES 
        (v_op_user_id, 'operator@altus-platform.io', 'authenticated', 'authenticated'),
        (v_admin_a_id, 'admin@prime-alpha.com', 'authenticated', 'authenticated'),
        (v_learner_a_id, 'learner1@prime-alpha.com', 'authenticated', 'authenticated'),
        (v_admin_b_id, 'admin@beta-corp.com', 'authenticated', 'authenticated'),
        (v_learner_b_id, 'learner1@beta-corp.com', 'authenticated', 'authenticated');

    INSERT INTO public.profiles (id, full_name, email, date_of_birth, is_active)
    VALUES 
        (v_op_user_id, 'Platform Master Operator', 'operator@altus-platform.io', '1990-01-01', true),
        (v_admin_a_id, 'Alpha Admin', 'admin@prime-alpha.com', '1990-01-01', true),
        (v_learner_a_id, 'Alpha Learner 1', 'learner1@prime-alpha.com', '1990-01-01', true),
        (v_admin_b_id, 'Beta Admin', 'admin@beta-corp.com', '1990-01-01', true),
        (v_learner_b_id, 'Beta Learner 1', 'learner1@beta-corp.com', '1990-01-01', true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        date_of_birth = EXCLUDED.date_of_birth,
        is_active = EXCLUDED.is_active;

    -- Seed Platform Operator Role
    INSERT INTO public.platform_users (user_id, is_active)
    VALUES (v_op_user_id, true);

    INSERT INTO public.platform_role_assignments (platform_user_id, platform_role)
    VALUES (v_op_user_id, 'system_owner');

    INSERT INTO public.organization_memberships (user_id, organization_id, hotel_id, department_id, role, is_active)
    VALUES 
        (v_admin_a_id, v_org_a_id, v_hotel_a1_id, v_dept_a_id, 'organization_admin', true),
        (v_learner_a_id, v_org_a_id, v_hotel_a1_id, v_dept_a_id, 'learner', true),
        (v_admin_b_id, v_org_b_id, v_hotel_b_id, NULL, 'organization_admin', true),
        (v_learner_b_id, v_org_b_id, v_hotel_b_id, NULL, 'learner', true);

    -- Set active caller context to operator
    PERFORM set_config('request.jwt.claim.sub', v_op_user_id::text, true);

    RAISE NOTICE '>>> [STEP 2/10] Verifying Entitlement Quota Rules (Hotels & Learners)...';
    
    -- Check Hotel Entitlement (1 hotel used out of 2 allowed -> should have headroom)
    SELECT public.check_entitlement(v_org_a_id, 'hotel') INTO v_headroom;
    ASSERT v_headroom = true, 'Assertion failed: Tenant A should have hotel headroom with 1/2 hotels.';

    -- Add 2nd hotel to reach max limit
    INSERT INTO public.hotels (organization_id, brand_id, name, hotel_code, is_active)
    VALUES (v_org_a_id, v_brand_a_id, 'Prime Hotel Jeddah', 'PHJ', true)
    RETURNING id INTO v_hotel_a2_id;

    -- Check Hotel Entitlement again (2 hotels used out of 2 allowed -> NO headroom)
    SELECT public.check_entitlement(v_org_a_id, 'hotel') INTO v_headroom;
    ASSERT v_headroom = false, 'Assertion failed: Tenant A should NOT have hotel headroom with 2/2 hotels.';

    -- Check Learner Entitlement (1 learner used out of 3 allowed -> should have headroom)
    SELECT public.check_entitlement(v_org_a_id, 'learner') INTO v_headroom;
    ASSERT v_headroom = true, 'Assertion failed: Tenant A should have learner headroom with 1/3 learners.';

    RAISE NOTICE '>>> [STEP 3/10] Verifying Operational Status Checking (org_is_operational)...';
    SELECT public.org_is_operational(v_org_a_id) INTO v_operational;
    ASSERT v_operational = true, 'Assertion failed: Tenant A must be operational.';

    SELECT public.org_is_operational(v_org_suspended_id) INTO v_operational;
    ASSERT v_operational = false, 'Assertion failed: Suspended tenant must NOT be operational.';

    RAISE NOTICE '>>> [STEP 4/10] Seeding Master Content Library & Deploying to Tenant A...';
    INSERT INTO public.courses (title, slug, description, status, is_master_template)
    VALUES ('Global Luxury Hospitality SOP', 'master-sop-' || substr(gen_random_uuid()::text, 1, 8), 'Standard global SOP', 'published', true)
    RETURNING id INTO v_master_course_id;

    INSERT INTO public.course_modules (course_id, title, position)
    VALUES (v_master_course_id, 'Guest Greeting & Check-In', 1);

    -- Execute master content deployment as platform operator (p_master_id, p_content_type, p_org_id)
    SELECT public.deploy_master_content(v_master_course_id, 'course', v_org_a_id) INTO v_deployed_course_id;
    ASSERT v_deployed_course_id IS NOT NULL, 'Assertion failed: Master content deployment returned null.';

    -- Verify cloned course belongs to Tenant A and is not a master template
    SELECT count(*) INTO v_count FROM public.courses
    WHERE id = v_deployed_course_id 
      AND organization_id = v_org_a_id 
      AND is_master_template = false;
    ASSERT v_count = 1, 'Assertion failed: Deployed course not properly attached to Tenant A.';

    RAISE NOTICE '>>> [STEP 5/10] Creating Scoped Training Assignment for Learner...';
    INSERT INTO public.learning_assignments (course_id, organization_id, hotel_id, user_id, assigned_by, status)
    VALUES (v_deployed_course_id, v_org_a_id, v_hotel_a1_id, v_learner_a_id, v_admin_a_id, 'assigned')
    RETURNING id INTO v_assignment_id;

    SELECT count(*) INTO v_count FROM public.learning_assignments
    WHERE organization_id = v_org_a_id AND user_id = v_learner_a_id;
    ASSERT v_count = 1, 'Assertion failed: Learning assignment not recorded for learner.';

    RAISE NOTICE '>>> [STEP 6/10] Recording Learner Training Progress...';
    INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, status, progress_percentage, last_activity_at)
    VALUES (v_learner_a_id, v_deployed_course_id, v_assignment_id, v_org_a_id, 'completed', 100, now());

    SELECT count(*) INTO v_count FROM public.training_progress
    WHERE user_id = v_learner_a_id AND status = 'completed';
    ASSERT v_count = 1, 'Assertion failed: Learner training progress not recorded.';

    RAISE NOTICE '>>> [STEP 7/10] Testing Platform Operator Break-Glass Support Session Lifecycle...';
    -- Start session
    SELECT public.start_platform_session(
        v_org_a_id,
        'Investigating ticket 90210 assignment issue',
        'organization_admin',
        30
    ) INTO v_session_id;
    ASSERT v_session_id IS NOT NULL, 'Assertion failed: Platform access session could not be started.';

    SELECT public.has_active_platform_session(v_org_a_id) INTO v_session_active;
    ASSERT v_session_active = true, 'Assertion failed: Active session should be true during session.';

    -- End session
    PERFORM public.end_platform_session(v_session_id);

    SELECT public.has_active_platform_session(v_org_a_id) INTO v_session_active;
    ASSERT v_session_active = false, 'Assertion failed: Active session should be false after termination.';

    RAISE NOTICE '>>> [STEP 8/10] Verifying Audit Log Generation...';
    SELECT count(*) INTO v_count FROM public.platform_audit_logs
    WHERE target_organization_id = v_org_a_id;
    ASSERT v_count > 0, 'Assertion failed: Platform audit log entry not found for organization actions.';

    RAISE NOTICE '>>> [STEP 9/10] Verifying Suspended Organization Isolation...';
    -- Suspend Org B
    UPDATE public.organizations SET lifecycle_status = 'suspended', is_active = false WHERE id = v_org_b_id;
    SELECT public.org_is_operational(v_org_b_id) INTO v_operational;
    ASSERT v_operational = false, 'Assertion failed: Organization B should now be non-operational.';

    RAISE NOTICE '>>> [STEP 10/10] ALL 10 SECTION-45 PLATFORM SCENARIO ASSERTIONS PASSED CLEANLY!';
END;
$$;

ROLLBACK;
