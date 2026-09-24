-- 2026-09-03: the Gemini API key (vault GEMINI_API_KEY, "AQ.Ab8..." format) was
-- re-verified working — both the x-goog-api-key header and the ?key= query form
-- return 200 with real generations. Re-enable Gemini as a FALLBACK tier.
--
-- Groq must stay rank 1 (it is 2-5x faster than Gemini on this workload:
-- content_writer 8.6s vs 20s, qa 7.3s vs 41-76s). gemini-2.5-flash sits at
-- quality_score 94, so bump the two Groq leads just above it to keep the
-- free-first tiebreak on Groq's side:
--   openai/gpt-oss-120b  93 -> 95   (reasoning / structured_json / long_form lead)
--   allam-2-7b           91 -> 94   (compliance lead — purpose-built KSA Arabic)
UPDATE public.ai_models SET quality_score = 95 WHERE id = 'openai/gpt-oss-120b';
UPDATE public.ai_models SET quality_score = 94 WHERE id = 'allam-2-7b';

UPDATE public.ai_platform_config
   SET enabled_providers = ARRAY['groq','openrouter','gemini','recraft'],
       updated_at = now()
 WHERE id = true;

UPDATE public.ai_providers
   SET health_status = 'healthy',
       key_status    = 'configured',
       cooldown_until = NULL
 WHERE id = 'gemini';

-- Result (get_ai_routing_plan, verified live): every text capability now leads
-- with a Groq model, Gemini second:
--   reasoning       -> openai/gpt-oss-120b, gemini-2.5-flash, gemini-flash-latest
--   structured_json -> openai/gpt-oss-120b, gemini-2.5-flash, openai/gpt-oss-20b
--   fast            -> openai/gpt-oss-20b,  gemini-2.5-flash-lite, ...
--   compliance      -> allam-2-7b,          gemini-2.5-flash, ...
--   long_form       -> openai/gpt-oss-120b, allam-2-7b, gemini-2.5-flash
