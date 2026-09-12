-- Migration: Guided Wizard and Onboarding System
-- Creates wizard_definitions and wizard_user_progress tables, RLS policies, and RPC helper functions.

-- 1. Create wizard_definitions table
CREATE TABLE IF NOT EXISTS public.wizard_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT NOT NULL,
  target_level TEXT NOT NULL CHECK (target_level IN ('platform', 'tenant', 'operational')),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create wizard_user_progress table
CREATE TABLE IF NOT EXISTS public.wizard_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  wizard_id TEXT NOT NULL REFERENCES public.wizard_definitions(id) ON DELETE CASCADE,
  wizard_version INTEGER NOT NULL DEFAULT 1,
  role_at_onboarding TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'skipped', 'completed', 'reset', 'required')),
  current_step_index INTEGER NOT NULL DEFAULT 0,
  completed_step_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  skipped_step_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed_contextual_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & unique tenant-user constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_wizard_user_progress_user_org_wizard 
  ON public.wizard_user_progress (user_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), wizard_id);

CREATE INDEX IF NOT EXISTS idx_wizard_user_progress_user_id 
  ON public.wizard_user_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_wizard_user_progress_org_id 
  ON public.wizard_user_progress (organization_id);

CREATE INDEX IF NOT EXISTS idx_wizard_user_progress_status 
  ON public.wizard_user_progress (status);

-- Enable RLS
ALTER TABLE public.wizard_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_user_progress ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for wizard_definitions
DROP POLICY IF EXISTS "Authenticated users can view active wizard definitions" ON public.wizard_definitions;
CREATE POLICY "Authenticated users can view active wizard definitions"
  ON public.wizard_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can manage wizard definitions" ON public.wizard_definitions;
CREATE POLICY "Platform operators can manage wizard definitions"
  ON public.wizard_definitions
  FOR ALL
  TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

-- 4. RLS Policies for wizard_user_progress
DROP POLICY IF EXISTS "Users can view own wizard progress" ON public.wizard_user_progress;
CREATE POLICY "Users can view own wizard progress"
  ON public.wizard_user_progress
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_operator()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_memberships om 
        WHERE om.user_id = auth.uid() 
          AND om.role IN ('organization_owner', 'organization_admin') 
          AND om.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own wizard progress" ON public.wizard_user_progress;
CREATE POLICY "Users can insert own wizard progress"
  ON public.wizard_user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_platform_operator()
  );

DROP POLICY IF EXISTS "Users and admins can update wizard progress" ON public.wizard_user_progress;
CREATE POLICY "Users and admins can update wizard progress"
  ON public.wizard_user_progress
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_operator()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_memberships om 
        WHERE om.user_id = auth.uid() 
          AND om.role IN ('organization_owner', 'organization_admin') 
          AND om.is_active = true
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_platform_operator()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_memberships om 
        WHERE om.user_id = auth.uid() 
          AND om.role IN ('organization_owner', 'organization_admin') 
          AND om.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete/reset wizard progress" ON public.wizard_user_progress;
CREATE POLICY "Admins can delete/reset wizard progress"
  ON public.wizard_user_progress
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_operator()
    OR (
      organization_id IS NOT NULL 
      AND organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_memberships om 
        WHERE om.user_id = auth.uid() 
          AND om.role IN ('organization_owner', 'organization_admin') 
          AND om.is_active = true
      )
    )
  );

-- 5. Helper RPCs for clean client-side interaction
CREATE OR REPLACE FUNCTION public.get_or_create_user_wizard_progress(
  p_wizard_id TEXT,
  p_org_id UUID DEFAULT NULL,
  p_current_role TEXT DEFAULT 'learner'
)
RETURNS public.wizard_user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_user_id UUID := auth.uid();
  v_progress public.wizard_user_progress;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_progress
  FROM public.wizard_user_progress
  WHERE user_id = v_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id)
    AND wizard_id = p_wizard_id;

  IF NOT FOUND THEN
    INSERT INTO public.wizard_user_progress (
      user_id,
      organization_id,
      wizard_id,
      wizard_version,
      role_at_onboarding,
      status,
      current_step_index,
      completed_step_ids,
      skipped_step_ids,
      dismissed_contextual_tips,
      last_activity_at
    )
    VALUES (
      v_user_id,
      p_org_id,
      p_wizard_id,
      1,
      p_current_role,
      'not_started',
      0,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      now()
    )
    RETURNING * INTO v_progress;
  END IF;

  RETURN v_progress;
END;
$;

