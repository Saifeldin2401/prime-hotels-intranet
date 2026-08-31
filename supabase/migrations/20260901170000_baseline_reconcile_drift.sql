-- ============================================================================
-- Migration: 20260901170000_baseline_reconcile_drift.sql
-- Purpose:   Idempotent BASELINE RECONCILIATION for the four multi-tenant
--            migrations (20260901130000 / 140000 / 150000 / 160000) that were
--            applied to the live project (dhbfaclkfysqwfppuxxa) OUT OF BAND and
--            are either unrecorded or recorded under a mismatched version stamp
--            in supabase_migrations.schema_migrations.
--
-- Guarantees:
--   * Running this against the CURRENT live DB is a complete no-op
--     (every statement is CREATE ... IF NOT EXISTS / CREATE OR REPLACE /
--      ADD COLUMN IF NOT EXISTS / DROP ... IF EXISTS / INSERT ... ON CONFLICT).
--   * Running this on a fresh DB that has replayed migration history through
--     20260831064429 reproduces the live schema for every object the four
--     migrations touched.
--
-- Deliberate omission: section 9 of 20260901140000 (the first-generation
--   "*_tenant_isolation" RLS policies on documents / training_modules /
--   courses / assessments / unified_questions) is NOT reproduced here because
--   it was never applied to live and is fully superseded by the Part D
--   ("multitenant_*") policy set -- EXCEPT training_modules, which Part D never
--   covered. See drift-reconciliation.md section 4c.
-- ============================================================================

BEGIN;

-- ###########################################################################
-- PART A -- from 20260901130000_purge_legacy_database_tables.sql
-- Legacy-domain teardown. All targets already absent on live => no-op.
-- ###########################################################################

DROP VIEW IF EXISTS public.media_access_logs_v CASCADE;

DROP TABLE IF EXISTS public.fiscal_period_closes CASCADE;
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.tax_returns CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.expense_claims CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.eosb_calculations CASCADE;
DROP TABLE IF EXISTS public.payslips CASCADE;
DROP TABLE IF EXISTS public.salary_components CASCADE;

DROP TABLE IF EXISTS public.po_receipts CASCADE;
DROP TABLE IF EXISTS public.goods_received_notes CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.purchase_requests CASCADE;
DROP TABLE IF EXISTS public.supplier_scorecards CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

DROP TABLE IF EXISTS public.capex_expenditures CASCADE;
DROP TABLE IF EXISTS public.capex_milestones CASCADE;
DROP TABLE IF EXISTS public.capex_project_templates CASCADE;
DROP TABLE IF EXISTS public.capex_projects CASCADE;
DROP TABLE IF EXISTS public.housekeeping_dispatch CASCADE;
DROP TABLE IF EXISTS public.housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS public.maintenance_attachments CASCADE;
DROP TABLE IF EXISTS public.maintenance_comments CASCADE;
DROP TABLE IF EXISTS public.maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.maintenance_sla_policies CASCADE;
DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
DROP TABLE IF EXISTS public.preventive_maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.pre_opening_checklist_items CASCADE;
DROP TABLE IF EXISTS public.room_inspections CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.logbook_entries CASCADE;
DROP TABLE IF EXISTS public.lost_found_items CASCADE;
DROP TABLE IF EXISTS public.vip_guest_preferences CASCADE;
DROP TABLE IF EXISTS public.vip_guests CASCADE;

DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.employee_promotions CASCADE;
DROP TABLE IF EXISTS public.employee_referrals CASCADE;
DROP TABLE IF EXISTS public.employee_transfers CASCADE;
DROP TABLE IF EXISTS public.eom_auto_selections CASCADE;
DROP TABLE IF EXISTS public.eom_automation_config CASCADE;
DROP TABLE IF EXISTS public.eom_scoring_history CASCADE;
DROP TABLE IF EXISTS public.feed_comments CASCADE;
DROP TABLE IF EXISTS public.feed_reactions CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.job_postings CASCADE;
DROP TABLE IF EXISTS public.job_title_role_mappings CASCADE;
DROP TABLE IF EXISTS public.job_titles CASCADE;
DROP TABLE IF EXISTS public.kudos_likes CASCADE;
DROP TABLE IF EXISTS public.kudos CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;
DROP TABLE IF EXISTS public.onboarding_tasks CASCADE;
DROP TABLE IF EXISTS public.onboarding_templates CASCADE;
DROP TABLE IF EXISTS public.onboarding_process CASCADE;
DROP TABLE IF EXISTS public.partner_briefing_requests CASCADE;
DROP TABLE IF EXISTS public.performance_reviews CASCADE;
DROP TABLE IF EXISTS public.referral_history CASCADE;
DROP TABLE IF EXISTS public.saudization_nitaqat_snapshots CASCADE;
DROP TABLE IF EXISTS public.user_vacation_balance CASCADE;
DROP TABLE IF EXISTS public.hospitality_news CASCADE;
DROP TABLE IF EXISTS public.user_companies CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

DROP TABLE IF EXISTS public.escalation_rules CASCADE;
DROP TABLE IF EXISTS public.workflow_steps CASCADE;
DROP TABLE IF EXISTS public.workflow_schedules CASCADE;
DROP TABLE IF EXISTS public.workflow_executions CASCADE;
DROP TABLE IF EXISTS public.workflow_definitions CASCADE;
DROP TABLE IF EXISTS public.approval_history CASCADE;
DROP TABLE IF EXISTS public.approval_requests CASCADE;
DROP TABLE IF EXISTS public.delegations CASCADE;
DROP TABLE IF EXISTS public.request_attachments CASCADE;
DROP TABLE IF EXISTS public.request_comments CASCADE;
DROP TABLE IF EXISTS public.request_events CASCADE;
DROP TABLE IF EXISTS public.request_sla_policies CASCADE;
DROP TABLE IF EXISTS public.request_steps CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.guest_requests CASCADE;

DROP TABLE IF EXISTS public.audit_findings CASCADE;
DROP TABLE IF EXISTS public.audit_items CASCADE;
DROP TABLE IF EXISTS public.audit_runs CASCADE;
DROP TABLE IF EXISTS public.audit_templates CASCADE;

DROP TABLE IF EXISTS public.media_collection_items CASCADE;
DROP TABLE IF EXISTS public.media_collections CASCADE;
DROP TABLE IF EXISTS public.media_asset_usages CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;

