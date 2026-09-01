-- ==============================================================================
-- THREE-TENANT END-TO-END AUTOMATED ISOLATION & ATTACK TEST
-- ==============================================================================
-- This test runs inside an atomic transaction that is rolled back at the end.
-- It verifies:
--   1. Creation of 3 distinct tenant organizations (Alpha, Beta, Gamma)
--   2. Authoritative dynamic branding resolution (colors, logos, sender identity)
--   3. Email spoofing defense (can_send_tenant_email rejection of foreign orgs)
--   4. Content cloning & multi-tenant course ownership isolation
--   5. Scoped training assignments & progress isolation
--   6. Quota and entitlement independence across tenants
--   7. Suspended tenant immediate access cut-off
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- Organization IDs
    v_org_alpha_id uuid;
    v_org_beta_id uuid;
    v_org_gamma_id uuid;
    
    -- Hotel IDs
    v_hotel_alpha1_id uuid;
    v_hotel_alpha2_id uuid;
    v_hotel_beta1_id uuid;
    v_hotel_gamma1_id uuid;
    
    -- User IDs
    v_user_operator_id uuid := gen_random_uuid();
    v_user_alpha_admin_id uuid := gen_random_uuid();
    v_user_alpha_learner_id uuid := gen_random_uuid();
    v_user_beta_admin_id uuid := gen_random_uuid();
    v_user_beta_learner_id uuid := gen_random_uuid();
    v_user_gamma_admin_id uuid := gen_random_uuid();
    
    -- Content IDs
    v_master_course_id uuid;
    v_alpha_course_id uuid;
    v_beta_course_id uuid;
    v_assignment_id uuid;
    
    -- Verification Variables
    v_email_ctx jsonb;
    v_can_send boolean;
    v_headroom boolean;
    v_operational boolean;
    v_count integer;
