-- ============================================================================
-- PER-AGENT POLICY OVERRIDES  (Gap D)
-- ----------------------------------------------------------------------------
-- The admin already has global (ai_platform_config), per-provider (ai_providers)
-- and per-model (ai_models / disabled_model_ids) controls, but nothing scoped to
-- a single agent role. This adds it:
--
--   public.ai_agent_policies       -- one row per AgentRole
--   public.get_ai_agent_policies() -- all rows as jsonb, for the client cache
--   public.get_ai_routing_plan(..., p_agent_role)
--                                  -- the router now also applies the agent
--                                     row's disabled_model_ids / force_model_id /
--                                     routing_mode_override server-side
--
-- baseAgent.executePrompt consults the same rows client-side (capability_override,
-- force_model_id, disabled_model_ids, max_retries_override, temperature_override,
-- and a hard "agent disabled by admin policy" stop).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_agent_policies (
  agent_role            TEXT PRIMARY KEY,
  enabled               BOOLEAN NOT NULL DEFAULT true,
  routing_mode_override TEXT
    CHECK (routing_mode_override IS NULL
           OR routing_mode_override IN ('free_first','balanced','quality_first','premium')),
  force_model_id        TEXT,
  disabled_model_ids    TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  max_retries_override  INTEGER CHECK (max_retries_override IS NULL
                                       OR (max_retries_override BETWEEN 0 AND 5)),
  temperature_override  NUMERIC CHECK (temperature_override IS NULL
                                       OR (temperature_override BETWEEN 0 AND 2)),
  capability_override   TEXT
    CHECK (capability_override IS NULL
           OR capability_override IN ('structured_json','reasoning','fast','compliance','long_form')),
  notes                 TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID
);

COMMENT ON TABLE public.ai_agent_policies IS
  'Per-agent-role routing overrides for the multi-agent course engine (Gap D).';

-- Seed every role in the AgentRole union (src/lib/ai/agents/types.ts) with a
-- permissive default row so the admin UI always has a card to edit.
INSERT INTO public.ai_agent_policies (agent_role) VALUES
  ('research'),
  ('curriculum'),
  ('knowledge'),
  ('content_writer'),
  ('activities'),
  ('scenarios'),
  ('assessments'),
  ('image_ai'),
  ('video_ai'),
  ('audio_ai'),
  ('qa_critic'),
  ('revision'),
  ('compliance'),
  ('translator')
ON CONFLICT (agent_role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. RLS — read: any authenticated; write: super_admin / corporate_admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_agent_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_agent_policies_select ON public.ai_agent_policies;
CREATE POLICY ai_agent_policies_select ON public.ai_agent_policies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ai_agent_policies_write ON public.ai_agent_policies;
CREATE POLICY ai_agent_policies_write ON public.ai_agent_policies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));

-- ---------------------------------------------------------------------------
-- 3. get_ai_agent_policies() — dump all rows for the client cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ai_agent_policies()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(
    jsonb_agg(to_jsonb(p) ORDER BY p.agent_role),
    '[]'::jsonb
  )
  FROM public.ai_agent_policies p;
$function$;

REVOKE ALL ON FUNCTION public.get_ai_agent_policies() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_agent_policies() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. get_ai_routing_plan — add optional p_agent_role (additive server-side filters)
--    Drop the old 4-arg version and recreate with the extra trailing param so
--    existing named-arg callers (the gateway) keep working unchanged.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_ai_routing_plan(text, boolean, boolean, integer);

CREATE OR REPLACE FUNCTION public.get_ai_routing_plan(
  p_capability    text,
  p_free_only     boolean DEFAULT false,
  p_allow_premium boolean DEFAULT false,
  p_limit         integer DEFAULT 8,
  p_agent_role    text    DEFAULT NULL
)
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

  -- An agent turned off by admin policy plans nothing.
  IF NOT v_agent_enabled THEN
    RETURN jsonb_build_object(
      'capability', p_capability,
      'modality', v_modality,
      'free_only', v_free_only,
      'routing_mode', v_routing_mode,
      'agent_role', p_agent_role,
      'agent_disabled', true,
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
        -- agent force_model_id wins outright, then platform force_enabled list
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
    'routing_mode', v_routing_mode,
    'agent_role', p_agent_role,
    'agent_disabled', false,
    'models', coalesce(v_result, '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_routing_plan(text, boolean, boolean, integer, text) TO authenticated, service_role;
