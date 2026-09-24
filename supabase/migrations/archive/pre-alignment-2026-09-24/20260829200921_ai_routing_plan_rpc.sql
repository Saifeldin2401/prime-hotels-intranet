-- ============================================================================
-- AI ROUTING PLAN + PROVIDER HEALTH RPCs  (audit Phase 2/3)
-- Split from 20260829200707_ai_provider_model_registry.sql — depends on
-- public.ai_models / public.ai_providers created there and
-- public.ai_platform_config from 20260827020314_ai_observability_and_platform_config.sql
-- ============================================================================

-- 4b. The authoritative router. Given a capability class + policy flags, return
--     the ranked list of models that (a) can serve that capability, (b) pass the
--     admin policy in ai_platform_config, (c) sit on a healthy, non-cooled-down
--     provider. The gateway walks this list in order and dispatches each model
--     to its provider's API.
CREATE OR REPLACE FUNCTION public.get_ai_routing_plan(
  p_capability    text,
  p_free_only     boolean DEFAULT false,
  p_allow_premium boolean DEFAULT false,
  p_limit         integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, integer) TO authenticated, service_role;

-- 4c. Health transitions. The gateway calls this after it sees an auth failure /
--     429 / quota error from a provider, with a cooldown so the router stops
--     planning that provider until the window passes.
CREATE OR REPLACE FUNCTION public.set_ai_provider_health(
  p_provider         text,
  p_status           text,
  p_cooldown_seconds integer DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  UPDATE public.ai_providers
     SET health_status = p_status,
         cooldown_until = CASE WHEN p_cooldown_seconds IS NULL THEN NULL
                               ELSE now() + make_interval(secs => p_cooldown_seconds) END,
         updated_at = now()
   WHERE id = p_provider;
$function$;

REVOKE ALL ON FUNCTION public.set_ai_provider_health(text, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_health(text, text, integer) TO authenticated, service_role;
