-- ============================================================================
-- AI MODEL PRICING  (real cost accounting for the gateway)
-- ----------------------------------------------------------------------------
-- process-ai-request now writes ai_usage_log rows with the provider's
-- *reported* token counts and a real per-model cost. This adds the price
-- columns it reads and seeds the ~24 models actually in rotation with
-- widely-published provider list prices (USD per 1,000,000 tokens, Jan 2026).
--
-- groq gpt-oss / compound / allam resolve on a free Groq account => $0.
-- Cloudflare Workers AI text and the HF serverless router are effectively
-- free tier on this project. The gateway keeps a hardcoded fallback table
-- for ids not present here.
-- ============================================================================

ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS price_input_per_mtok  NUMERIC,
  ADD COLUMN IF NOT EXISTS price_output_per_mtok NUMERIC;

COMMENT ON COLUMN public.ai_models.price_input_per_mtok  IS 'USD per 1,000,000 input tokens (provider list price).';
COMMENT ON COLUMN public.ai_models.price_output_per_mtok IS 'USD per 1,000,000 output tokens (provider list price).';

UPDATE public.ai_models AS m
   SET price_input_per_mtok  = v.pin,
       price_output_per_mtok = v.pout,
       pricing_source        = 'public_provider_pricing_2026_01',
       pricing_last_verified = DATE '2026-01-15'
  FROM (VALUES
    ('@cf/meta/llama-3.1-8b-instruct',        0.0,  0.0),
    ('gemini-2.5-flash',                      0.3,  2.5),
    ('gemini-flash-latest',                   0.3,  2.5),
    ('gemini-2.5-flash-lite',                 0.1,  0.4),
    ('gemini-3.1-flash-lite',                 0.1,  0.4),
    ('allam-2-7b',                            0.0,  0.0),
    ('groq/compound',                         0.0,  0.0),
    ('groq/compound-mini',                    0.0,  0.0),
    ('openai/gpt-oss-120b',                   0.0,  0.0),
    ('openai/gpt-oss-20b',                    0.0,  0.0),
    ('openai/gpt-oss-safeguard-20b',          0.0,  0.0),
    ('mistralai/Mistral-7B-Instruct-v0.3',    0.0,  0.0),
    ('Qwen/Qwen2.5-72B-Instruct',             0.0,  0.0),
    ('anthropic/claude-haiku-4.5',            1.0,  5.0),
    ('anthropic/claude-opus-4.5',             5.0,  25.0),
    ('deepseek/deepseek-chat',                0.28, 0.88),
    ('deepseek/deepseek-chat-v3-0324',        0.28, 0.88),
    ('deepseek/deepseek-r1',                  0.55, 2.19),
    ('google/gemini-2.5-flash',               0.3,  2.5),
    ('google/gemini-2.5-flash-lite',          0.1,  0.4),
    ('meta-llama/llama-3.3-70b-instruct',     0.12, 0.3),
    ('openai/gpt-4o',                         2.5,  10.0),
    ('openai/gpt-4o-mini',                    0.15, 0.6),
    ('qwen/qwen-2.5-72b-instruct',            0.12, 0.39)
  ) AS v(id, pin, pout)
 WHERE m.id = v.id;
