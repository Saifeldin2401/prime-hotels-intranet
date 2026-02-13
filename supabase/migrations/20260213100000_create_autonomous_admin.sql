-- Migration: Create Autonomous Admin System Schema
-- Description: Creates the `admin_` namespace tables for AI-driven workflow management, optimization, and safety.
-- Author: Assistant (Architecture Phase)

-- 1. Create admin_workflows (The Config Repo)
CREATE TABLE IF NOT EXISTS public.admin_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    domain TEXT NOT NULL CHECK (domain IN ('hr', 'maintenance', 'finance', 'operations', 'it')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) -- Optional: who created this workflow initially
);

-- 2. Create admin_workflow_versions (The History)
CREATE TABLE IF NOT EXISTS public.admin_workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.admin_workflows(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    change_reason TEXT, -- Why this version was created
    changed_by_ai BOOLEAN DEFAULT false,
    performance_score FLOAT, -- To be populated after a period of running
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create admin_ai_proposals (The Change Requests)
CREATE TABLE IF NOT EXISTS public.admin_ai_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.admin_workflows(id) ON DELETE CASCADE,
    proposed_config JSONB NOT NULL,
    diff_summary TEXT, -- Human readable summary of changes
    reasoning TEXT NOT NULL, -- AI's explanation
    risk_score FLOAT CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

-- 4. Create admin_metrics (The Sensors)
CREATE TABLE IF NOT EXISTS public.admin_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.admin_workflows(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL, -- e.g., 'avg_approval_time_hours', 'escalation_rate'
    metric_value FLOAT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create admin_ai_decisions (The Action Log)
CREATE TABLE IF NOT EXISTS public.admin_ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.admin_workflows(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- 'task', 'request'
    entity_id UUID NOT NULL,
    decision_type TEXT NOT NULL, -- 'route', 'delegate', 'escalate', 'reject'
    reasoning TEXT,
    metadata JSONB, -- Context used for decision
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create admin_safety_policies (The Constitution)
CREATE TABLE IF NOT EXISTS public.admin_safety_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    description TEXT,
    enforcement_level TEXT NOT NULL DEFAULT 'blocking' CHECK (enforcement_level IN ('blocking', 'warning', 'monitoring')),
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., { "min_approvers": 1, "protected_roles": ["general_manager"] }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_admin_workflow_versions_workflow_id ON public.admin_workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_admin_ai_proposals_status ON public.admin_ai_proposals(status);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_key_time ON public.admin_metrics(metric_key, window_end);
CREATE INDEX IF NOT EXISTS idx_admin_decisions_entity ON public.admin_ai_decisions(entity_type, entity_id);

-- Row Level Security (RLS)
-- Principle: 
-- 1. "Service Role" (AI) has full access.
-- 2. "Regional Admins" can View All / Edit Configs.
-- 3. Regular users have NO access to these internals.

ALTER TABLE public.admin_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_safety_policies ENABLE ROW LEVEL SECURITY;

-- Policy: Admin View Access
CREATE POLICY "Admins can view admin tables" ON public.admin_workflows
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'regional_admin'));

-- Policy: Admin Edit Access
CREATE POLICY "Admins can edit workflows" ON public.admin_workflows
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'regional_admin'));

-- (Repeat for other tables briefly for now, refine later)
CREATE POLICY "Admins view versions" ON public.admin_workflow_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
CREATE POLICY "Admins view proposals" ON public.admin_ai_proposals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
CREATE POLICY "Admins action proposals" ON public.admin_ai_proposals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
CREATE POLICY "Admins view metrics" ON public.admin_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
CREATE POLICY "Admins view decisions" ON public.admin_ai_decisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
CREATE POLICY "Admins view safety" ON public.admin_safety_policies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'regional_admin'));
