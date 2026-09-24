-- ============================================================================
-- Migration: 20260901251000_multitenant_email_and_branding.sql
-- Multi-Tenant Email & Dynamic Branding Architecture
-- 1. Enrich organizations with authoritative email branding fields
-- 2. Add organization_id to notification tracking and queue tables
-- 3. Create get_tenant_email_context() and can_send_tenant_email() RPCs
-- ============================================================================

-- 1. Enrich organizations with email branding fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_sender_name text,
  ADD COLUMN IF NOT EXISTS email_reply_to text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS email_footer_text text,
  ADD COLUMN IF NOT EXISTS email_footer_text_ar text;

-- 2. Add organization_id to notification tables for tenant telemetry & auditability
ALTER TABLE public.notification_delivery_events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_delivery_events_org
  ON public.notification_delivery_events(organization_id);

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_queue_org
  ON public.notification_queue(organization_id);

-- 3. Create authoritative get_tenant_email_context RPC with safe platform fallbacks
CREATE OR REPLACE FUNCTION public.get_tenant_email_context(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

-- 4. Create can_send_tenant_email security check
CREATE OR REPLACE FUNCTION public.can_send_tenant_email(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- If no specific org is requested or caller is a platform operator, allow
  IF p_org_id IS NULL OR public.is_platform_operator(p_user_id) THEN
    RETURN true;
  END IF;

  -- Otherwise, caller must be an active member of that tenant with operational status
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = p_user_id
      AND om.organization_id = p_org_id
      AND om.is_active = true
      AND public.org_is_operational(p_org_id)
  );
END;
$function$;
