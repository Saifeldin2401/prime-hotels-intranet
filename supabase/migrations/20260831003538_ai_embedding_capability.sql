ALTER TABLE public.ai_platform_config
  ADD COLUMN IF NOT EXISTS embedding_model_priority TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.ai_platform_config.embedding_model_priority IS
  'Ordered ai_models.id override for the embedding capability class (empty = registry default order).';

INSERT INTO public.ai_models
  (id, provider, provider_model_id, display_name, modality, capabilities, cost_tier, is_free,
   supports_json_object, supports_json_schema, vision, image_generation, image_editing, streaming,
   availability, max_context, max_output, quality_score, speed_score, enabled, pricing_source)
VALUES
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
