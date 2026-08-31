-- ============================================================================
-- Migration: 20260901150000_platform_owner_operations.sql
-- Description: Platform Owner Super Admin Layer, Cross-Tenant Support,
--              Master Content Distribution, and Cross-Tenant Audit Logging.
-- ============================================================================

-- 1. PLATFORM ACCESS SESSIONS (Impersonation / "Act As" Management)
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

-- 2. MASTER CONTENT DEPLOYMENTS (Platform Master Content -> Tenant Distribution Tracking)
CREATE TABLE IF NOT EXISTS public.master_content_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'course', 'training_module', 'document_sop', 'assessment'
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

-- 3. PLATFORM AUDIT LOGS (Cross-Tenant Security Audit Trail)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.platform_access_sessions(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'enter_tenant', 'deploy_course', 'deploy_sop', 'modify_tenant_user', 'change_subscription', 'create_tenant'
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_logs(target_organization_id);

-- 4. MASTER CONTENT LINEAGE COLUMNS ON CORE TABLES
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.training_modules(id) ON DELETE SET NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_master_template boolean DEFAULT false NOT NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS master_source_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL;

-- 5. RLS POLICIES FOR PLATFORM TABLES
ALTER TABLE public.platform_access_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_access_sessions_admin_only" ON public.platform_access_sessions;
CREATE POLICY "platform_access_sessions_admin_only" ON public.platform_access_sessions
FOR ALL USING (
  public.is_platform_super_admin() OR admin_user_id = auth.uid()
);

ALTER TABLE public.master_content_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_content_deployments_policy" ON public.master_content_deployments;
CREATE POLICY "master_content_deployments_policy" ON public.master_content_deployments
FOR ALL USING (
  public.is_platform_super_admin() OR target_organization_id IN (SELECT unnest(public.current_user_organization_ids()))
);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_audit_logs_policy" ON public.platform_audit_logs;
CREATE POLICY "platform_audit_logs_policy" ON public.platform_audit_logs
FOR ALL USING (
  public.is_platform_super_admin()
);
