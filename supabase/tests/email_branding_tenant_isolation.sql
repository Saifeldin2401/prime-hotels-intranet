-- ============================================================================
-- Test Scenario: Multi-Tenant Email & Dynamic Branding Isolation & Resolution
-- File: supabase/tests/email_branding_tenant_isolation.sql
-- ============================================================================

DO $$
DECLARE
  v_org_a_id uuid;
  v_org_b_id uuid;
  v_user_a_id uuid := '641ac54a-7a0d-4bf8-a2d5-46845e0cabdf'::uuid;
  v_context_a jsonb;
  v_context_b jsonb;
  v_context_default jsonb;
  v_can_send_a boolean;
BEGIN
  -- 1. Create Test Tenant A (Custom Branded)
  INSERT INTO public.organizations (
    name, name_ar, slug, logo_url, brand_colors,
    email_sender_name, email_reply_to, support_email, website_url,
    email_footer_text, email_footer_text_ar, is_active, is_deleted
  ) VALUES (
    'Royal Palace Resort', 'منتجع القصر الملكي', 'royal-palace-test-unique',
    'https://cdn.example.com/royal-logo.png',
    '{"primary": "#1E3A8A", "secondary": "#3B82F6", "accent": "#F59E0B"}'::jsonb,
    'Royal Palace Concierge', 'concierge@royalpalace.test', 'support@royalpalace.test',
    'https://www.royalpalace.test', 'Royal Palace Group. Confidential.',
    'مجموعة القصر الملكي. سري ومحمي.', true, false
  ) RETURNING id INTO v_org_a_id;

  -- 2. Create Test Tenant B (Minimal / Default)
  INSERT INTO public.organizations (
    name, slug, is_active, is_deleted
  ) VALUES (
    'Desert Horizon Inn', 'desert-horizon-test-unique', true, false
  ) RETURNING id INTO v_org_b_id;

  -- 3. Create Membership for User A in Tenant A only
  INSERT INTO public.organization_memberships (
    user_id, organization_id, role, is_active
  ) VALUES (
    v_user_a_id, v_org_a_id, 'hotel_admin', true
  );

  -- TEST 1: Tenant A Custom Branding Resolution
  v_context_a := public.get_tenant_email_context(v_org_a_id);
  ASSERT (v_context_a->>'org_name') = 'Royal Palace Resort', 'Test 1 Failed: org_name mismatch';
  ASSERT (v_context_a->>'org_name_ar') = 'منتجع القصر الملكي', 'Test 1 Failed: org_name_ar mismatch';
  ASSERT (v_context_a->>'sender_name') = 'Royal Palace Concierge', 'Test 1 Failed: sender_name mismatch';
  ASSERT (v_context_a->>'reply_to') = 'concierge@royalpalace.test', 'Test 1 Failed: reply_to mismatch';
  ASSERT (v_context_a->'brand_colors'->>'primary') = '#1E3A8A', 'Test 1 Failed: primary color mismatch';
  ASSERT (v_context_a->>'is_custom_branded') = 'true', 'Test 1 Failed: is_custom_branded should be true';

  -- TEST 2: Tenant B Resolution
  v_context_b := public.get_tenant_email_context(v_org_b_id);
  ASSERT (v_context_b->>'org_name') = 'Desert Horizon Inn', 'Test 2 Failed: Tenant B org_name mismatch';
  ASSERT (v_context_b->>'logo_url') = '/altus-emblem-icon.png', 'Test 2 Failed: fallback logo mismatch';
  ASSERT (v_context_b->>'footer_text') = 'All rights reserved.', 'Test 2 Failed: fallback footer mismatch';

  -- TEST 3: Null Tenant Global Fallback Resolution
  v_context_default := public.get_tenant_email_context(NULL);
  ASSERT (v_context_default->>'org_name') = 'Altus Connect', 'Test 3 Failed: Global fallback org_name mismatch';
  ASSERT (v_context_default->'brand_colors'->>'primary') = '#0B1C3E', 'Test 3 Failed: Global fallback primary color mismatch';
  ASSERT (v_context_default->>'is_custom_branded') = 'false', 'Test 3 Failed: is_custom_branded should be false for null org';

  -- TEST 4: Sender Authorization Gate
  v_can_send_a := public.can_send_tenant_email(v_user_a_id, v_org_a_id);
  ASSERT v_can_send_a = true, 'Test 4 Failed: User A should be authorized for Tenant A';

  -- Cleanup test data
  DELETE FROM public.organization_memberships WHERE user_id = v_user_a_id AND organization_id = v_org_a_id;
  DELETE FROM public.organizations WHERE id IN (v_org_a_id, v_org_b_id);

  RAISE NOTICE 'ALL MULTI-TENANT EMAIL & BRANDING DATABASE TESTS PASSED SUCCESSFULLY!';
END $$;