CREATE OR REPLACE FUNCTION public.update_wizard_step_progress(
  p_wizard_id TEXT,
  p_step_id TEXT,
  p_step_index INTEGER,
  p_completed BOOLEAN DEFAULT true,
  p_org_id UUID DEFAULT NULL
)
RETURNS public.wizard_user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_user_id UUID := auth.uid();
  v_progress public.wizard_user_progress;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.wizard_user_progress
  SET
    current_step_index = p_step_index,
    status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
    completed_step_ids = CASE 
      WHEN p_completed AND NOT completed_step_ids ? p_step_id 
      THEN completed_step_ids || to_jsonb(p_step_id)
      ELSE completed_step_ids
    END,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id)
    AND wizard_id = p_wizard_id
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$;

CREATE OR REPLACE FUNCTION public.skip_or_complete_wizard(
  p_wizard_id TEXT,
  p_status TEXT,
  p_org_id UUID DEFAULT NULL
)
RETURNS public.wizard_user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_user_id UUID := auth.uid();
  v_progress public.wizard_user_progress;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_status NOT IN ('skipped', 'completed', 'in_progress', 'reset') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.wizard_user_progress
  SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id)
    AND wizard_id = p_wizard_id
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$;

CREATE OR REPLACE FUNCTION public.reset_user_wizard_progress(
  p_target_user_id UUID,
  p_wizard_id TEXT,
  p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_caller UUID := auth.uid();
  v_is_authorized BOOLEAN := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF v_caller = p_target_user_id THEN
    v_is_authorized := true;
  ELSIF public.is_platform_operator() THEN
    v_is_authorized := true;
  ELSIF p_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = p_org_id
      AND user_id = v_caller
      AND role IN ('organization_owner', 'organization_admin')
      AND is_active = true
  ) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: not authorized to reset wizard progress.';
  END IF;

  UPDATE public.wizard_user_progress
  SET
    status = 'not_started',
    current_step_index = 0,
    completed_step_ids = '[]'::jsonb,
    skipped_step_ids = '[]'::jsonb,
    reset_at = now(),
    completed_at = NULL,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = p_target_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id)
    AND wizard_id = p_wizard_id;

  RETURN true;
END;
$;

CREATE OR REPLACE FUNCTION public.dismiss_contextual_tip(
  p_tip_id TEXT,
  p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.wizard_user_progress
  SET
    dismissed_contextual_tips = CASE 
      WHEN NOT dismissed_contextual_tips ? p_tip_id 
      THEN dismissed_contextual_tips || to_jsonb(p_tip_id)
      ELSE dismissed_contextual_tips
    END,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id);

  RETURN true;
END;
$;

-- 6. Pre-seed default wizard definitions
INSERT INTO public.wizard_definitions (id, title, description, target_role, target_level, version, is_active)
VALUES
  ('platform_operator', 'Platform Operator System Guide', 'Comprehensive guide for super administrators and platform operators managing the multi-tenant hotel SaaS ecosystem.', 'platform_admin', 'platform', 1, true),
  ('tenant_owner', 'Property & Organization Owner Onboarding', 'High-level setup for hotel chain owners covering organization structure, properties, departments, and compliance.', 'organization_owner', 'tenant', 1, true),
  ('tenant_admin', 'Hotel Administrator Operations Guide', 'Day-to-day administrative operations including user lifecycle, role provisioning, and property settings.', 'organization_admin', 'tenant', 1, true),
  ('training_manager', 'Training & LMS Manager Master Guide', 'Course authoring, curriculum mapping, quiz generation, and learner compliance tracking.', 'training_manager', 'operational', 1, true),
  ('knowledge_manager', 'Knowledge & SOP Authoring Guide', 'Standard Operating Procedures, brand manuals, and policy documentation workflow.', 'knowledge_manager', 'operational', 1, true),
  ('department_manager', 'Department Manager & Supervisor Workspace', 'Team oversight, shift approvals, employee training velocity, and operational requests.', 'department_manager', 'operational', 1, true),
  ('learner', 'Employee & Learner Onboarding Guide', 'Welcome to PRIME Connect. Getting started with your personal workspace, courses, and requests.', 'learner', 'operational', 1, true),
  ('viewer', 'Platform Viewer & Auditor Guide', 'Read-only access guide for compliance officers, auditors, and stakeholders.', 'viewer', 'operational', 1, true)
ON CONFLICT (id) DO UPDATE 
SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_role = EXCLUDED.target_role,
  target_level = EXCLUDED.target_level,
  updated_at = now();
