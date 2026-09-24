-- ============================================================================
-- DB-backed provider + model registry (audit Phase 2).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id                   TEXT PRIMARY KEY,
  display_name         TEXT NOT NULL,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  priority             INTEGER NOT NULL DEFAULT 100,
  free_models_enabled  BOOLEAN NOT NULL DEFAULT true,
  paid_models_enabled  BOOLEAN NOT NULL DEFAULT true,
  daily_budget_usd     NUMERIC(10,2),
  rate_limit_per_min   INTEGER,
  key_status           TEXT NOT NULL DEFAULT 'unknown' CHECK (key_status IN ('configured','missing','invalid','unknown')),
  health_status        TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','rate_limited','quota_exhausted','auth_failed','unavailable','disabled','unknown')),
  cooldown_until       TIMESTAMPTZ,
  notes                TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ai_providers (id, display_name, priority, key_status, notes) VALUES
  ('groq',        'Groq LPU',              10, 'configured', 'Free, fast. Restricted catalog on this key (gpt-oss / compound / allam only).'),
  ('openrouter',  'OpenRouter',            20, 'configured', 'Paid credits. Proxies most models. The workhorse for non-free work.'),
  ('gemini',      'Google AI Studio',      30, 'invalid',    'Direct API 429s / times out - needs GCP billing. Falls through to OpenRouter.'),
  ('cloudflare',  'Cloudflare Workers AI', 40, 'configured', 'Free, 10k neurons/day. Text + image.'),
  ('huggingface', 'Hugging Face',          60, 'invalid',    '402 - monthly credits depleted.'),
  ('together',    'Together AI',           70, 'missing',    'No key configured.'),
  ('recraft',     'Recraft (client SVG)',  90, 'configured', 'Deterministic client-side SVG generator - no network, always available.')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

CREATE TABLE IF NOT EXISTS public.ai_models (
  id                    TEXT PRIMARY KEY,
  provider              TEXT NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  provider_model_id     TEXT NOT NULL,
  display_name          TEXT NOT NULL,
  modality              TEXT NOT NULL DEFAULT 'text' CHECK (modality IN ('text','image','embedding')),
  capabilities          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  cost_tier             TEXT NOT NULL DEFAULT 'free' CHECK (cost_tier IN ('free','low_cost','premium')),
  is_free               BOOLEAN NOT NULL DEFAULT true,
  supports_json_object  BOOLEAN NOT NULL DEFAULT false,
  supports_json_schema  BOOLEAN NOT NULL DEFAULT false,
  vision                BOOLEAN NOT NULL DEFAULT false,
  image_generation      BOOLEAN NOT NULL DEFAULT false,
  image_editing         BOOLEAN NOT NULL DEFAULT false,
  streaming             BOOLEAN NOT NULL DEFAULT true,
  max_context           INTEGER NOT NULL DEFAULT 0,
  max_output            INTEGER NOT NULL DEFAULT 0,
  quality_score         INTEGER NOT NULL DEFAULT 70 CHECK (quality_score BETWEEN 0 AND 100),
  speed_score           INTEGER NOT NULL DEFAULT 70 CHECK (speed_score BETWEEN 0 AND 100),
  availability           TEXT NOT NULL DEFAULT 'unverified' CHECK (availability IN ('unverified','verified','deprecated')),
  enabled               BOOLEAN NOT NULL DEFAULT true,
  pricing_source        TEXT,
  pricing_last_verified DATE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_models_provider_idx  ON public.ai_models (provider);
CREATE INDEX IF NOT EXISTS ai_models_modality_idx  ON public.ai_models (modality) WHERE enabled;

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_providers_select ON public.ai_providers;
CREATE POLICY ai_providers_select ON public.ai_providers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ai_models_select ON public.ai_models;
CREATE POLICY ai_models_select ON public.ai_models FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ai_providers_write ON public.ai_providers;
CREATE POLICY ai_providers_write ON public.ai_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));
DROP POLICY IF EXISTS ai_models_write ON public.ai_models;
CREATE POLICY ai_models_write ON public.ai_models FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));

CREATE OR REPLACE FUNCTION public.get_ai_model_registry()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT jsonb_build_object(
    'providers', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.priority) FROM public.ai_providers p), '[]'::jsonb),
    'models',    coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.quality_score DESC) FROM public.ai_models m WHERE m.enabled), '[]'::jsonb),
    'generated_at', now()
  );
$$;
REVOKE ALL ON FUNCTION public.get_ai_model_registry() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_model_registry() TO authenticated, service_role;