-- Legacy function teardown. NOTE: the signatures below match the ORIGINAL
-- purge migration. On live these signatures no longer match the surviving
-- overloads (which drifted), so -- exactly as on live today -- these are
-- no-ops and the drifted overloads remain. The corrected drop list lives in
-- drift-reconciliation.md section 4c and is intentionally NOT executed here.
DROP FUNCTION IF EXISTS public.apply_maintenance_sla() CASCADE;
DROP FUNCTION IF EXISTS public.apply_promotion(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.apply_request_priority_default() CASCADE;
DROP FUNCTION IF EXISTS public.apply_request_step_sla() CASCADE;
DROP FUNCTION IF EXISTS public.apply_transfer(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.approve_eom_selection(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.approve_leave_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.assign_maintenance_ticket(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.attendance_check_in(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.attendance_check_out(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_delete_media_storage() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_eom_score(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_leave(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_purchase_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_feed_item(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_approvals() CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_maintenance() CASCADE;
DROP FUNCTION IF EXISTS public.check_and_escalate_requests() CASCADE;
DROP FUNCTION IF EXISTS public.complete_maintenance_ticket(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_request_for_invoice() CASCADE;
DROP FUNCTION IF EXISTS public.create_request_for_leave_request() CASCADE;
DROP FUNCTION IF EXISTS public.decide_purchase_request(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.decrement_media_usage_count() CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_expense_receipt_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_maintenance_attachment_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_media_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_secure_payslip_url(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_vacation_balance(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_media_usage_count() CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_capex_project_spent_amount() CASCADE;
DROP FUNCTION IF EXISTS public.reject_leave_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.replace_workflow_steps(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.run_eom_calculation(text) CASCADE;
DROP FUNCTION IF EXISTS public.search_media_assets(text, uuid, text, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.set_media_download_headers() CASCADE;
DROP FUNCTION IF EXISTS public.submit_expense_claim(uuid, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_promotion_request(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_transfer_request(uuid, uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_leave_request_status() CASCADE;
DROP FUNCTION IF EXISTS public.sync_lms_to_onboarding() CASCADE;
DROP FUNCTION IF EXISTS public.sync_request_due_at() CASCADE;
DROP FUNCTION IF EXISTS public.toggle_kudos_like(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_maintenance_tickets_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_shifts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_workflow_updated_at() CASCADE;


-- ###########################################################################
-- PART B -- from 20260901140000_multitenant_enterprise_saas.sql (sections 1-8)
-- Tenant tables, seed rows, scoping columns, security helper functions.
-- Section 9 (first-gen RLS) intentionally omitted -- see header.
-- ###########################################################################

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  slug text UNIQUE NOT NULL,
  logo_url text,
  favicon_url text,
  brand_colors jsonb DEFAULT '{"primary": "#1e293b", "secondary": "#0284c7", "accent": "#f59e0b"}'::jsonb,
  industry text DEFAULT 'hospitality' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  max_users integer DEFAULT 100 NOT NULL,
  max_hotels integer DEFAULT 10 NOT NULL,
  max_storage_gb integer DEFAULT 50 NOT NULL,
  ai_monthly_quota_usd numeric(10,2) DEFAULT 100.00 NOT NULL,
  features jsonb DEFAULT '{"custom_branding": true, "ai_generation": true, "api_access": true, "advanced_analytics": true}'::jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  current_period_start timestamptz DEFAULT now() NOT NULL,
  current_period_end timestamptz DEFAULT (now() + interval '1 year') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(organization_id)
);

INSERT INTO public.subscription_plans (id, name, code, max_users, max_hotels, max_storage_gb, ai_monthly_quota_usd, features)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Enterprise Plan', 'enterprise', 10000, 500, 500, 1000.00, '{"custom_branding": true, "ai_generation": true, "api_access": true, "advanced_analytics": true}'::jsonb),
  ('a0000000-0000-0000-0000-000000000002', 'Growth Plan', 'growth', 500, 25, 100, 250.00, '{"custom_branding": true, "ai_generation": true, "api_access": false, "advanced_analytics": true}'::jsonb),
  ('a0000000-0000-0000-0000-000000000003', 'Starter Plan', 'starter', 50, 5, 20, 50.00, '{"custom_branding": false, "ai_generation": true, "api_access": false, "advanced_analytics": false}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.organizations (id, name, name_ar, slug, brand_colors, industry)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'PRIME Hospitality Group',
  'مجموعة فنادق برايم',
  'prime-hospitality',
  '{"primary": "#0f172a", "secondary": "#2563eb", "accent": "#d97706"}'::jsonb,
  'hospitality'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.subscriptions (organization_id, plan_id, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'active'
)
ON CONFLICT (organization_id) DO NOTHING;

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.brands SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL DEFAULT 'e0000000-0000-0000-0000-000000000001',
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_ar text,
  hotel_code text,
  city text,
  country text DEFAULT 'Saudi Arabia',
  address text,
  phone text,
  is_headquarters boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- properties-dependent backfill: guarded so it is inert if/when properties is dropped
DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    INSERT INTO public.hotels (id, organization_id, brand_id, name, hotel_code, city, country, address, phone, is_headquarters, is_active, is_deleted, created_at)
    SELECT
      id,
      'e0000000-0000-0000-0000-000000000001'::uuid,
      brand_id,
      name,
      property_code,
      city,
      COALESCE(country, 'Saudi Arabia'),
      address,
      phone,
      COALESCE(is_headquarters, false),
      COALESCE(is_active, true),
      COALESCE(is_deleted, false),
      COALESCE(created_at, now())
    FROM public.properties
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
    UPDATE public.properties SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'learner' NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT true NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_membership_unique
ON public.organization_memberships(organization_id, user_id, COALESCE(hotel_id, '00000000-0000-0000-0000-000000000000'::uuid));

INSERT INTO public.organization_memberships (organization_id, user_id, role, is_primary)
SELECT
  'e0000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  CASE
    WHEN ur.role = 'super_admin' THEN 'organization_admin'
    WHEN ur.role = 'admin' THEN 'organization_admin'
    WHEN ur.role = 'manager' THEN 'department_manager'
    ELSE 'learner'
  END,
  true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ON CONFLICT DO NOTHING;

-- Scoping columns on core tables
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.departments SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='property_id') THEN
    UPDATE public.departments SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.documents SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='property_id') THEN
    UPDATE public.documents SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.training_modules SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='training_modules' AND column_name='property_id') THEN
    UPDATE public.training_modules SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.courses SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='courses' AND column_name='property_id') THEN
    UPDATE public.courses SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.assessments SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.unified_questions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.unified_questions ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.unified_questions ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.unified_questions SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.question_banks SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.certificates SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='certificates' AND column_name='property_id') THEN
    UPDATE public.certificates SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.announcements SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements' AND column_name='property_id') THEN
    UPDATE public.announcements SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
    UPDATE public.tasks SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='property_id') THEN
      UPDATE public.tasks SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Security helper functions (140 section 8). Part D refreshes these with
-- SET search_path -- kept here so a fresh DB has them even without Part D.
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT organization_id FROM public.organization_memberships
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_organization_access(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (
    public.is_platform_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
    )
  );
$$;


-- ###########################################################################
-- PART C -- from 20260901150000_platform_owner_operations.sql
-- Already recorded on live as version 20260831054620; reproduced idempotently
-- so this baseline is self-contained. No-op on live.
-- ###########################################################################

CREATE TABLE IF NOT EXISTS public.platform_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  acting_role text DEFAULT 'organization_admin' NOT NULL,
  access_reason text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.master_content_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  master_content_id uuid NOT NULL,
  target_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  target_content_id uuid NOT NULL,
  deployed_version integer DEFAULT 1 NOT NULL,
  current_master_version integer DEFAULT 1 NOT NULL,
  has_update_available boolean DEFAULT false NOT NULL,
  deployed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deployed_at timestamptz DEFAULT now() NOT NULL,
  last_synced_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_master_deployments_org ON public.master_content_deployments(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_master_deployments_master ON public.master_content_deployments(master_content_id);

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.platform_access_sessions(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_logs(target_organization_id);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.training_modules(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL;

ALTER TABLE public.platform_access_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_access_sessions_admin_only" ON public.platform_access_sessions;
CREATE POLICY "platform_access_sessions_admin_only" ON public.platform_access_sessions
FOR ALL USING (public.is_platform_super_admin() OR admin_user_id = auth.uid());

ALTER TABLE public.master_content_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_content_deployments_policy" ON public.master_content_deployments;
CREATE POLICY "master_content_deployments_policy" ON public.master_content_deployments
FOR ALL USING (public.is_platform_super_admin() OR target_organization_id IN (SELECT unnest(public.current_user_organization_ids())));

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_audit_logs_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_policy" ON public.platform_audit_logs
FOR ALL USING (public.is_platform_super_admin());


-- ###########################################################################
-- PART D -- from 20260901160000_multitenant_rls_lockdown.sql (verbatim body)
-- This is the authoritative live RLS state. Fully idempotent already.
-- ###########################################################################

CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND is_active = true
    ),
    '{}'::uuid[]
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_platform_session(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_access_sessions
    WHERE admin_user_id = auth.uid()
      AND target_organization_id = p_org_id
      AND is_active = true
      AND (ended_at IS NULL OR ended_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
        AND role IN ('organization_owner', 'organization_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_content_editor(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_super_admin()
    OR public.has_active_platform_session(p_org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE user_id = auth.uid() AND organization_id = p_org_id AND is_active = true
        AND role IN ('organization_owner', 'organization_admin', 'training_manager', 'knowledge_manager', 'author', 'instructor')
    );
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_tenant_isolation_select" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_select" ON public.organizations
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(id)
);
DROP POLICY IF EXISTS "organizations_tenant_isolation_admin" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_admin" ON public.organizations
FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(id));

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_tenant_isolation_select" ON public.brands;
CREATE POLICY "brands_tenant_isolation_select" ON public.brands
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);
DROP POLICY IF EXISTS "brands_tenant_isolation_admin" ON public.brands;
CREATE POLICY "brands_tenant_isolation_admin" ON public.brands
FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id));

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_tenant_isolation_select" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_select" ON public.hotels
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);
DROP POLICY IF EXISTS "hotels_tenant_isolation_admin" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_admin" ON public.hotels
FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id));

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_tenant_isolation_select" ON public.departments;
CREATE POLICY "departments_tenant_isolation_select" ON public.departments
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR organization_id IS NULL
  OR public.has_active_platform_session(organization_id)
);
DROP POLICY IF EXISTS "departments_tenant_isolation_admin" ON public.departments;
CREATE POLICY "departments_tenant_isolation_admin" ON public.departments
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin()
  OR (organization_id IS NOT NULL AND public.is_tenant_admin(organization_id))
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_memberships_tenant_isolation_select" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_select" ON public.organization_memberships
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR user_id = auth.uid()
  OR organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
);
DROP POLICY IF EXISTS "org_memberships_tenant_isolation_admin" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_admin" ON public.organization_memberships
FOR ALL TO authenticated
USING (public.is_platform_super_admin() OR public.is_tenant_admin(organization_id));

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_documents_select ON public.documents;
DROP POLICY IF EXISTS p5_documents_insert ON public.documents;
DROP POLICY IF EXISTS p5_documents_update ON public.documents;
DROP POLICY IF EXISTS p5_documents_delete ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_select ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_insert ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_update ON public.documents;
DROP POLICY IF EXISTS multitenant_documents_delete ON public.documents;
CREATE POLICY "multitenant_documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (status = 'PUBLISHED' OR created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
    )
  )
);
CREATE POLICY "multitenant_documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (is_master_template = true AND public.is_platform_super_admin())
    OR (
      organization_id IS NOT NULL
      AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND public.is_tenant_content_editor(organization_id)
    )
  )
);
CREATE POLICY "multitenant_documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);
CREATE POLICY "multitenant_documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_select ON public.courses;
DROP POLICY IF EXISTS courses_write ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_select ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_insert ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_update ON public.courses;
DROP POLICY IF EXISTS multitenant_courses_delete ON public.courses;
CREATE POLICY "multitenant_courses_select" ON public.courses
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (status = 'published' OR created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
    )
  )
);
CREATE POLICY "multitenant_courses_insert" ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);
CREATE POLICY "multitenant_courses_update" ON public.courses
FOR UPDATE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);
CREATE POLICY "multitenant_courses_delete" ON public.courses
FOR DELETE TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_modules_select ON public.course_modules;
DROP POLICY IF EXISTS course_modules_write ON public.course_modules;
DROP POLICY IF EXISTS multitenant_course_modules_select ON public.course_modules;
DROP POLICY IF EXISTS multitenant_course_modules_write ON public.course_modules;
CREATE POLICY "multitenant_course_modules_select" ON public.course_modules
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id));
CREATE POLICY "multitenant_course_modules_write" ON public.course_modules
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
      AND ((c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id)))
  )
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_select ON public.lessons;
DROP POLICY IF EXISTS lessons_write ON public.lessons;
DROP POLICY IF EXISTS multitenant_lessons_select ON public.lessons;
DROP POLICY IF EXISTS multitenant_lessons_write ON public.lessons;
CREATE POLICY "multitenant_lessons_select" ON public.lessons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
  )
);
CREATE POLICY "multitenant_lessons_write" ON public.lessons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = lessons.course_module_id
      AND ((c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id)))
  )
);

ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_blocks_select ON public.lesson_blocks;
DROP POLICY IF EXISTS lesson_blocks_write ON public.lesson_blocks;
DROP POLICY IF EXISTS multitenant_lesson_blocks_select ON public.lesson_blocks;
DROP POLICY IF EXISTS multitenant_lesson_blocks_write ON public.lesson_blocks;
CREATE POLICY "multitenant_lesson_blocks_select" ON public.lesson_blocks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.course_module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
  )
);
CREATE POLICY "multitenant_lesson_blocks_write" ON public.lesson_blocks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.course_module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND ((c.is_master_template = true AND public.is_platform_super_admin())
        OR (c.organization_id IS NOT NULL AND public.is_tenant_content_editor(c.organization_id)))
  )
);