BEGIN
    RAISE NOTICE '>>> [STEP 1/7] Provisioning 3 Independent Tenant Organizations & Branding...';

    -- 1. Create Tenant Alpha (Luxury Hotels, Blue Theme)
    INSERT INTO public.organizations (
        name, name_ar, slug, lifecycle_status, max_hotels, max_learners, is_active,
        brand_colors, logo_url, email_sender_name, email_reply_to, support_email, website_url
    ) VALUES (
        'Alpha Luxury Hotels', 'فنادق ألفا الفاخرة', 'alpha-luxury-' || substr(gen_random_uuid()::text, 1, 8),
        'active', 2, 5, true,
        jsonb_build_object('primary', '#1E3A8A', 'secondary', '#1E40AF', 'accent', '#D97706'),
        'https://cdn.example.com/alpha-logo.png',
        'Alpha Luxury Hospitality', 'support@alpha-luxury.com', 'support@alpha-luxury.com', 'https://alpha-luxury.com'
    ) RETURNING id INTO v_org_alpha_id;

    -- 2. Create Tenant Beta (Boutique Hotels, Green Theme)
    INSERT INTO public.organizations (
        name, name_ar, slug, lifecycle_status, max_hotels, max_learners, is_active,
        brand_colors, logo_url, email_sender_name, email_reply_to, support_email, website_url
    ) VALUES (
        'Beta Boutique Collection', 'مجموعة بيتا بوتيك', 'beta-boutique-' || substr(gen_random_uuid()::text, 1, 8),
        'active', 5, 20, true,
        jsonb_build_object('primary', '#047857', 'secondary', '#065F46', 'accent', '#F59E0B'),
        'https://cdn.example.com/beta-logo.png',
        'Beta Boutique Guest Services', 'hello@beta-boutique.com', 'hello@beta-boutique.com', 'https://beta-boutique.com'
    ) RETURNING id INTO v_org_beta_id;

    -- 3. Create Tenant Gamma (Desert Resorts, Amber Theme, Suspended)
    INSERT INTO public.organizations (
        name, name_ar, slug, lifecycle_status, max_hotels, max_learners, is_active,
        brand_colors, logo_url, email_sender_name, email_reply_to, support_email, website_url
    ) VALUES (
        'Gamma Desert Resorts', 'منتجعات جاما الصحراوية', 'gamma-resorts-' || substr(gen_random_uuid()::text, 1, 8),
        'suspended', 3, 10, false,
        jsonb_build_object('primary', '#B45309', 'secondary', '#92400E', 'accent', '#DC2626'),
        'https://cdn.example.com/gamma-logo.png',
        'Gamma Resorts Concierge', 'reservations@gamma-resorts.com', 'reservations@gamma-resorts.com', 'https://gamma-resorts.com'
    ) RETURNING id INTO v_org_gamma_id;

    -- 4. Create Hotel Properties
    INSERT INTO public.hotels (organization_id, name, hotel_code, is_active)
    VALUES 
        (v_org_alpha_id, 'Alpha Riyadh Palace', 'ARP', true) RETURNING id INTO v_hotel_alpha1_id;
    INSERT INTO public.hotels (organization_id, name, hotel_code, is_active)
    VALUES 
        (v_org_alpha_id, 'Alpha Jeddah Bay', 'AJB', true) RETURNING id INTO v_hotel_alpha2_id;
    INSERT INTO public.hotels (organization_id, name, hotel_code, is_active)
    VALUES 
        (v_org_beta_id, 'Beta Boutique Suites', 'BBS', true) RETURNING id INTO v_hotel_beta1_id;
    INSERT INTO public.hotels (organization_id, name, hotel_code, is_active)
    VALUES 
        (v_org_gamma_id, 'Gamma Oasis Resort', 'GOR', false) RETURNING id INTO v_hotel_gamma1_id;

    -- 5. Seed Auth Users
    INSERT INTO auth.users (id, email, aud, role)
    VALUES 
        (v_user_operator_id, 'platform.admin@altus-platform.io', 'authenticated', 'authenticated'),
        (v_user_alpha_admin_id, 'admin@alpha-luxury.com', 'authenticated', 'authenticated'),
        (v_user_alpha_learner_id, 'learner1@alpha-luxury.com', 'authenticated', 'authenticated'),
        (v_user_beta_admin_id, 'admin@beta-boutique.com', 'authenticated', 'authenticated'),
        (v_user_beta_learner_id, 'learner1@beta-boutique.com', 'authenticated', 'authenticated'),
        (v_user_gamma_admin_id, 'admin@gamma-resorts.com', 'authenticated', 'authenticated');

    INSERT INTO public.profiles (id, full_name, email, date_of_birth, is_active)
    VALUES 
        (v_user_operator_id, 'Master Operator', 'platform.admin@altus-platform.io', '1990-01-01', true),
        (v_user_alpha_admin_id, 'Alpha Admin', 'admin@alpha-luxury.com', '1990-01-01', true),
        (v_user_alpha_learner_id, 'Alpha Learner 1', 'learner1@alpha-luxury.com', '1990-01-01', true),
        (v_user_beta_admin_id, 'Beta Admin', 'admin@beta-boutique.com', '1990-01-01', true),
        (v_user_beta_learner_id, 'Beta Learner 1', 'learner1@beta-boutique.com', '1990-01-01', true),
        (v_user_gamma_admin_id, 'Gamma Admin', 'admin@gamma-resorts.com', '1990-01-01', true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        date_of_birth = EXCLUDED.date_of_birth,
        is_active = EXCLUDED.is_active;

    -- Seed Memberships
    INSERT INTO public.platform_users (user_id, is_active) VALUES (v_user_operator_id, true);
    INSERT INTO public.platform_role_assignments (platform_user_id, platform_role) VALUES (v_user_operator_id, 'system_owner');

    INSERT INTO public.organization_memberships (user_id, organization_id, hotel_id, role, is_active)
    VALUES 
        (v_user_alpha_admin_id, v_org_alpha_id, v_hotel_alpha1_id, 'organization_admin', true),
        (v_user_alpha_learner_id, v_org_alpha_id, v_hotel_alpha1_id, 'learner', true),
        (v_user_beta_admin_id, v_org_beta_id, v_hotel_beta1_id, 'organization_admin', true),
        (v_user_beta_learner_id, v_org_beta_id, v_hotel_beta1_id, 'learner', true),
        (v_user_gamma_admin_id, v_org_gamma_id, v_hotel_gamma1_id, 'organization_admin', false);

    RAISE NOTICE '>>> [STEP 2/7] Verifying Authoritative Dynamic Branding Resolution...';
    
    -- Alpha Branding Check
    SELECT public.get_tenant_email_context(v_org_alpha_id) INTO v_email_ctx;
    ASSERT (v_email_ctx->>'is_custom_branded')::boolean = true, 'Assertion failed: Alpha must be custom branded.';
    ASSERT (v_email_ctx->>'org_name') = 'Alpha Luxury Hotels', 'Assertion failed: Alpha org_name mismatch.';
    ASSERT (v_email_ctx->'brand_colors'->>'primary') = '#1E3A8A', 'Assertion failed: Alpha primary color mismatch.';
    ASSERT (v_email_ctx->>'logo_url') = 'https://cdn.example.com/alpha-logo.png', 'Assertion failed: Alpha logo mismatch.';
    ASSERT (v_email_ctx->>'sender_name') = 'Alpha Luxury Hospitality', 'Assertion failed: Alpha sender name mismatch.';

    -- Beta Branding Check
    SELECT public.get_tenant_email_context(v_org_beta_id) INTO v_email_ctx;
    ASSERT (v_email_ctx->>'is_custom_branded')::boolean = true, 'Assertion failed: Beta must be custom branded.';
    ASSERT (v_email_ctx->>'org_name') = 'Beta Boutique Collection', 'Assertion failed: Beta org_name mismatch.';
    ASSERT (v_email_ctx->'brand_colors'->>'primary') = '#047857', 'Assertion failed: Beta primary color mismatch.';
    ASSERT (v_email_ctx->>'logo_url') = 'https://cdn.example.com/beta-logo.png', 'Assertion failed: Beta logo mismatch.';
    ASSERT (v_email_ctx->>'sender_name') = 'Beta Boutique Guest Services', 'Assertion failed: Beta sender name mismatch.';

    -- Fallback Default Check
    SELECT public.get_tenant_email_context(NULL) INTO v_email_ctx;
    ASSERT (v_email_ctx->>'is_custom_branded')::boolean = false, 'Assertion failed: Null org must be unbranded fallback.';
    ASSERT (v_email_ctx->>'org_name') = 'Altus Connect', 'Assertion failed: Fallback name mismatch.';

    RAISE NOTICE '>>> [STEP 3/7] Verifying Cross-Tenant Email Authorization (can_send_tenant_email)...';
    
    -- Alpha Admin sending for Alpha -> Allowed
    SELECT public.can_send_tenant_email(v_user_alpha_admin_id, v_org_alpha_id) INTO v_can_send;
    ASSERT v_can_send = true, 'Assertion failed: Alpha Admin must be allowed to send for Alpha.';

    -- Alpha Admin attempting to send for Beta -> REJECTED
    SELECT public.can_send_tenant_email(v_user_alpha_admin_id, v_org_beta_id) INTO v_can_send;
    ASSERT v_can_send = false, 'Assertion failed: Alpha Admin must NOT be allowed to send for Beta.';

    -- Beta Admin attempting to send for Alpha -> REJECTED
    SELECT public.can_send_tenant_email(v_user_beta_admin_id, v_org_alpha_id) INTO v_can_send;
    ASSERT v_can_send = false, 'Assertion failed: Beta Admin must NOT be allowed to send for Alpha.';

    -- Gamma Admin attempting to send for Suspended Gamma -> REJECTED
    SELECT public.can_send_tenant_email(v_user_gamma_admin_id, v_org_gamma_id) INTO v_can_send;
    ASSERT v_can_send = false, 'Assertion failed: Gamma Admin must NOT be allowed to send for suspended Gamma.';

    -- Platform Operator -> Allowed across all operational tenants
    SELECT public.can_send_tenant_email(v_user_operator_id, v_org_alpha_id) INTO v_can_send;
    ASSERT v_can_send = true, 'Assertion failed: Platform operator must be allowed for Alpha.';

    RAISE NOTICE '>>> [STEP 4/7] Verifying Content Deployment & Multi-Tenant Course Isolation...';
    
    -- Seed Master Template Course
    INSERT INTO public.courses (title, slug, description, status, is_master_template)
    VALUES ('VIP Concierge Protocols', 'master-vip-' || substr(gen_random_uuid()::text, 1, 8), 'Global Master', 'published', true)
    RETURNING id INTO v_master_course_id;

    -- Deploy to Alpha and Beta
    PERFORM set_config('request.jwt.claim.sub', v_user_operator_id::text, true);
    SELECT public.deploy_master_content(v_master_course_id, 'course', v_org_alpha_id) INTO v_alpha_course_id;
    SELECT public.deploy_master_content(v_master_course_id, 'course', v_org_beta_id) INTO v_beta_course_id;

    ASSERT v_alpha_course_id IS NOT NULL AND v_beta_course_id IS NOT NULL, 'Assertion failed: Cloned course IDs null.';
    ASSERT v_alpha_course_id <> v_beta_course_id, 'Assertion failed: Cloned courses must have distinct IDs.';

    -- Verify Alpha course belongs to Alpha only
    SELECT count(*) INTO v_count FROM public.courses WHERE id = v_alpha_course_id AND organization_id = v_org_alpha_id;
    ASSERT v_count = 1, 'Assertion failed: Alpha course organization mismatch.';

    SELECT count(*) INTO v_count FROM public.courses WHERE id = v_alpha_course_id AND organization_id = v_org_beta_id;
    ASSERT v_count = 0, 'Assertion failed: Alpha course leaked to Beta.';

    RAISE NOTICE '>>> [STEP 5/7] Verifying Scoped Training Assignments & Progress Isolation...';
    
    -- Assign Alpha Course to Alpha Learner
    INSERT INTO public.learning_assignments (course_id, organization_id, hotel_id, user_id, assigned_by, status)
    VALUES (v_alpha_course_id, v_org_alpha_id, v_hotel_alpha1_id, v_user_alpha_learner_id, v_user_alpha_admin_id, 'assigned')
    RETURNING id INTO v_assignment_id;

    -- Record Learner Progress
    INSERT INTO public.training_progress (user_id, training_id, assignment_id, organization_id, status, progress_percentage, last_activity_at)
    VALUES (v_user_alpha_learner_id, v_alpha_course_id, v_assignment_id, v_org_alpha_id, 'completed', 100, now());

    -- Verify Beta Learner has 0 progress rows for Alpha Course
    SELECT count(*) INTO v_count FROM public.training_progress
    WHERE user_id = v_user_beta_learner_id AND training_id = v_alpha_course_id;
    ASSERT v_count = 0, 'Assertion failed: Progress leaked across tenants.';

    RAISE NOTICE '>>> [STEP 6/7] Verifying Independent Quota Enforcements...';
    
    -- Alpha has 2 hotels out of 2 allowed -> NO hotel headroom
    SELECT public.check_entitlement(v_org_alpha_id, 'hotel') INTO v_headroom;
    ASSERT v_headroom = false, 'Assertion failed: Alpha must have 0 hotel headroom.';

    -- Beta has 1 hotel out of 5 allowed -> HAS hotel headroom
    SELECT public.check_entitlement(v_org_beta_id, 'hotel') INTO v_headroom;
    ASSERT v_headroom = true, 'Assertion failed: Beta must have hotel headroom.';

    RAISE NOTICE '>>> [STEP 7/7] Verifying Suspended Tenant Immediate Operational Cut-off...';
    
    SELECT public.org_is_operational(v_org_alpha_id) INTO v_operational;
    ASSERT v_operational = true, 'Assertion failed: Alpha must be operational.';

    SELECT public.org_is_operational(v_org_gamma_id) INTO v_operational;
    ASSERT v_operational = false, 'Assertion failed: Suspended Gamma must NOT be operational.';

    RAISE NOTICE '>>> ALL 7 THREE-TENANT ISOLATION AND ATTACK ASSERTIONS PASSED CLEANLY!';
END;
$$;

ROLLBACK;
