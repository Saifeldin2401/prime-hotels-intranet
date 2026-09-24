-- Migration: 20260826120000_ai_usage_log.sql
-- Description: Creates ai_usage_log table for tracking AI token costs, model latency, and multi-agent performance

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pipeline_run_id TEXT,
  course_id UUID REFERENCES public.training_modules(id) ON DELETE SET NULL,
  agent_role TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'general',
  model_used TEXT NOT NULL,
  provider TEXT NOT NULL,
  cost_tier TEXT NOT NULL DEFAULT 'free',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes for analytics and cost auditing
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_pipeline ON public.ai_usage_log(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_agent ON public.ai_usage_log(agent_role);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON public.ai_usage_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can view their own logs, Admins can view all
DROP POLICY IF EXISTS "ai_usage_log_select" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_select" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'corporate_admin', 'regional_admin', 'property_manager')
    )
  );

DROP POLICY IF EXISTS "ai_usage_log_insert" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_insert" ON public.ai_usage_log
  FOR INSERT TO authenticated
  WITH CHECK (true);
