-- Capability-aware routing plan. One place (SQL) ranks eligible models for a
-- capability class, applying platform policy + provider health/cooldown.
-- Both the edge gateway and the client can call this.
CREATE OR REPLACE FUNCTION public.get_ai_routing_plan(
  p_capability text,               -- 'structured_json' | 'long_form' | 'fast' | 'reasoning' | 'compliance' | 'image' | 'embedding'
  p_free_only  boolean DEFAULT false,
  p_allow_premium boolean DEFAULT false,
  p_limit int DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE AS $$
DECLARE
  cfg              record;
  v_modality       text := CASE WHEN p_capability = 'image' THEN 'image'
                                WHEN p_capability = 'embedding' THEN 'embedding'
                                ELSE 'text' END;
  v_free_only      boolean;
  v_allow_premium  boolean;
  v_result         jsonb;
BEGIN
  SELECT free_only_mode, enabled_providers, disabled_model_ids, force_enabled_model_ids, routing_mode, allow_premium_images
    INTO cfg
  FROM public.ai_platform_config WHERE id = true;

  v_free_only     := p_free_only OR coalesce(cfg.free_only_mode, false);
  v_allow_premium := p_allow_premium OR CASE WHEN v_modality = 'image' THEN coalesce(cfg.allow_premium_images, false) ELSE true END;

  SELECT jsonb_agg(row_to_json(t) ORDER BY t.rank)
    INTO v_result
  FROM (
    SELECT
      m.id, m.provider, m.provider_model_id, m.modality, m.cost_tier, m.is_free,
      m.supports_json_object, m.supports_json_schema, m.image_generation, m.image_editing,
      m.quality_score, m.speed_score,
      row_number() OVER (ORDER BY
        -- forced models first
        (m.id = ANY (coalesce(cfg.force_enabled_model_ids, ARRAY[]::text[]))) DESC,
        -- free-first / balanced prefer free; quality_first / premium don't penalise paid
        CASE WHEN cfg.routing_mode IN ('free_first','balanced') THEN m.is_free ELSE true END DESC,
        -- capability-specific primary sort
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
      AND (m.provider = ANY (coalesce(cfg.enabled_providers, ARRAY['gemini','groq','openrouter','huggingface','cloudflare','recraft'])))
      AND pr.enabled
      AND (pr.health_status NOT IN ('auth_failed','quota_exhausted','disabled'))
      AND (pr.cooldown_until IS NULL OR pr.cooldown_until < now())
      AND (NOT v_free_only OR m.is_free)
      AND (v_allow_premium OR m.cost_tier <> 'premium')
      AND (p_capability <> 'structured_json' OR m.supports_json_object OR m.provider = 'recraft')
      AND (p_capability <> 'reasoning' OR 'deep_reasoning' = ANY (m.capabilities))
  ) t
  WHERE t.rank <= p_limit;

  RETURN jsonb_build_object(
    'capability', p_capability,
    'modality', v_modality,
    'free_only', v_free_only,
    'routing_mode', cfg.routing_mode,
    'models', coalesce(v_result, '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, int) TO authenticated, service_role;

-- helper for the health module / gateway to post provider health back
CREATE OR REPLACE FUNCTION public.set_ai_provider_health(
  p_provider text, p_status text, p_cooldown_seconds int DEFAULT NULL
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.ai_providers
     SET health_status = p_status,
         cooldown_until = CASE WHEN p_cooldown_seconds IS NULL THEN NULL ELSE now() + make_interval(secs => p_cooldown_seconds) END,
         updated_at = now()
   WHERE id = p_provider;
$$;
REVOKE ALL ON FUNCTION public.set_ai_provider_health(text, text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_health(text, text, int) TO authenticated, service_role;