ALTER TABLE public.unified_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p5_unified_questions_select ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_insert ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_update ON public.unified_questions;
DROP POLICY IF EXISTS p5_unified_questions_delete ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_select ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_insert ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_update ON public.unified_questions;
DROP POLICY IF EXISTS multitenant_unified_questions_delete ON public.unified_questions;
CREATE POLICY "multitenant_unified_questions_select" ON public.unified_questions
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR (organization_id IS NULL AND is_master_template IS TRUE)
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (status = 'published' OR created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);
CREATE POLICY "multitenant_unified_questions_insert" ON public.unified_questions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (organization_id IS NULL AND public.is_platform_super_admin())
    OR (
      organization_id IS NOT NULL
      AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND public.is_tenant_content_editor(organization_id)
    )
  )
);
CREATE POLICY "multitenant_unified_questions_update" ON public.unified_questions
FOR UPDATE TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
)
WITH CHECK (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND (created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
  )
);
CREATE POLICY "multitenant_unified_questions_delete" ON public.unified_questions
FOR DELETE TO authenticated
USING (
  (organization_id IS NULL AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_admin(organization_id)
  )
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assessments_select ON public.assessments;
DROP POLICY IF EXISTS assessments_write ON public.assessments;
DROP POLICY IF EXISTS multitenant_assessments_select ON public.assessments;
DROP POLICY IF EXISTS multitenant_assessments_write ON public.assessments;
CREATE POLICY "multitenant_assessments_select" ON public.assessments
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, false) = false
  AND (
    public.is_platform_super_admin()
    OR (is_master_template = true)
    OR (
      (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
      AND (status = 'published' OR created_by = auth.uid() OR public.is_tenant_content_editor(organization_id))
    )
  )
);
CREATE POLICY "multitenant_assessments_write" ON public.assessments
FOR ALL TO authenticated
USING (
  (is_master_template = true AND public.is_platform_super_admin())
  OR (
    organization_id IS NOT NULL
    AND (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_update ON public.enrollments;
DROP POLICY IF EXISTS enrollments_delete ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_insert ON public.enrollments;
DROP POLICY IF EXISTS multitenant_enrollments_update ON public.enrollments;
CREATE POLICY "multitenant_enrollments_select" ON public.enrollments
FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin()
  OR user_id = auth.uid()
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);
CREATE POLICY "multitenant_enrollments_insert" ON public.enrollments
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
  OR public.has_active_platform_session(organization_id)
  OR public.is_platform_super_admin()
);
CREATE POLICY "multitenant_enrollments_update" ON public.enrollments
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (
    (organization_id IN (SELECT unnest(public.current_user_organization_ids())) OR public.has_active_platform_session(organization_id))
    AND public.is_tenant_content_editor(organization_id)
  )
);

COMMIT;
