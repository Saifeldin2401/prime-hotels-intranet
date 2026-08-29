-- ============================================================================
-- AI PROVIDER & MODEL REGISTRY  (audit Phase 2 — provider-agnostic routing spine)
-- ----------------------------------------------------------------------------
-- Single source of truth for "which models exist, on which provider, with what
-- capabilities/cost/quality/speed" and "which providers are healthy right now".
--
--   public.ai_providers          — one row per provider, static config + live health
--   public.ai_models             — one row per (model, provider) pair, full metadata
--   public.get_ai_model_registry()   — dump the whole registry for the client
--   public.get_ai_routing_plan(...)  — policy- + health-aware ranked model list
--   public.set_ai_provider_health(...) — the gateway posts health transitions here
--
-- The gateway (process-ai-request) calls get_ai_routing_plan() when a request
-- names a capability class, then dispatches each planned model to its provider's
-- API in rank order. No model appears here that cannot actually be invoked; every
-- fake / unverified id is availability='unverified', enabled=false and is
-- filtered out of every routing plan.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROVIDERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id                  TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  priority            INTEGER NOT NULL DEFAULT 100,
  free_models_enabled BOOLEAN NOT NULL DEFAULT true,
  paid_models_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_budget_usd    NUMERIC,
  rate_limit_per_min  INTEGER,
  key_status          TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (key_status IN ('configured','missing','invalid','unknown')),
  health_status       TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (health_status IN ('healthy','degraded','rate_limited','quota_exhausted',
                                                 'auth_failed','unavailable','disabled','unknown')),
  cooldown_until      TIMESTAMPTZ,
  notes               TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ai_providers (id, display_name, priority, key_status, health_status, notes) VALUES
  ('groq',       'Groq LPU',              10, 'configured', 'healthy',
     'Free, fast. Restricted catalog on this key (gpt-oss / compound / allam only).'),
  ('openrouter', 'OpenRouter',            20, 'configured', 'healthy',
     'Paid credits. Proxies most models. The workhorse for non-free work.'),
  ('gemini',     'Google AI Studio',      30, 'invalid',    'degraded',
     'Direct API 429s / times out — needs GCP billing. Falls through to OpenRouter.'),
  ('cloudflare', 'Cloudflare Workers AI', 40, 'configured', 'healthy',
     'Free, 10k neurons/day. Text + image.'),
  ('huggingface','Hugging Face',          60, 'invalid',    'quota_exhausted',
     '402 — monthly credits depleted.'),
  ('together',   'Together AI',           70, 'missing',    'unknown',
     'No key configured.'),
  ('recraft',    'Recraft (client SVG)',  90, 'configured', 'healthy',
     'Deterministic client-side SVG generator — no network, always available.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. MODELS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_models (
  id                    TEXT PRIMARY KEY,
  provider              TEXT NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  provider_model_id     TEXT NOT NULL,
  display_name          TEXT NOT NULL,
  modality              TEXT NOT NULL DEFAULT 'text' CHECK (modality IN ('text','image','embedding')),
  capabilities          TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
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
  availability          TEXT NOT NULL DEFAULT 'unverified'
                          CHECK (availability IN ('unverified','verified','deprecated')),
  enabled               BOOLEAN NOT NULL DEFAULT true,
  pricing_source        TEXT,
  pricing_last_verified DATE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_models_provider_idx ON public.ai_models (provider);
CREATE INDEX IF NOT EXISTS ai_models_modality_idx ON public.ai_models (modality) WHERE enabled;

INSERT INTO public.ai_models
  (id, provider, provider_model_id, display_name, modality, capabilities, cost_tier, is_free,
   supports_json_object, supports_json_schema, vision, image_generation, image_editing, streaming,
   availability, max_context, max_output, quality_score, speed_score, enabled, pricing_source)
VALUES
  ('@cf/black-forest-labs/flux-1-schnell','cloudflare','@cf/black-forest-labs/flux-1-schnell','FLUX.1 Schnell (CF)','image','{photorealistic_image,luxury_photography}','free','true','false','false','false','true','false','false','verified',0,0,'97','94','true','modelRegistry.ts'),
  ('@cf/bytedance/stable-diffusion-xl-lightning','cloudflare','@cf/bytedance/stable-diffusion-xl-lightning','SDXL Lightning','image','{photorealistic_image,fast_generation}','free','true','false','false','false','true','false','false','verified',0,0,'89','98','true','modelRegistry.ts'),
  ('@cf/leonardo/lucid-origin','cloudflare','@cf/leonardo/lucid-origin','Leonardo Lucid Origin','image','{photorealistic_image,luxury_photography,vector_svg}','free','true','false','false','false','true','false','false','verified',0,0,'98','90','true','modelRegistry.ts'),
  ('@cf/leonardo/phoenix-1.0','cloudflare','@cf/leonardo/phoenix-1.0','Leonardo Phoenix 1.0','image','{photorealistic_image}','free','true','false','false','false','true','false','false','verified',0,0,'96','89','true','modelRegistry.ts'),
  ('@cf/lykon/dreamshaper-8-lcm','cloudflare','@cf/lykon/dreamshaper-8-lcm','DreamShaper 8 LCM','image','{photorealistic_image}','free','true','false','false','false','true','false','false','verified',0,0,'91','96','true','modelRegistry.ts'),
  ('@cf/meta/llama-3.1-8b-instruct','cloudflare','@cf/meta/llama-3.1-8b-instruct','Llama 3.1 8B (Cloudflare Free)','text','{high_speed,structured_json}','free','true','true','false','false','false','false','true','verified',8192,1024,'83','91','true','modelRegistry.ts'),
  ('@cf/runwayml/stable-diffusion-v1-5-img2img','cloudflare','@cf/runwayml/stable-diffusion-v1-5-img2img','SD 1.5 img2img','image','{photorealistic_image}','free','true','false','false','false','true','true','false','verified',0,0,'87','91','true','modelRegistry.ts'),
  ('@cf/runwayml/stable-diffusion-v1-5-inpainting','cloudflare','@cf/runwayml/stable-diffusion-v1-5-inpainting','SD 1.5 inpainting','image','{photorealistic_image}','free','true','false','false','false','true','true','false','verified',0,0,'86','90','true','modelRegistry.ts'),
  ('@cf/stabilityai/stable-diffusion-xl-base-1.0','cloudflare','@cf/stabilityai/stable-diffusion-xl-base-1.0','SDXL Base 1.0','image','{photorealistic_image}','free','true','false','false','false','true','false','false','verified',0,0,'93','87','true','modelRegistry.ts'),
  ('gemini-2.5-flash','gemini','gemini-2.5-flash','Gemini 2.5 Flash','text','{deep_reasoning,structured_json,long_context,arabic_native,high_speed}','free','true','true','true','false','false','false','true','verified',1048576,8000,'94','92','true','modelRegistry.ts'),
  ('gemini-2.5-flash-image','gemini','gemini-2.5-flash-image','Nano Banana (Gemini)','image','{photorealistic_image}','free','true','false','false','false','true','false','false','unverified',0,0,'90','96','false','modelRegistry.ts'),
  ('gemini-2.5-flash-lite','gemini','gemini-2.5-flash-lite','Gemini 2.5 Flash-Lite','text','{structured_json,high_speed,long_context,arabic_native}','free','true','true','true','false','false','false','true','verified',1048576,8000,'86','98','true','modelRegistry.ts'),
  ('gemini-3.1-flash-image','gemini','gemini-3.1-flash-image','Nano Banana 2 (Gemini)','image','{photorealistic_image,fast_generation}','free','true','false','false','false','true','false','false','unverified',0,0,'94','98','false','modelRegistry.ts'),
  ('gemini-3.1-flash-lite','gemini','gemini-3.1-flash-lite','Gemini 3.1 Flash-Lite','text','{structured_json,high_speed,long_context}','free','true','true','false','false','false','false','true','verified',1048576,8000,'88','98','true','modelRegistry.ts'),
  ('gemini-flash-latest','gemini','gemini-flash-latest','Gemini Flash (latest alias)','text','{deep_reasoning,structured_json,long_context,arabic_native,high_speed}','free','true','true','false','false','false','false','true','verified',1048576,8000,'90','94','true','modelRegistry.ts'),
  ('google-imagen-3','gemini','imagen-4.0-generate-001','Google Imagen (Gemini)','image','{photorealistic_image,luxury_photography}','low_cost','false','false','false','false','true','false','false','unverified',0,0,'99','92','false','modelRegistry.ts'),
  ('google-imagen-3-fast','gemini','imagen-3.0-generate-002','Google Imagen Fast (Gemini)','image','{photorealistic_image,fast_generation}','low_cost','false','false','false','false','true','false','false','unverified',0,0,'95','97','false','modelRegistry.ts'),
  ('nano-banana-pro-preview','gemini','gemini-2.5-flash-image','Nano Banana Pro (Gemini)','image','{photorealistic_image,luxury_photography}','free','true','false','false','false','true','false','false','unverified',0,0,'98','91','false','modelRegistry.ts'),
  ('allam-2-7b','groq','allam-2-7b','ALLaM-2 7B Arabic Sovereign (Groq)','text','{arabic_native,structured_json,compliance}','free','true','true','false','false','false','false','true','verified',8192,1024,'91','95','true','modelRegistry.ts'),
  ('groq/compound','groq','groq/compound','Groq Compound (Agentic)','text','{deep_reasoning,high_speed}','free','true','false','false','false','false','false','true','verified',131072,8000,'90','90','true','modelRegistry.ts'),
  ('groq/compound-mini','groq','groq/compound-mini','Groq Compound Mini (Agentic)','text','{high_speed}','free','true','false','false','false','false','false','true','verified',131072,4096,'84','94','true','groq live probe'),
  ('openai/gpt-oss-120b','groq','openai/gpt-oss-120b','GPT-OSS 120B (Groq LPU Flagship)','text','{deep_reasoning,structured_json,creative_narrative,high_speed}','free','true','true','true','false','false','false','true','verified',131072,8000,'93','96','true','modelRegistry.ts'),
  ('openai/gpt-oss-20b','groq','openai/gpt-oss-20b','GPT-OSS 20B (Groq LPU)','text','{deep_reasoning,structured_json,high_speed}','free','true','true','true','false','false','false','true','verified',131072,8000,'86','99','true','modelRegistry.ts'),
  ('openai/gpt-oss-safeguard-20b','groq','openai/gpt-oss-safeguard-20b','GPT-OSS Safeguard 20B (Groq)','text','{structured_json,high_speed}','free','true','true','false','false','false','false','true','verified',131072,4096,'80','96','true','groq live probe'),
  ('mistralai/Mistral-7B-Instruct-v0.3','huggingface','mistralai/Mistral-7B-Instruct-v0.3','Mistral 7B Instruct (HF)','text','{high_speed,structured_json}','free','true','false','false','false','false','false','true','verified',32768,4096,'82','85','true','modelRegistry.ts'),
  ('Qwen/Qwen2.5-72B-Instruct','huggingface','Qwen/Qwen2.5-72B-Instruct','Qwen 2.5 72B Instruct (HF)','text','{deep_reasoning,structured_json,arabic_native}','free','true','true','false','false','false','false','true','verified',32768,4096,'91','78','true','modelRegistry.ts'),
  ('anthropic/claude-haiku-4.5','openrouter','anthropic/claude-haiku-4.5','Claude Haiku 4.5','text','{deep_reasoning,structured_json,creative_narrative,arabic_native,long_context}','low_cost','false','true','true','false','false','false','true','verified',200000,8000,'95','92','true','modelRegistry.ts'),
  ('anthropic/claude-opus-4.5','openrouter','anthropic/claude-opus-4.5','Claude Opus 4.5','text','{deep_reasoning,structured_json,creative_narrative,arabic_native,long_context}','premium','false','true','true','false','false','false','true','verified',200000,8000,'99','84','true','modelRegistry.ts'),
  ('deepseek/deepseek-chat','openrouter','deepseek/deepseek-chat','DeepSeek V3','text','{deep_reasoning,structured_json,high_speed}','low_cost','false','true','true','false','false','false','true','verified',65536,8000,'94','93','true','modelRegistry.ts'),
  ('deepseek/deepseek-chat-v3-0324','openrouter','deepseek/deepseek-chat-v3-0324','DeepSeek V3 (0324)','text','{deep_reasoning,structured_json,high_speed}','low_cost','false','true','true','false','false','false','true','verified',65536,8000,'93','92','true','modelRegistry.ts'),
  ('deepseek/deepseek-r1','openrouter','deepseek/deepseek-r1','DeepSeek R1','text','{deep_reasoning,structured_json}','low_cost','false','true','false','false','false','false','true','verified',65536,8000,'98','75','true','modelRegistry.ts'),
  ('flux-1-schnell','openrouter','flux-1-schnell','FLUX.1 Schnell Direct (unverified)','image','{photorealistic_image,luxury_photography}','free','true','false','false','false','true','false','false','unverified',0,0,'97','95','false','modelRegistry.ts'),
  ('google/gemini-2.5-flash','openrouter','google/gemini-2.5-flash','Gemini 2.5 Flash (OpenRouter)','text','{deep_reasoning,structured_json,long_context,arabic_native}','low_cost','false','true','true','false','false','false','true','verified',1048576,8000,'94','90','true','openrouter live'),
  ('google/gemini-2.5-flash-image','openrouter','google/gemini-2.5-flash-image','Gemini 2.5 Flash Image (OpenRouter)','image','{photorealistic_image,luxury_photography}','low_cost','false','false','false','false','true','false','false','verified',0,0,'92','95','true','modelRegistry.ts'),
  ('google/gemini-2.5-flash-lite','openrouter','google/gemini-2.5-flash-lite','Gemini 2.5 Flash-Lite (OpenRouter)','text','{structured_json,high_speed,long_context,arabic_native}','low_cost','false','true','true','false','false','false','true','verified',1048576,8000,'86','97','true','openrouter live'),
  ('google/gemini-3-pro-image','openrouter','google/gemini-3-pro-image','Gemini 3 Pro Image (OpenRouter)','image','{photorealistic_image,luxury_photography,vector_svg}','low_cost','false','false','false','false','true','false','false','verified',0,0,'98','88','true','modelRegistry.ts'),
  ('google/gemini-3.1-flash-image','openrouter','google/gemini-3.1-flash-image','Gemini 3.1 Flash Image (OpenRouter)','image','{photorealistic_image,fast_generation}','low_cost','false','false','false','false','true','false','false','verified',0,0,'94','97','true','modelRegistry.ts'),
  ('meta-llama/llama-3.3-70b-instruct','openrouter','meta-llama/llama-3.3-70b-instruct','Llama 3.3 70B Instruct (OpenRouter)','text','{deep_reasoning,structured_json,creative_narrative,arabic_native}','low_cost','false','true','false','false','false','false','true','verified',128000,8000,'93','88','true','modelRegistry.ts'),
  ('openai/gpt-4o','openrouter','openai/gpt-4o','OpenAI GPT-4o','text','{deep_reasoning,structured_json,high_speed,arabic_native,long_context}','premium','false','true','true','false','false','false','true','verified',128000,8000,'97','92','true','modelRegistry.ts'),
  ('openai/gpt-4o-mini','openrouter','openai/gpt-4o-mini','OpenAI GPT-4o Mini','text','{structured_json,high_speed,arabic_native}','low_cost','false','true','true','false','false','false','true','verified',128000,8000,'90','96','true','modelRegistry.ts'),
  ('qwen/qwen-2.5-72b-instruct','openrouter','qwen/qwen-2.5-72b-instruct','Qwen 2.5 72B (OpenRouter)','text','{deep_reasoning,structured_json,arabic_native}','low_cost','false','true','false','false','false','false','true','verified',32768,8000,'90','82','true','modelRegistry.ts'),
  ('recraft-vector','recraft','recraft-vector','Vector Schematic (client SVG)','image','{vector_svg,structured_json}','free','true','false','false','false','true','false','false','verified',0,0,'55','98','true','modelRegistry.ts')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS — everyone authenticated can read; only super/corporate admin can write
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_providers_select ON public.ai_providers;
CREATE POLICY ai_providers_select ON public.ai_providers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ai_models_select ON public.ai_models;
CREATE POLICY ai_models_select ON public.ai_models FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ai_providers_write ON public.ai_providers;
CREATE POLICY ai_providers_write ON public.ai_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));
DROP POLICY IF EXISTS ai_models_write ON public.ai_models;
CREATE POLICY ai_models_write ON public.ai_models FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));

-- ---------------------------------------------------------------------------
-- 4. RPCs
-- ---------------------------------------------------------------------------

-- 4a. Full registry dump for the client-side model registry to hydrate from.
CREATE OR REPLACE FUNCTION public.get_ai_model_registry()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'providers', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.priority) FROM public.ai_providers p), '[]'::jsonb),
    'models',    coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.quality_score DESC) FROM public.ai_models m WHERE m.enabled), '[]'::jsonb),
    'generated_at', now()
  );
$function$;

REVOKE ALL ON FUNCTION public.get_ai_model_registry() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_model_registry() TO authenticated, service_role;
