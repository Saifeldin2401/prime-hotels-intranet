-- ============================================================================
-- Migration: 20260901140000_multitenant_enterprise_saas.sql
-- Description: Multi-Tenant Enterprise SaaS Architecture
-- Platform -> Organization/Tenant -> Brands -> Hotels -> Departments -> Users
-- ============================================================================

-- 1. ORGANIZATIONS (TENANTS)
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

-- 2. SUBSCRIPTION PLANS & SUBSCRIPTIONS
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
  status text DEFAULT 'active' NOT NULL, -- active, trialing, past_due, canceled
  current_period_start timestamptz DEFAULT now() NOT NULL,
  current_period_end timestamptz DEFAULT (now() + interval '1 year') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(organization_id)
);

-- 3. SEED DEFAULT ENTERPRISE ORGANIZATION & SUBSCRIPTION PLAN
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

-- 4. UPDATE BRANDS TABLE
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.brands SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 5. HOTELS TABLE (Evolved Location/Operating Unit Model)
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

-- Migrate any existing properties to hotels table
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

-- Add organization_id to properties as well during backwards-compatible transition
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
UPDATE public.properties SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 6. ORGANIZATION MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'learner' NOT NULL, -- organization_admin, training_manager, knowledge_manager, brand_admin, hotel_admin, department_manager, instructor, learner
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

-- Migrate existing profiles into organization_memberships for default organization
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

-- 7. ATTACH MULTI-TENANCY & SCOPING COLUMNS TO CORE TABLES

-- Departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.departments SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.departments SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

-- Documents (Knowledge Base)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL; -- organization, brand, hotel, department, role
UPDATE public.documents SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.documents SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

-- Training Modules & Courses
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.training_modules SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.training_modules SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'organization' NOT NULL;
UPDATE public.courses SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.courses SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

-- Assessments & Quizzes & Questions
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

-- Certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.certificates SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.certificates SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

-- Announcements & Tasks
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.announcements SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.announcements SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'e0000000-0000-0000-0000-000000000001';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL;
UPDATE public.tasks SET organization_id = 'e0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.tasks SET hotel_id = property_id WHERE hotel_id IS NULL AND property_id IS NOT NULL;

-- 8. RLS SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT organization_id 
    FROM public.organization_memberships 
    WHERE user_id = auth.uid() 
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_organization_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    public.is_platform_super_admin() OR 
    EXISTS (
      SELECT 1 
      FROM public.organization_memberships 
      WHERE user_id = auth.uid() 
        AND organization_id = p_org_id 
        AND is_active = true
    )
  );
$$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES FOR STRICT TENANT ISOLATION
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_tenant_isolation_select" ON public.organizations;
CREATE POLICY "organizations_tenant_isolation_select" ON public.organizations
FOR SELECT USING (
  is_platform_super_admin() OR
  id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_tenant_isolation_select" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation_select" ON public.hotels
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_memberships_tenant_isolation_select" ON public.organization_memberships;
CREATE POLICY "org_memberships_tenant_isolation_select" ON public.organization_memberships
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_tenant_isolation" ON public.documents;
CREATE POLICY "documents_tenant_isolation" ON public.documents
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_modules_tenant_isolation" ON public.training_modules;
CREATE POLICY "training_modules_tenant_isolation" ON public.training_modules
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_tenant_isolation" ON public.courses;
CREATE POLICY "courses_tenant_isolation" ON public.courses
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessments_tenant_isolation" ON public.assessments;
CREATE POLICY "assessments_tenant_isolation" ON public.assessments
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.unified_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unified_questions_tenant_isolation" ON public.unified_questions;
CREATE POLICY "unified_questions_tenant_isolation" ON public.unified_questions
FOR ALL USING (
  is_platform_super_admin() OR
  organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);
