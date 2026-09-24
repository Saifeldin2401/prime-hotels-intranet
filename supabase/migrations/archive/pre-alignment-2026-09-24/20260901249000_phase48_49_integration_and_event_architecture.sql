-- ============================================================================
-- §48 — SSO / HRIS integration ARCHITECTURE (scaffolding; no live IdP wired).
--        `identity_providers` supports SAML / OIDC / Entra ID / Google Workspace /
--        Okta per tenant, with email-domain auto-routing + JIT provisioning flags.
-- §49 — API auth + event/webhook architecture:
--        service_accounts, api_keys (sha256 hash, scopes, expiry, revoke),
--        platform_events (append-only outbox), webhook_endpoints + deliveries.
--
-- All tenant-scoped via org_visible + is_tenant_admin; platform-level service
-- accounts / api keys require a platform operator. Secrets are never stored in
-- plaintext (config jsonb must not carry them; api_keys stores only the hash).
-- Full IdP wiring, key verification middleware, and the webhook dispatcher are
-- follow-up implementation work — this migration establishes the data model so
-- those can be added without a schema change.
-- ============================================================================
-- (identical to the applied statements — see migration history version 20260901249000)

CREATE TABLE IF NOT EXISTS public.identity_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('saml','oidc','entra_id','google_workspace','okta','custom')),
  display_name text NOT NULL,
  email_domain text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  jit_provisioning boolean NOT NULL DEFAULT true,
  default_membership_role text NOT NULL DEFAULT 'learner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_idp_org ON public.identity_providers (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_idp_domain ON public.identity_providers (lower(email_domain)) WHERE email_domain IS NOT NULL AND is_active;

CREATE TABLE IF NOT EXISTS public.service_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_account_id uuid NOT NULL REFERENCES public.service_accounts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_prefix text NOT NULL, key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_apikeys_sa ON public.api_keys (service_account_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_apikeys_hash ON public.api_keys (key_hash);

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid, resource_type text, resource_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pevents_org_time ON public.platform_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pevents_type ON public.platform_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL, secret text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhook_endpoints (organization_id);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.platform_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed','abandoned')),
  attempts integer NOT NULL DEFAULT 0, response_code integer, last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whd_status ON public.webhook_deliveries (status, created_at) WHERE status IN ('pending','failed');

ALTER TABLE public.identity_providers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idp_rw ON public.identity_providers;
CREATE POLICY idp_rw ON public.identity_providers FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

DROP POLICY IF EXISTS sa_rw ON public.service_accounts;
CREATE POLICY sa_rw ON public.service_accounts FOR ALL TO authenticated
  USING ((organization_id IS NULL AND public.is_platform_operator())
      OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)))
  WITH CHECK ((organization_id IS NULL AND public.platform_operator_has_role('platform_admin'))
      OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)));

DROP POLICY IF EXISTS ak_rw ON public.api_keys;
CREATE POLICY ak_rw ON public.api_keys FOR ALL TO authenticated
  USING ((organization_id IS NULL AND public.is_platform_operator())
      OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)))
  WITH CHECK ((organization_id IS NULL AND public.platform_operator_has_role('platform_admin'))
      OR (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id)));

DROP POLICY IF EXISTS pe_sel ON public.platform_events;
CREATE POLICY pe_sel ON public.platform_events FOR SELECT TO authenticated
  USING (public.is_platform_operator() OR public.org_visible(organization_id));

DROP POLICY IF EXISTS whe_rw ON public.webhook_endpoints;
CREATE POLICY whe_rw ON public.webhook_endpoints FOR ALL TO authenticated
  USING (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id))
  WITH CHECK (public.org_visible(organization_id) AND public.is_tenant_admin(organization_id));

DROP POLICY IF EXISTS whd_sel ON public.webhook_deliveries;
CREATE POLICY whd_sel ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (public.is_platform_operator() OR EXISTS (
    SELECT 1 FROM public.webhook_endpoints e WHERE e.id = webhook_deliveries.endpoint_id
      AND public.org_visible(e.organization_id) AND public.is_tenant_admin(e.organization_id)));

REVOKE ALL ON public.identity_providers, public.service_accounts, public.api_keys,
  public.platform_events, public.webhook_endpoints, public.webhook_deliveries FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identity_providers, public.service_accounts, public.api_keys, public.webhook_endpoints TO authenticated;
GRANT SELECT ON public.platform_events, public.webhook_deliveries TO authenticated;
GRANT ALL ON public.identity_providers, public.service_accounts, public.api_keys,
  public.platform_events, public.webhook_endpoints, public.webhook_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.emit_platform_event(
  p_event_type text, p_organization_id uuid, p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.platform_events (event_type, organization_id, actor_id, resource_type, resource_id, payload)
  VALUES (p_event_type, p_organization_id, auth.uid(), p_resource_type, p_resource_id, COALESCE(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.emit_platform_event(text,uuid,text,text,jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.emit_platform_event(text,uuid,text,text,jsonb) TO authenticated, service_role;
