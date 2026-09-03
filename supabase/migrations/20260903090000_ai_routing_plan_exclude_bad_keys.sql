-- AI course generator was slow because get_ai_routing_plan kept ranking
-- providers whose API key is invalid/missing (gemini at rank 1 on this project)
-- — the edge function then burned two dead round-trips before reaching Groq.
--
-- Exclude any provider whose key_status is 'invalid' or 'missing', and treat
-- 'unavailable' like the other hard-down health states. Reflect key reality on
-- the gemini/huggingface rows so the admin panel and the planner agree.
--
-- NOTE: applied to live (dhbfaclkfysqwfppuxxa) alongside an ai_platform_config
-- change trimming enabled_providers to ['groq','openrouter','recraft'] and
-- setting max_concurrency=6 / max_retries=1 / text_model_priority=[gpt-oss-*].

CREATE OR REPLACE FUNCTION public.get_ai_routing_plan(p_capability text, p_free_only boolean DEFAULT false, p_allow_premium boolean DEFAULT false, p_limit integer DEFAULT 8, p_agent_role text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  cfg              record;
  pol              record;
  v_modality       text := CASE WHEN p_capability = 'image' THEN 'image'
                                WHEN p_capability = 'embedding' THEN 'embedding'
                                ELSE 'text' END;
  v_free_only      boolean;
  v_allow_premium  boolean;
  v_routing_mode   text;
  v_agent_disabled text[] := ARRAY[]::text[];
  v_agent_force    text := NULL;
  v_agent_enabled  boolean := true;
  v_result         jsonb;
BEGIN
  SELECT free_only_mode, enabled_providers, disabled_model_ids, force_enabled_model_ids, routing_mode, allow_premium_images
    INTO cfg
  FROM public.ai_platform_config WHERE id = true;

  IF p_agent_role IS NOT NULL THEN
    SELECT enabled, routing_mode_override, force_model_id, disabled_model_ids
      INTO pol
    FROM public.ai_agent_policies WHERE agent_role = p_agent_role;
    IF FOUND THEN
      v_agent_enabled  := coalesce(pol.enabled, true);
      v_agent_disabled := coalesce(pol.disabled_model_ids, ARRAY[]::text[]);
      v_agent_force    := pol.force_model_id;
    END IF;
  END IF;

  v_free_only     := p_free_only OR coalesce(cfg.free_only_mode, false);
  v_allow_premium := p_allow_premium OR CASE WHEN v_modality = 'image' THEN coalesce(cfg.allow_premium_images, false) ELSE true END;
  v_routing_mode  := coalesce(
                       (SELECT routing_mode_override FROM public.ai_agent_policies WHERE agent_role = p_agent_role),
                       cfg.routing_mode
                     );

  IF NOT v_agent_enabled THEN
    RETURN jsonb_build_object(
      'capability', p_capability, 'modality', v_modality, 'free_only', v_free_only,
      'routing_mode', v_routing_mode, 'agent_role', p_agent_role, 'agent_disabled', true,
      'models', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_agg(row_to_json(t) ORDER BY t.rank)
    INTO v_result
  FROM (
    SELECT
      m.id, m.provider, m.provider_model_id, m.modality, m.cost_tier, m.is_free,
      m.supports_json_object, m.supports_json_schema, m.image_generation, m.image_editing,
      m.quality_score, m.speed_score,
      row_number() OVER (ORDER BY
        (v_agent_force IS NOT NULL AND m.id = v_agent_force) DESC,
        (m.id = ANY (coalesce(cfg.force_enabled_model_ids, ARRAY[]::text[]))) DESC,
        CASE WHEN v_routing_mode IN ('free_first','balanced') THEN m.is_free ELSE true END DESC,
        CASE p_capability
          WHEN 'structured_json' THEN (m.supports_json_schema::int * 1000 + m.supports_json_object::int * 500 + m.quality_score)
          WHEN 'reasoning'       THEN (('deep_reasoning' = ANY (m.capabilities))::int * 1000 + m.quality_score)
          WHEN 'fast'            THEN m.speed_score
          WHEN 'compliance'      THEN (('arabic_native' = ANY (m.capabilities))::int * 300 + m.supports_json_object::int * 200 + m.quality_score)
          WHEN 'image'           THEN m.quality_score
          ELSE m.quality_score
        END DESC,
        m.speed_score DESC
      ) AS rank
    FROM public.ai_models m
    JOIN public.ai_providers pr ON pr.id = m.provider
    WHERE m.enabled
      AND m.availability = 'verified'
      AND m.modality = v_modality
      AND m.id <> ALL (coalesce(cfg.disabled_model_ids, ARRAY[]::text[]))
      AND m.id <> ALL (v_agent_disabled)
      AND (m.provider = ANY (coalesce(cfg.enabled_providers, ARRAY['gemini','groq','openrouter','huggingface','cloudflare','recraft'])))
      AND pr.enabled
      AND (pr.health_status NOT IN ('auth_failed','quota_exhausted','disabled','unavailable'))
      AND (pr.key_status NOT IN ('invalid','missing'))
      AND (pr.cooldown_until IS NULL OR pr.cooldown_until < now())
      AND (NOT v_free_only OR m.is_free)
      AND (v_allow_premium OR m.cost_tier <> 'premium')
      AND (p_capability <> 'structured_json' OR m.supports_json_object OR m.provider = 'recraft')
      AND (p_capability <> 'reasoning' OR 'deep_reasoning' = ANY (m.capabilities))
  ) t
  WHERE t.rank <= p_limit;

  RETURN jsonb_build_object(
    'capability', p_capability, 'modality', v_modality, 'free_only', v_free_only,
    'routing_mode', v_routing_mode, 'agent_role', p_agent_role, 'agent_disabled', false,
    'models', coalesce(v_result, '[]'::jsonb)
  );
END;
$function$;

UPDATE public.ai_providers
   SET health_status = 'auth_failed',
       cooldown_until = now() + interval '30 days'
 WHERE id IN ('gemini','huggingface')
   AND key_status = 'invalid'
   AND health_status <> 'auth_failed';
