-- Migration: 20260827120000_ai_observability_and_platform_config.sql
-- Description:
--   1. Extends ai_usage_log with structured observability columns.
--   2. Adds course_generation_jobs.metadata for per-run telemetry.
--   3. Creates ai_platform_config: singleton admin control surface for the
--      AI Course Generator (routing mode, enabled providers/models, spend caps,
--      concurrency, QA thresholds).
--   4. Adds an admin analytics view over ai_usage_log.

-- ============================================================================
-- 1. ai_usage_log observability columns
-- ============================================================================
ALTER TABLE public.ai_usage_log
  ADD COLUMN IF NOT EXISTS generation_id TEXT,
  ADD COLUMN IF NOT EXISTS lesson_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_type TEXT,
  ADD COLUMN IF NOT EXISTS routing_mode TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_generation ON public.ai_usage_log(generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_provider ON public.ai_usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_success ON public.ai_usage_log(success);

-- course_generation_jobs: structured run telemetry
ALTER TABLE public.course_generation_jobs
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. ai_platform_config (admin CMS control surface)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_platform_config (
  id BOOLEAN PRIMARY KEY DEFAULT true,          -- singleton row (id = true)
  routing_mode TEXT NOT NULL DEFAULT 'free_first'
    CHECK (routing_mode IN ('free_first','balanced','quality_first','premium')),
  enabled_providers TEXT[] NOT NULL DEFAULT ARRAY['gemini','groq','openrouter','huggingface','cloudflare','recraft'],
  disabled_model_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  force_enabled_model_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  free_only_mode BOOLEAN NOT NULL DEFAULT false,
  allow_premium_images BOOLEAN NOT NULL DEFAULT false,
  max_retries INTEGER NOT NULL DEFAULT 2 CHECK (max_retries BETWEEN 0 AND 6),
  max_concurrency INTEGER NOT NULL DEFAULT 3 CHECK (max_concurrency BETWEEN 1 AND 12),
  premium_daily_usd_cap NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  per_course_usd_cap NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  per_user_daily_generations INTEGER NOT NULL DEFAULT 25,
  image_model_priority TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  text_model_priority TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  qa_min_production_ready INTEGER NOT NULL DEFAULT 90,
  qa_min_acceptable INTEGER NOT NULL DEFAULT 80,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_platform_config_singleton CHECK (id)
);

INSERT INTO public.ai_platform_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_platform_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read the effective config (the client router needs it).
DROP POLICY IF EXISTS "ai_platform_config_select" ON public.ai_platform_config;
CREATE POLICY "ai_platform_config_select" ON public.ai_platform_config
  FOR SELECT TO authenticated USING (true);

-- Only platform admins may change it.
DROP POLICY IF EXISTS "ai_platform_config_update" ON public.ai_platform_config;
CREATE POLICY "ai_platform_config_update" ON public.ai_platform_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])
    )
  );

-- ============================================================================
-- 3. Admin analytics view (security_invoker -> inherits ai_usage_log RLS)
-- ============================================================================
CREATE OR REPLACE VIEW public.ai_generation_analytics
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)                         AS day,
  provider,
  model_used,
  agent_role,
  cost_tier,
  count(*)                                              AS requests,
  count(*) FILTER (WHERE success)                       AS successes,
  count(*) FILTER (WHERE NOT success)                   AS failures,
  round(avg(latency_ms))                                AS avg_latency_ms,
  max(latency_ms)                                       AS max_latency_ms,
  sum(total_tokens)                                     AS total_tokens,
  sum(estimated_cost_usd)                               AS total_cost_usd,
  sum(retry_count)                                      AS total_retries,
  sum(fallback_count)                                   AS total_fallbacks
FROM public.ai_usage_log
GROUP BY 1, 2, 3, 4, 5;

GRANT SELECT ON public.ai_generation_analytics TO authenticated;
