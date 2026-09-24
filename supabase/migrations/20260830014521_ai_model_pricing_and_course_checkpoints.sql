-- Gap B: real provider-reported cost accounting needs a per-model price table.
-- public.ai_models had no price columns; add input/output $ per 1M tokens.
alter table public.ai_models
  add column if not exists price_input_per_mtok numeric,
  add column if not exists price_output_per_mtok numeric;

comment on column public.ai_models.price_input_per_mtok is
  'USD list price per 1,000,000 prompt/input tokens. NULL = unknown/unpriced. 0 = genuinely free tier.';
comment on column public.ai_models.price_output_per_mtok is
  'USD list price per 1,000,000 completion/output tokens. NULL = unknown/unpriced. 0 = genuinely free tier.';

-- Seed the ~15 models actually in rotation through process-ai-request.
-- Prices are widely-published public list prices (provider pricing pages), Jan 2026.
-- groq gpt-oss / compound / allam resolve on a free Groq account => $0.
update public.ai_models set price_input_per_mtok = v.pin, price_output_per_mtok = v.pout,
  pricing_source = 'public_provider_pricing_2026_01', pricing_last_verified = current_date
from (values
  ('openai/gpt-oss-120b',                 0.00,  0.00),
  ('openai/gpt-oss-20b',                  0.00,  0.00),
  ('openai/gpt-oss-safeguard-20b',        0.00,  0.00),
  ('allam-2-7b',                          0.00,  0.00),
  ('groq/compound',                       0.00,  0.00),
  ('groq/compound-mini',                  0.00,  0.00),
  ('gemini-2.5-flash',                    0.30,  2.50),
  ('gemini-flash-latest',                 0.30,  2.50),
  ('gemini-2.5-flash-lite',               0.10,  0.40),
  ('gemini-3.1-flash-lite',               0.10,  0.40),
  ('@cf/meta/llama-3.1-8b-instruct',      0.00,  0.00),
  ('mistralai/Mistral-7B-Instruct-v0.3',  0.00,  0.00),
  ('Qwen/Qwen2.5-72B-Instruct',           0.00,  0.00),
  ('google/gemini-2.5-flash-lite',        0.10,  0.40),
  ('google/gemini-2.5-flash',             0.30,  2.50),
  ('openai/gpt-4o-mini',                  0.15,  0.60),
  ('openai/gpt-4o',                       2.50, 10.00),
  ('anthropic/claude-haiku-4.5',          1.00,  5.00),
  ('anthropic/claude-opus-4.5',           5.00, 25.00),
  ('deepseek/deepseek-chat',              0.28,  0.88),
  ('deepseek/deepseek-chat-v3-0324',      0.28,  0.88),
  ('deepseek/deepseek-r1',                0.55,  2.19),
  ('meta-llama/llama-3.3-70b-instruct',   0.12,  0.30),
  ('qwen/qwen-2.5-72b-instruct',          0.12,  0.39)
) as v(id, pin, pout)
where public.ai_models.id = v.id;

-- Gap A: interrupted course-generation jobs are resumed from a checkpoint stored
-- in course_generation_jobs.metadata->'checkpoint'. Index the lookup of a user's
-- resumable jobs (status in running/interrupted/failed, newest first).
create index if not exists course_generation_jobs_created_by_status_idx
  on public.course_generation_jobs (created_by, status, created_at desc);

comment on column public.course_generation_jobs.metadata is
  'jsonb bag: telemetry (ai_requests, estimated_cost_usd, routing_mode, ...) plus '
  '"checkpoint" = { version, phase, completedLessonIds, completedQuizModuleIds, '
  'partialBlueprint, researchOutput, knowledgeOutput, totalEstimatedCostUSD } '
  'written after each pipeline phase/module so a dead run can resume via resumeJobId.';
