-- ============================================================================
-- AI EMBEDDING CAPABILITY CLASS  (feeds the `ingestion` + `knowledgeQA` layer)
-- ----------------------------------------------------------------------------
-- Adds an `embedding` capability to the provider/model registry introduced in
-- 20260829200707_ai_provider_model_registry.sql. `public.get_ai_routing_plan()`
-- ALREADY maps p_capability = 'embedding' -> modality = 'embedding', so this
-- migration only needs to (a) register embedding model rows and (b) give admins
-- an ordered override list, mirroring image_model_priority / text_model_priority.
--
-- ----------------------------------------------------------------------------
-- !! APPLY ON STAGING FIRST — and note the two open gaps below. !!
-- ----------------------------------------------------------------------------
-- TODO(gateway): supabase/functions/process-ai-request/ has NO embeddings
--   dispatch path yet. It routes chat/completions only. Before `knowledgeQA`
--   can embed a query at runtime the gateway needs an `embedding` branch that
--   calls each provider's embeddings endpoint and returns `number[]`.
--   The capability layer (src/lib/ai/capabilities/knowledgeQA.ts) marks the
--   exact call site with a matching TODO.
--
-- TODO(dimensions): public.knowledge_chunks.embedding is vector(1536)
--   (OpenAI text-embedding-3-small). The free Cloudflare BGE models emit
--   768/1024 dims. Pick ONE of:
--     - standardise on a 1536-dim OpenAI-compatible endpoint, or
--     - ALTER the column + re-tune the ivfflat index to the chosen dim.
--   Until resolved, only 1536-dim models are marked availability='verified'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Admin override list for embedding routing
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_platform_config
  ADD COLUMN IF NOT EXISTS embedding_model_priority TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.ai_platform_config.embedding_model_priority IS
  'Ordered ai_models.id override for the embedding capability class (empty = registry default order).';

-- ---------------------------------------------------------------------------
-- 2. Embedding model rows
-- ---------------------------------------------------------------------------
-- `modality = 'embedding'` is already permitted by the ai_models CHECK
-- constraint. `capabilities` uses free-text tags consistent with existing rows.
INSERT INTO public.ai_models
  (id, provider, provider_model_id, display_name, modality, capabilities, cost_tier, is_free,
   supports_json_object, supports_json_schema, vision, image_generation, image_editing, streaming,
   availability, max_context, max_output, quality_score, speed_score, enabled, pricing_source)
VALUES
  -- 1536-dim, matches knowledge_chunks.embedding. Marked unverified/enabled=false
  -- until an OpenAI-compatible embeddings endpoint is wired into the gateway.
  ('openai/text-embedding-3-small','openrouter','openai/text-embedding-3-small',
     'OpenAI text-embedding-3-small','embedding','{semantic_search,rag_retrieval}',
     'low_cost','false','false','false','false','false','false','false',
     'unverified',8191,0,'88','96','false',
     'TODO: OpenRouter does not proxy embeddings — needs a direct OpenAI-compatible endpoint'),
  ('openai/text-embedding-3-large','openrouter','openai/text-embedding-3-large',
     'OpenAI text-embedding-3-large (3072->1536 via dimensions param)','embedding',
     '{semantic_search,rag_retrieval,high_quality}','low_cost','false','false','false','false','false','false','false',
     'unverified',8191,0,'93','88','false',
     'TODO: needs dimensions=1536 request param + embeddings dispatch in gateway'),
  -- Free Cloudflare BGE. Real, key-configured endpoint but 768/1024-dim — cannot
  -- write into the current vector(1536) column. Kept disabled pending the
  -- dimension decision in the header TODO.
  ('@cf/baai/bge-m3','cloudflare','@cf/baai/bge-m3',
     'BGE-M3 (Cloudflare, 1024-dim)','embedding','{semantic_search,rag_retrieval,multilingual,arabic_native}',
     'free','true','false','false','false','false','false','false',
     'unverified',8192,0,'82','94','false',
     'Free CF endpoint. 1024-dim — mismatched with knowledge_chunks.embedding vector(1536).'),
  ('@cf/baai/bge-large-en-v1.5','cloudflare','@cf/baai/bge-large-en-v1.5',
     'BGE Large EN v1.5 (Cloudflare, 1024-dim)','embedding','{semantic_search,rag_retrieval}',
     'free','true','false','false','false','false','false','false',
     'unverified',512,0,'78','96','false',
     'Free CF endpoint. 1024-dim — mismatched with knowledge_chunks.embedding vector(1536).')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Sanity: surface the embedding routing plan shape for reviewers
-- ---------------------------------------------------------------------------
-- SELECT public.get_ai_routing_plan('embedding');
--   -> { "capability": "embedding", "modality": "embedding", "models": [] }
-- The list is empty by design until one embedding model is promoted to
-- availability='verified' AND the gateway can dispatch it (see header TODOs).
