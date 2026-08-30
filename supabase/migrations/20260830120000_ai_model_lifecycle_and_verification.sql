-- ============================================================================
-- AI MODEL LIFECYCLE & VERIFICATION PIPELINE  (Gap C)
-- ----------------------------------------------------------------------------
-- `ai_models.availability` was hand-maintained. This migration adds the spine
-- for a real discovered -> API-tested -> capability-tested -> approved pipeline:
--
--   ai_models.verified_at / last_probe_ok / last_probe_at / capability_checked_at
--                                  -- per-model lifecycle timestamps
--   public.ai_model_probes         -- append-only log of every probe attempt
--   public.get_ai_model_verification_status()
--                                  -- all models (incl. disabled/unverified) +
--                                     recent probes, for the admin UI
--   public.run_model_verification(p_provider, p_only_unverified)
--                                  -- admin-invokable: fires the ai-model-verifier
--                                     edge function via pg_net
--   cron job `ai-model-verifier-nightly` (scheduled but INACTIVE by default)
--
-- The edge function (supabase/functions/ai-model-verifier) does the real work:
-- it lists each provider's live model catalog, upserts genuinely-new ids as
-- availability='unverified', enabled=false, then probes each unverified model
-- with a tiny real call. Verification only ever sets availability='verified' —
-- an admin still has to flip `enabled`. Nothing here auto-enables a model.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lifecycle columns on ai_models
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS verified_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_probe_ok         BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_probe_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capability_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_models.verified_at IS
  'Set by the verifier the first time a real API probe of this model succeeded.';
COMMENT ON COLUMN public.ai_models.last_probe_ok IS
  'Result of the most recent probe (any probe_type). NULL = never probed.';
COMMENT ON COLUMN public.ai_models.last_probe_at IS
  'Timestamp of the most recent probe of this model.';
COMMENT ON COLUMN public.ai_models.capability_checked_at IS
  'Last time a capability-specific probe (json mode / image) ran for this model.';

-- Backfill: models already marked verified predate the pipeline — treat their
-- existing availability as an implicit historical verification.
UPDATE public.ai_models
   SET verified_at = coalesce(verified_at, updated_at)
 WHERE availability = 'verified'
   AND verified_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. ai_model_probes — append-only probe log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_model_probes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    TEXT NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  probed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok          BOOLEAN NOT NULL,
  latency_ms  INTEGER,
  http_status INTEGER,
  detail      TEXT,
  probe_type  TEXT NOT NULL DEFAULT 'api' CHECK (probe_type IN ('api','capability'))
);

CREATE INDEX IF NOT EXISTS ai_model_probes_model_time_idx
  ON public.ai_model_probes (model_id, probed_at DESC);
CREATE INDEX IF NOT EXISTS ai_model_probes_time_idx
  ON public.ai_model_probes (probed_at DESC);

ALTER TABLE public.ai_model_probes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_model_probes_select ON public.ai_model_probes;
CREATE POLICY ai_model_probes_select ON public.ai_model_probes
  FOR SELECT TO authenticated USING (true);

-- Only super/corporate admin may hand-write probe rows; the edge function uses
-- the service role and bypasses RLS.
DROP POLICY IF EXISTS ai_model_probes_write ON public.ai_model_probes;
CREATE POLICY ai_model_probes_write ON public.ai_model_probes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
                 AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])));

-- ---------------------------------------------------------------------------
-- 3. get_ai_model_verification_status() — full catalog + recent probes
--    (get_ai_model_registry() only returns enabled models; the Verification UI
--     needs to see unverified/disabled/deprecated ones too.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ai_model_verification_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'models', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'provider', m.provider,
        'provider_model_id', m.provider_model_id,
        'display_name', m.display_name,
        'modality', m.modality,
        'cost_tier', m.cost_tier,
        'is_free', m.is_free,
        'supports_json_object', m.supports_json_object,
        'image_generation', m.image_generation,
        'availability', m.availability,
        'enabled', m.enabled,
        'quality_score', m.quality_score,
        'speed_score', m.speed_score,
        'verified_at', m.verified_at,
        'last_probe_ok', m.last_probe_ok,
        'last_probe_at', m.last_probe_at,
        'capability_checked_at', m.capability_checked_at
      ) ORDER BY m.provider, m.availability, m.id)
      FROM public.ai_models m
    ), '[]'::jsonb),
    'recent_probes', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'model_id', p.model_id,
        'probed_at', p.probed_at,
        'ok', p.ok,
        'latency_ms', p.latency_ms,
        'http_status', p.http_status,
        'detail', p.detail,
        'probe_type', p.probe_type
      ) ORDER BY p.probed_at DESC)
      FROM (
        SELECT * FROM public.ai_model_probes ORDER BY probed_at DESC LIMIT 100
      ) p
    ), '[]'::jsonb),
    'generated_at', now()
  );
$function$;

REVOKE ALL ON FUNCTION public.get_ai_model_verification_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_model_verification_status() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. run_model_verification() — admin trigger for the edge pipeline
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_model_verification(
  p_provider        text DEFAULT NULL,
  p_only_unverified boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_is_admin  boolean;
  v_key       text;
  v_req_id    bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
      AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin'])
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'run_model_verification: super_admin or corporate_admin required';
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'run_model_verification: vault secret service_role_key is not configured';
  END IF;

  SELECT net.http_post(
    url := 'https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/ai-model-verifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'mode', 'all',
      'provider', p_provider,
      'onlyUnverified', p_only_unverified,
      'source', 'run_model_verification_rpc'
    ),
    timeout_milliseconds := 120000
  ) INTO v_req_id;

  RETURN jsonb_build_object(
    'queued', true,
    'net_request_id', v_req_id,
    'provider', p_provider,
    'only_unverified', p_only_unverified
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.run_model_verification(text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.run_model_verification(text, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Nightly cron — scheduled but INACTIVE by default.
--    Flip `active` on in cron.job (or via the Supabase dashboard) to enable.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-model-verifier-nightly') THEN
    PERFORM cron.unschedule('ai-model-verifier-nightly');
  END IF;

  v_jobid := cron.schedule(
    'ai-model-verifier-nightly',
    '30 3 * * *',
    $cmd$
    SELECT net.http_post(
      url := 'https://dhbfaclkfysqwfppuxxa.supabase.co/functions/v1/ai-model-verifier',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{"mode":"all","onlyUnverified":true,"source":"cron"}'::jsonb,
      timeout_milliseconds := 120000
    );
    $cmd$
  );

  -- Scheduled but INACTIVE by default — flip active on to enable nightly runs.
  BEGIN
    PERFORM cron.alter_job(job_id := v_jobid, active := false);
  EXCEPTION WHEN insufficient_privilege OR undefined_function THEN
    RAISE NOTICE 'Could not deactivate ai-model-verifier-nightly automatically; disable it manually in cron.job.';
  END;
END $$;
