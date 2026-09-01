import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://altus-advisory.com",
  "https://www.altus-advisory.com",
  "https://connect.altusadvisory.com",
  "https://prime-hotels-intranet.vercel.app",
  "https://www.phg-connect.com",
  "https://phg-connect.com",
] as const;

export function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];
  const parsed = raw.split(",").map((origin: string) => origin.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

export function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();
  if (!origin) return allowedOrigins[0] || "https://www.altus-advisory.com";
  const cleanOrigin = origin.trim().replace(/\/$/, "");
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/.test(cleanOrigin);
  if (isLocalDevOrigin) return origin;
  const isAllowed = allowedOrigins.some((ao) => ao.trim().replace(/\/$/, "") === cleanOrigin);
  return isAllowed ? origin : allowedOrigins[0] || "https://www.altus-advisory.com";
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

export function isAuthorizedServiceRole(authHeader: string | null, serviceRoleKey: string): boolean {
  const expected = `Bearer ${serviceRoleKey}`;
  const actual = authHeader ?? "";
  if (actual.length !== expected.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function isAuthorizedServiceRoleRequest(authHeader: string | null, serviceRoleKey: string): boolean {
  return Boolean(serviceRoleKey) && isAuthorizedServiceRole(authHeader, serviceRoleKey);
}

type SupportedAiTask = "chat" | "summarization" | "generation" | "translation" | "triage";
type PreferredProvider = "gemini" | "groq" | "openrouter" | "huggingface" | "cloudflare" | "together" | "openai";

interface ParsedAiRequest {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  task: SupportedAiTask;
  preferredProvider?: PreferredProvider;
  temperature?: number;
  max_tokens?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  pinProvider?: boolean;
  capability?: string;
  agentRole?: string;
}

// OpenRouter retired the entire ":free" tier for mainstream models (all 404 →
// "use the paid slug"). Legacy ids now map to real, cheap paid slugs.
const LEGACY_MODEL_MAP: Record<string, string> = {
  "Qwen/Qwen2.5-7B-Instruct": "qwen/qwen-2.5-72b-instruct",
  "Qwen/Qwen2.5-72B-Instruct": "qwen/qwen-2.5-72b-instruct",
  "Qwen/Qwen2.5-14B-Instruct": "qwen/qwen-2.5-72b-instruct",
  "Qwen/Qwen2.5-32B-Instruct": "qwen/qwen-2.5-72b-instruct",
  "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/Llama-3.1-8B-Instruct": "meta-llama/llama-3.3-70b-instruct",
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash": "google/gemini-2.5-flash-lite",
  "anthropic/claude-3.5-sonnet": "anthropic/claude-haiku-4.5",
  "anthropic/claude-3.7-sonnet": "anthropic/claude-opus-4.5",
  "default": "openrouter/auto",
};

// Verified live via the Google AI Studio ListModels API. gemini-2.0-flash is retired.
const DEFAULT_GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
];

const CF_TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// ── Real cost accounting ────────────────────────────────────────────────────
// Fallback price table (USD per 1,000,000 tokens, input / output) for the models
// actually in rotation. Used when public.ai_models has no price row for the id.
// Prices are widely-published provider list prices (Jan 2026). groq gpt-oss /
// compound / allam resolve on a free Groq account => $0. Cloudflare Workers AI
// text + HF serverless router are effectively free tier here.
const FALLBACK_MODEL_PRICING: Record<string, { pin: number; pout: number }> = {
  "openai/gpt-oss-120b": { pin: 0, pout: 0 },
  "openai/gpt-oss-20b": { pin: 0, pout: 0 },
  "openai/gpt-oss-safeguard-20b": { pin: 0, pout: 0 },
  "allam-2-7b": { pin: 0, pout: 0 },
  "groq/compound": { pin: 0, pout: 0 },
  "groq/compound-mini": { pin: 0, pout: 0 },
  "gemini-2.5-flash": { pin: 0.3, pout: 2.5 },
  "gemini-flash-latest": { pin: 0.3, pout: 2.5 },
  "gemini-2.5-flash-lite": { pin: 0.1, pout: 0.4 },
  "gemini-3.1-flash-lite": { pin: 0.1, pout: 0.4 },
  "@cf/meta/llama-3.1-8b-instruct": { pin: 0, pout: 0 },
  "mistralai/Mistral-7B-Instruct-v0.3": { pin: 0, pout: 0 },
  "Qwen/Qwen2.5-72B-Instruct": { pin: 0, pout: 0 },
  "google/gemini-2.5-flash-lite": { pin: 0.1, pout: 0.4 },
  "google/gemini-2.5-flash": { pin: 0.3, pout: 2.5 },
  "openai/gpt-4o-mini": { pin: 0.15, pout: 0.6 },
  "openai/gpt-4o": { pin: 2.5, pout: 10.0 },
  "anthropic/claude-haiku-4.5": { pin: 1.0, pout: 5.0 },
  "anthropic/claude-opus-4.5": { pin: 5.0, pout: 25.0 },
  "deepseek/deepseek-chat": { pin: 0.28, pout: 0.88 },
  "deepseek/deepseek-chat-v3-0324": { pin: 0.28, pout: 0.88 },
  "deepseek/deepseek-r1": { pin: 0.55, pout: 2.19 },
  "meta-llama/llama-3.3-70b-instruct": { pin: 0.12, pout: 0.3 },
  "meta-llama/Llama-3.3-70B-Instruct-Turbo": { pin: 0.88, pout: 0.88 },
  "Qwen/Qwen2.5-72B-Instruct-Turbo": { pin: 1.2, pout: 1.2 },
  "meta-llama/Llama-3.1-8B-Instruct-Turbo": { pin: 0.18, pout: 0.18 },
  "qwen/qwen-2.5-72b-instruct": { pin: 0.12, pout: 0.39 },
};

interface ProviderUsage {
  prompt: number;
  completion: number;
  total: number;
}

/**
 * Pull the provider's *reported* token usage out of a raw JSON response body.
 * OpenAI-compatible (groq / openrouter / together / hf router / cloudflare):
 *   data.usage.{prompt_tokens,completion_tokens,total_tokens}
 * Gemini: data.usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}
 * Returns null when nothing usable is present.
 */
function extractProviderUsage(provider: string, data: unknown): ProviderUsage | null {
  try {
    const d = data as Record<string, any>;
    if (provider === "gemini") {
      const u = d?.usageMetadata;
      if (u && (u.promptTokenCount != null || u.totalTokenCount != null)) {
        const p = Number(u.promptTokenCount) || 0;
        const c = Number(u.candidatesTokenCount) || 0;
        return { prompt: p, completion: c, total: Number(u.totalTokenCount) || p + c };
      }
      return null;
    }
    const u = d?.usage || d?.result?.usage;
    if (u && (u.prompt_tokens != null || u.total_tokens != null)) {
      const p = Number(u.prompt_tokens) || 0;
      const c = Number(u.completion_tokens) || 0;
      return { prompt: p, completion: c, total: Number(u.total_tokens) || p + c };
    }
    return null;
  } catch {
    return null;
  }
}

// Probed live 2026-08-29 against the configured GROQ_API_KEY: the Llama / Qwen /
// Gemma / Kimi ids all return 404 "model does not exist or you do not have access".
// Only these chat models resolve on this account (gpt-oss + compound + allam).
const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
];

// All real, live OpenRouter slugs (verified via openrouter.ai/api/v1/models),
// cheapest-first. No ":free" — that tier is dead for mainstream models.
const DEFAULT_OPENROUTER_MODELS = [
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4o-mini",
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-chat",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "deepseek/deepseek-r1",
  "anthropic/claude-haiku-4.5",
  "google/gemini-2.5-flash",
  "openai/gpt-4o",
  "anthropic/claude-opus-4.5",
  "openrouter/auto",
];

const DEFAULT_TOGETHER_MODELS = [
  "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "Qwen/Qwen2.5-72B-Instruct-Turbo",
  "meta-llama/Llama-3.1-8B-Instruct-Turbo",
];

const DEFAULT_HF_MODELS = [
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
];

function resolveModelCandidates(requestedModel?: string): string[] {
  let primary = requestedModel?.trim();
  if (primary && LEGACY_MODEL_MAP[primary]) {
    primary = LEGACY_MODEL_MAP[primary];
  }
  if (!primary || primary === "auto" || primary === "openrouter/auto" || primary === "free") {
    return [...DEFAULT_OPENROUTER_MODELS];
  }
  const list = [primary, ...DEFAULT_OPENROUTER_MODELS.filter((m) => m !== primary)];
  return Array.from(new Set(list));
}

function parseAiRequest(input: unknown): ParsedAiRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid AI request payload.");
  }
  const body = input as Record<string, any>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    throw new Error("AI prompt is required.");
  }
  const taskValue = typeof body.task === "string" ? body.task : "chat";
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : undefined;
  const providerValue =
    typeof body.provider === "string" && body.provider.trim().length > 0
      ? (body.provider.trim() as PreferredProvider)
      : undefined;
  return {
    model:
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : undefined,
    prompt,
    systemPrompt,
    task: taskValue as SupportedAiTask,
    preferredProvider: providerValue,
    temperature: typeof body.temperature === "number" ? body.temperature : undefined,
    max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined,
    maxOutputTokens: typeof body.maxOutputTokens === "number" ? body.maxOutputTokens : undefined,
    stream: Boolean(body.stream),
    jsonMode: Boolean(body.jsonMode),
    pinProvider: Boolean(body.pinProvider),
    capability: typeof body.capability === "string" ? body.capability : undefined,
    agentRole: typeof body.agentRole === "string" && body.agentRole.trim().length > 0
      ? body.agentRole.trim()
      : undefined,
  };
}

const normalizeTemperature = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.7;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
};

const normalizeMaxTokens = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 2048;
  return Math.max(1, Math.min(8000, Math.floor(n)));
};

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  const jsonResponse = (payload: unknown, status = 200) => {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestStart = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    const apiKeyHeader = req.headers.get("apikey") ?? "";
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header", success: false }, 401);
    }

    const rawToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const isServiceRoleCall = isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey);

    const decodeJwt = (t: string): Record<string, unknown> | null => {
      try {
        const parts = t.split(".");
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      } catch {
        return null;
      }
    };

    const authClaims = decodeJwt(rawToken);
    const apiKeyClaims = apiKeyHeader ? decodeJwt(apiKeyHeader) : null;
    const jwtRole = (authClaims?.role as string) || "anon";

    const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] ?? "";
    const looksLikeSupabaseKey = (claims: Record<string, unknown> | null, raw: string) =>
      (claims?.iss === "supabase" && (!projectRef || claims?.ref === projectRef)) ||
      raw === anonKey ||
      raw.startsWith("sb_publishable_") ||
      raw.startsWith("sb_secret_");
    const isAnonKeyCall =
      looksLikeSupabaseKey(authClaims, rawToken) ||
      looksLikeSupabaseKey(apiKeyClaims, apiKeyHeader) ||
      (Boolean(anonKey) && (rawToken === anonKey || apiKeyHeader === anonKey));

    let authUserId: string | null = null;
    let isVerifiedUser = false;
    if (!isServiceRoleCall && jwtRole === "authenticated") {
      try {
        const authClient = createClient(supabaseUrl, anonKey || rawToken, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await authClient.auth.getUser();
        if (!error && data?.user?.id) {
          isVerifiedUser = true;
          authUserId = data.user.id;
        }
      } catch (authErr) {
        console.warn("User token verification failed:", authErr);
      }
    }

    if (!isServiceRoleCall && !isVerifiedUser && !isAnonKeyCall) {
      return jsonResponse({ error: "Unauthorized: invalid or expired token", success: false }, 401);
    }

    let callerOrgId: string | null = null;
    if (authUserId && !isServiceRoleCall) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: isOp } = await adminClient.rpc("is_platform_operator", {
          p_user_id: authUserId,
        });

        if (!isOp) {
          if (authUserId) {
            const { data: withinLimit } = await adminClient.rpc("check_user_rate_limit", {
              p_action: "ai_request",
              p_max_requests: 60,
              p_window_seconds: 60,
            });
            if (withinLimit === false) {
              return jsonResponse(
                { error: "Rate limit exceeded. Please wait a moment before sending more AI requests.", success: false },
                429
              );
            }
          }

          const { data: userMembership } = await adminClient
            .from("organization_memberships")
            .select("organization_id")
            .eq("user_id", authUserId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          if (userMembership?.organization_id) {
            callerOrgId = userMembership.organization_id;
            const { data: isOperational } = await adminClient.rpc("org_is_operational", {
              p_org_id: callerOrgId,
            });
            if (isOperational === false) {
              return jsonResponse(
                { error: "Forbidden: Your organization is suspended or inactive.", success: false },
                403
              );
            }

            const { data: hasAiCredit } = await adminClient.rpc("check_ai_credit", {
              p_org_id: callerOrgId,
            });
            if (hasAiCredit === false) {
              return jsonResponse(
                { error: "Monthly AI credit limit reached for this organization.", success: false },
                429
              );
            }
          }
        }
      } catch (orgCheckErr) {
        console.warn("Organization operational/quota check warning:", orgCheckErr);
      }
    }

    const { model, prompt, systemPrompt, task, preferredProvider, temperature, max_tokens, maxOutputTokens, stream, jsonMode, pinProvider, capability, agentRole } =
      parseAiRequest(await req.json());

    const effectiveTemperature = normalizeTemperature(temperature);
    const effectiveMaxTokens = normalizeMaxTokens(max_tokens ?? maxOutputTokens);
    const currentTask = task || "chat";

    const defaultSystemPrompt =
      systemPrompt ||
      (currentTask === "summarization"
        ? "You are an expert hospitality operations analyst. Summarize the content concisely into structured key bullet points."
        : jsonMode
          ? "You are an expert luxury hotel operations AI. Respond ONLY with valid, minified JSON matching the requested structure."
          : "You are the ALTUS Connect AI Assistant, an elite hospitality operations intelligence system for luxury hotels. Provide professional, concise, and highly accurate guidance.");

    let OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
    let GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY") || "";
    let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
    const HF_MINIMAX_TOKEN = Deno.env.get("HUGGINGFACE_MINIMAX_TOKEN");
    let CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
    let CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN") || Deno.env.get("CLOUDFLARE_API_KEY") || "";

    // Admin control surface (ai_platform_config singleton) — governs which
    // providers/models this function may use and in what cost order.
    const ALL_PROVIDERS = ["gemini", "groq", "openrouter", "huggingface", "cloudflare", "recraft"];
    let policy = {
      freeOnly: false,
      routingMode: "free_first" as string,
      enabledProviders: ALL_PROVIDERS as string[],
      disabledModelIds: [] as string[],
    };

    // Per-request cache of the ai_models price table (input/output $ per 1M tokens),
    // keyed by BOTH the model id and its provider_model_id so either the routing
    // plan's `pm.id` or a legacy provider model string resolves.
    const modelPricing: Record<string, { pin: number; pout: number; src: string }> = {};

    if (serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
        if (!GEMINI_API_KEY) {
          const { data: gKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });
          if (gKey && typeof gKey === "string") GEMINI_API_KEY = gKey;
        }
        if (!OPENROUTER_API_KEY) {
          const { data: oKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "OPENROUTER_API_KEY" });
          if (oKey && typeof oKey === "string") OPENROUTER_API_KEY = oKey;
        }
        if (!GROQ_API_KEY) {
          const { data: grKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "GROQ_API_KEY" });
          if (grKey && typeof grKey === "string") GROQ_API_KEY = grKey;
        }
        if (!CF_ACCOUNT_ID) {
          const { data: cfa } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "CLOUDFLARE_ACCOUNT_ID" });
          if (cfa && typeof cfa === "string") CF_ACCOUNT_ID = cfa;
        }
        if (!CF_API_TOKEN) {
          const { data: cft } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "CLOUDFLARE_API_TOKEN" });
          if (cft && typeof cft === "string") CF_API_TOKEN = cft;
        }
        try {
          const { data: cfgRow } = await supabaseAdmin
            .from("ai_platform_config")
            .select("free_only_mode,enabled_providers,routing_mode,disabled_model_ids")
            .eq("id", true)
            .maybeSingle();
          if (cfgRow) {
            policy = {
              freeOnly: Boolean(cfgRow.free_only_mode),
              routingMode: cfgRow.routing_mode || "free_first",
              enabledProviders: Array.isArray(cfgRow.enabled_providers) && cfgRow.enabled_providers.length
                ? cfgRow.enabled_providers
                : ALL_PROVIDERS,
              disabledModelIds: Array.isArray(cfgRow.disabled_model_ids) ? cfgRow.disabled_model_ids : [],
            };
          }
        } catch (cfgErr) {
          console.warn("ai_platform_config lookup skipped:", cfgErr);
        }
        try {
          const { data: priceRows } = await supabaseAdmin
            .from("ai_models")
            .select("id,provider_model_id,price_input_per_mtok,price_output_per_mtok");
          for (const row of (priceRows as Array<Record<string, any>> | null) ?? []) {
            const pin = row.price_input_per_mtok;
            const pout = row.price_output_per_mtok;
            if (pin == null && pout == null) continue;
            const entry = { pin: Number(pin) || 0, pout: Number(pout) || 0, src: "ai_models" };
            if (row.id) modelPricing[row.id] = entry;
            if (row.provider_model_id) modelPricing[row.provider_model_id] = entry;
          }
        } catch (priceErr) {
          console.warn("ai_models pricing lookup skipped:", priceErr);
        }
      } catch (vaultErr) {
        console.warn("Vault secret lookup warning in process-ai-request:", vaultErr);
      }
    }

    const providerEnabled = (p: string) => policy.enabledProviders.includes(p);
    const modelAllowed = (m: string) => !policy.disabledModelIds.includes(m);
    // ":free" models only under free-only. "openrouter/auto" can pick paid models, so it is NOT free.
    const isFreeOrModel = (m: string) => m.includes(":free");
    // quality_first / premium → try the flagship paid models before the free ones.
    const orderedOpenRouter = (list: string[]) => {
      let out = list.filter(modelAllowed);
      if (policy.freeOnly) out = out.filter(isFreeOrModel);
      if (policy.routingMode === "quality_first" || policy.routingMode === "premium") {
        const paid = out.filter((m) => !isFreeOrModel(m));
        const free = out.filter(isFreeOrModel);
        out = [...paid, ...free];
      }
      return out;
    };

    // DIAGNOSTIC: pin to exactly one provider, no cross-provider fall-through.
    // Used by the admin "Test Ping" so it can tell whether THAT provider is
    // actually reachable, not just whether the gateway found some answer.
    if (pinProvider && preferredProvider) {
      const p = preferredProvider;
      const sys = defaultSystemPrompt;
      const attempt = async (): Promise<{ ok: boolean; model: string; detail: string }> => {
        try {
          if (p === "gemini") {
            const gm = model && model.includes("gemini") ? model : DEFAULT_GEMINI_MODELS[0];
            if (!GEMINI_API_KEY) return { ok: false, model: gm, detail: "no GEMINI_API_KEY configured" };
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gm}:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: effectiveMaxTokens } }),
              signal: AbortSignal.timeout(20000),
            });
            if (!r.ok) return { ok: false, model: gm, detail: `${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}` };
            const d = await r.json();
            return { ok: Boolean(d?.candidates?.[0]?.content?.parts?.[0]?.text), model: gm, detail: "ok" };
          }
          if (p === "groq") {
            const gm = model || DEFAULT_GROQ_MODELS[0];
            if (!GROQ_API_KEY) return { ok: false, model: gm, detail: "no GROQ_API_KEY configured" };
            const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST", headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: gm, messages: [{ role: "user", content: prompt }], max_tokens: Math.max(effectiveMaxTokens, 64) }),
              signal: AbortSignal.timeout(20000),
            });
            if (!r.ok) return { ok: false, model: gm, detail: `${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}` };
            const d = await r.json();
            return { ok: Boolean(d?.choices?.[0]?.message?.content), model: gm, detail: "ok" };
          }
          if (p === "openrouter") {
            const om = (model && model.includes("/")) ? model : DEFAULT_OPENROUTER_MODELS[0];
            if (!OPENROUTER_API_KEY) return { ok: false, model: om, detail: "no OPENROUTER_API_KEY configured" };
            const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST", headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "Altus Connect", "Content-Type": "application/json" },
              body: JSON.stringify({ model: om, messages: [{ role: "user", content: prompt }], max_tokens: Math.max(effectiveMaxTokens, 32) }),
              signal: AbortSignal.timeout(25000),
            });
            if (!r.ok) return { ok: false, model: om, detail: `${r.status} ${(await r.text().catch(() => "")).slice(0, 140)}` };
            const d = await r.json();
            return { ok: Boolean(d?.choices?.[0]?.message?.content), model: om, detail: "ok" };
          }
          if (p === "cloudflare") {
            const cm = (model && model.startsWith("@cf/")) ? model : CF_TEXT_MODEL;
            if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return { ok: false, model: cm, detail: "no CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN configured" };
            const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${cm}`, {
              method: "POST", headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: Math.min(effectiveMaxTokens, 256) }),
              signal: AbortSignal.timeout(20000),
            });
            if (!r.ok) return { ok: false, model: cm, detail: `${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}` };
            const d = await r.json();
            return { ok: Boolean(d?.result?.response || d?.response), model: cm, detail: "ok" };
          }
          if (p === "huggingface") {
            if (!HF_TOKEN && !HF_MINIMAX_TOKEN) return { ok: false, model: DEFAULT_HF_MODELS[0], detail: "no HUGGINGFACE_TOKEN configured" };
            const hm = DEFAULT_HF_MODELS[0];
            const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
              method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN || HF_MINIMAX_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: hm, messages: [{ role: "user", content: prompt }], max_tokens: 32 }),
              signal: AbortSignal.timeout(20000),
            });
            if (!r.ok) return { ok: false, model: hm, detail: `${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}` };
            const d = await r.json();
            return { ok: Boolean(d?.choices?.[0]?.message?.content), model: hm, detail: "ok" };
          }
          return { ok: false, model: model || p, detail: `no diagnostic path for provider "${p}"` };
        } catch (e) {
          return { ok: false, model: model || p, detail: (e as Error).message.slice(0, 160) };
        }
      };
      void sys;
      if (!providerEnabled(p) && p !== "openrouter") {
        return jsonResponse({ success: false, pinnedProvider: p, error: `provider "${p}" is disabled in ai_platform_config` }, 200);
      }
      const outcome = await attempt();
      return jsonResponse({
        success: outcome.ok,
        pinnedProvider: p,
        meta: { providerUsed: outcome.ok ? p : "none", modelUsed: outcome.model },
        error: outcome.ok ? undefined : outcome.detail,
      }, 200);
    }

    // TASK: IMAGE GENERATION
    if (
      currentTask === "image_generation" ||
      model?.includes("imagen") ||
      model?.includes("banana") ||
      model?.includes("recraft") ||
      model?.includes("seedream") ||
      model?.includes("flux") ||
      model?.includes("grok") ||
      model?.includes("gpt-image")
    ) {
      const cleanPrompt = prompt.replace(/[^\x20-\x7E؀-ۿ,.-]/g, " ").trim();

      // 1. OpenRouter image models (funded paid account). Real ids verified live via
      //    https://openrouter.ai/api/v1/models — image output comes back in message.images[].
      //    Skipped when the admin forces free-only or disables the openrouter provider.
      if (OPENROUTER_API_KEY && !policy.freeOnly && providerEnabled("openrouter")) {
        const requestedOr = model && model.includes("/") && !model.startsWith("@cf/")
          ? model.replace(/-preview$/, "")
          : null;
        const orImageModels = Array.from(new Set([
          ...(requestedOr ? [requestedOr] : []),
          "google/gemini-3-pro-image",
          "google/gemini-2.5-flash-image",
          "google/gemini-3.1-flash-image",
        ]));
        for (const orModel of orImageModels) {
          try {
            const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://phg-connect.com",
                "X-Title": "Altus Connect",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ model: orModel, modalities: ["image", "text"], messages: [{ role: "user", content: cleanPrompt }] }),
              signal: AbortSignal.timeout(45000),
            });
            if (r.ok) {
              const d = await r.json();
              const imgs = d?.choices?.[0]?.message?.images || [];
              const url: string | undefined = imgs[0]?.image_url?.url || imgs[0]?.url;
              if (url) {
                return jsonResponse({ success: true, image_url: url, provider: "openrouter", model: orModel });
              }
            }
          } catch { /* next model */ }
        }
      }

      if (GEMINI_API_KEY && providerEnabled("gemini")) {
        // Imagen :predict is paid — skipped under free-only (the free gemini-flash-image below still runs).
        for (const gm of (policy.freeOnly ? [] : ["imagen-4.0-generate-001", "imagen-3.0-generate-002"])) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gm}:predict?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ instances: [{ prompt: cleanPrompt }], parameters: { sampleCount: 1, aspectRatio: "16:9", personGeneration: "ALLOW_ADULT" } }),
              signal: AbortSignal.timeout(30000),
            });
            if (r.ok) {
              const d = await r.json();
              const b64 = d?.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                return jsonResponse({ success: true, image_url: `data:image/png;base64,${b64}`, provider: "gemini", model: gm });
              }
            }
          } catch { /* next */ }
        }
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: cleanPrompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) {
            const d = await r.json();
            for (const p of (d?.candidates?.[0]?.content?.parts || [])) {
              if (p.inlineData?.data) {
                const mime = p.inlineData.mimeType || "image/png";
                return jsonResponse({ success: true, image_url: `data:${mime};base64,${p.inlineData.data}`, provider: "gemini", model: "gemini-2.5-flash-image" });
              }
            }
          }
        } catch { /* fall through */ }
      }

      // (Direct OpenAI image gen removed — redundant with OpenRouter, and gpt-image-1
      //  needs org verification. Image gen for this function is OpenRouter + Gemini.)

      return jsonResponse({
        success: false,
        error: "Image generation unavailable: no configured provider produced an image (check OPENROUTER / GEMINI keys and quotas).",
      }, 502);
    }

    if (!OPENROUTER_API_KEY && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
        const { data: vKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "OPENROUTER_API_KEY" });
        if (vKey && typeof vKey === "string") OPENROUTER_API_KEY = vKey;
      } catch (vaultErr) {
        console.warn("Vault secret lookup warning:", vaultErr);
      }
    }

    const openRouterCandidates = orderedOpenRouter(resolveModelCandidates(model));
    // DB-backed capability router (audit Phase 2). When the caller names a
    // capability class we ask the DB for the ranked, policy- and health-aware
    // model list; falls back to the hardcoded provider loops if unavailable.
    type PlanModel = { id: string; provider: string; provider_model_id: string; supports_json_object?: boolean };
    let routingPlan: PlanModel[] = [];
    if (capability && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
        const { data: planData } = await supabaseAdmin.rpc("get_ai_routing_plan", {
          p_capability: capability, p_free_only: policy.freeOnly, p_allow_premium: !policy.freeOnly, p_limit: 10,
          p_agent_role: agentRole ?? null,
        });
        const arr = (planData as { models?: PlanModel[] } | null)?.models;
        if (Array.isArray(arr)) routingPlan = arr.filter((m) => modelAllowed(m.id) && providerEnabled(m.provider));
      } catch (planErr) {
        console.warn("routing-plan lookup failed, using legacy cascade:", planErr);
      }
    }
    let providerUsed = "none";
    let modelUsed = openRouterCandidates[0] || "openrouter/auto";

    // Real provider-reported token usage for the call that ultimately succeeds.
    let providerUsage: ProviderUsage | null = null;
    const recordUsage = (provider: string, data: unknown) => {
      const u = extractProviderUsage(provider, data);
      if (u) providerUsage = u;
    };
    // model id -> {input,output $/1M tokens, source}. DB table first, then the
    // hardcoded fallback table, else null (=> heuristic cost downstream).
    const resolvePricing = (id: string): { pin: number; pout: number; src: string } | null => {
      if (modelPricing[id]) return modelPricing[id];
      const fb = FALLBACK_MODEL_PRICING[id];
      return fb ? { pin: fb.pin, pout: fb.pout, src: "gateway_fallback_table" } : null;
    };

    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventData: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
          };
          try {
            let streamSuccess = false;
            let streamedText = "";
            const streamDiagnostics: string[] = [];
            if (!streamSuccess && OPENROUTER_API_KEY && providerEnabled("openrouter")) {
              for (const candModel of openRouterCandidates) {
                try {
                  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "Altus Connect", "Content-Type": "application/json" },
                    body: JSON.stringify({ model: candModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, stream: true, stream_options: { include_usage: true } }),
                    signal: AbortSignal.timeout(50000),
                  });
                  if (orRes.ok && orRes.body) {
                    providerUsed = "openrouter";
                    modelUsed = candModel;
                    const reader = orRes.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";
                    let hadTokens = false;
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split("\n");
                      buffer = lines.pop() || "";
                      for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed === "data: [DONE]") continue;
                        if (trimmed.startsWith("data:")) {
                          try {
                            const json = JSON.parse(trimmed.slice(5).trim());
                            const textChunk = json?.choices?.[0]?.delta?.content;
                            if (textChunk) { hadTokens = true; streamedText += textChunk; sendEvent({ chunk: textChunk, done: false }); }
                            if (json?.usage) recordUsage("openrouter", json);
                          } catch { /* skip */ }
                        }
                      }
                    }
                    if (hadTokens) { streamSuccess = true; break; }
                  } else {
                    streamDiagnostics.push(`OpenRouter ${candModel} (${orRes.status}): ${await orRes.text().catch(() => "")}`);
                  }
                } catch (orErr) {
                  streamDiagnostics.push(`OpenRouter ${candModel} error: ${(orErr as Error).message}`);
                }
              }
            }
            if (!streamSuccess && GROQ_API_KEY && providerEnabled("groq")) {
              for (const groqModel of DEFAULT_GROQ_MODELS) {
                try {
                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: groqModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, stream: true, stream_options: { include_usage: true } }),
                    signal: AbortSignal.timeout(30000),
                  });
                  if (groqRes.ok && groqRes.body) {
                    providerUsed = "groq";
                    modelUsed = groqModel;
                    const reader = groqRes.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";
                    let hadTokens = false;
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split("\n");
                      buffer = lines.pop() || "";
                      for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed === "data: [DONE]") continue;
                        if (trimmed.startsWith("data:")) {
                          try {
                            const json = JSON.parse(trimmed.slice(5).trim());
                            const textChunk = json?.choices?.[0]?.delta?.content;
                            if (textChunk) { hadTokens = true; streamedText += textChunk; sendEvent({ chunk: textChunk, done: false }); }
                            if (json?.usage) recordUsage("groq", json);
                          } catch { /* skip */ }
                        }
                      }
                    }
                    if (hadTokens) { streamSuccess = true; break; }
                  } else {
                    streamDiagnostics.push(`Groq ${groqModel} (${groqRes.status})`);
                  }
                } catch (groqErr) {
                  streamDiagnostics.push(`Groq ${groqModel} error: ${(groqErr as Error).message}`);
                }
              }
            }
            if (!streamSuccess && GEMINI_API_KEY && providerEnabled("gemini")) {
              try {
                const geminiModel = model && model.includes("gemini") ? model : DEFAULT_GEMINI_MODELS[0];
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
                const geminiRes = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }], generationConfig: { temperature: effectiveTemperature, maxOutputTokens: effectiveMaxTokens } }),
                });
                if (geminiRes.ok && geminiRes.body) {
                  providerUsed = "gemini";
                  modelUsed = geminiModel;
                  const reader = geminiRes.body.getReader();
                  const decoder = new TextDecoder();
                  let buffer = "";
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.startsWith("data:")) {
                        try {
                          const json = JSON.parse(trimmed.slice(5).trim());
                          const textChunk = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                          if (textChunk) { streamedText += textChunk; sendEvent({ chunk: textChunk, done: false }); }
                          if (json?.usageMetadata) recordUsage("gemini", json);
                        } catch { /* ignore */ }
                      }
                    }
                  }
                  streamSuccess = true;
                }
              } catch (geminiErr) {
                console.warn("Gemini streaming failed:", geminiErr);
              }
            }
            if (!streamSuccess && CF_ACCOUNT_ID && CF_API_TOKEN && providerEnabled("cloudflare")) {
              try {
                const cfRes = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_TEXT_MODEL}`,
                  {
                    method: "POST",
                    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }],
                      max_tokens: Math.min(effectiveMaxTokens, 4096),
                      temperature: effectiveTemperature,
                    }),
                    signal: AbortSignal.timeout(30000),
                  },
                );
                if (cfRes.ok) {
                  const data = await cfRes.json();
                  const content = data?.result?.response || data?.response || "";
                  if (content) {
                    providerUsed = "cloudflare";
                    modelUsed = CF_TEXT_MODEL;
                    streamedText += content;
                    recordUsage("cloudflare", data);
                    sendEvent({ chunk: content, done: false });
                    streamSuccess = true;
                  }
                } else {
                  streamDiagnostics.push(`Cloudflare ${CF_TEXT_MODEL} (${cfRes.status})`);
                }
              } catch (cfErr) {
                streamDiagnostics.push(`Cloudflare error: ${(cfErr as Error).message}`);
              }
            }
            if (!streamSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN) && providerEnabled("huggingface")) {
              const tokensToTry = [HF_TOKEN, HF_MINIMAX_TOKEN].filter(Boolean) as string[];
              for (const token of tokensToTry) {
                if (streamSuccess) break;
                for (const candidateModel of DEFAULT_HF_MODELS) {
                  try {
                    const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ model: candidateModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, stream: false }),
                    });
                    if (hfRes.ok) {
                      const data = await hfRes.json();
                      const content = data?.choices?.[0]?.message?.content || "";
                      if (content) { providerUsed = "huggingface"; modelUsed = candidateModel; streamedText += content; recordUsage("huggingface", data); sendEvent({ chunk: content, done: false }); streamSuccess = true; break; }
                    }
                  } catch (hfErr) {
                    console.warn(`HF error on ${candidateModel}:`, hfErr);
                  }
                }
              }
            }
            if (!streamSuccess) {
              sendEvent({ error: `All AI models failed. ${streamDiagnostics.join(" | ")}`, done: true });
            } else {
              sendEvent({ done: true, meta: { provider: providerUsed, model: modelUsed } });
              // Meter the streamed call. Real usage from stream_options / usageMetadata
              // when the provider emitted it, else the len/4 heuristic on accrued text.
              try {
                const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") || "", serviceRoleKey || Deno.env.get("SUPABASE_ANON_KEY") || "");
                const real: ProviderUsage | null = providerUsage && (providerUsage as ProviderUsage).total > 0 ? (providerUsage as ProviderUsage) : null;
                const estPromptTokens = Math.max(1, Math.ceil(prompt.length / 4));
                const estCompletionTokens = Math.max(0, Math.ceil(streamedText.length / 4));
                const promptTokens = real ? (real.prompt || estPromptTokens) : estPromptTokens;
                const completionTokens = real ? (real.completion || estCompletionTokens) : estCompletionTokens;
                const totalTokens = real ? real.total : promptTokens + completionTokens;
                const pricing = resolvePricing(modelUsed);
                const isFreeTier = providerUsed === "gemini" || providerUsed === "groq" || providerUsed === "cloudflare" || modelUsed.includes(":free");
                let estimatedCost: number;
                let pricingSource: string;
                if (pricing) {
                  estimatedCost = (promptTokens / 1_000_000) * pricing.pin + (completionTokens / 1_000_000) * pricing.pout;
                  pricingSource = pricing.src;
                } else if (isFreeTier) {
                  estimatedCost = 0; pricingSource = "free_tier_heuristic";
                } else {
                  estimatedCost = ((promptTokens + completionTokens) / 1_000_000) * 1.5; pricingSource = "flat_1.5_per_mtok";
                }
                void supabaseAdmin.from("ai_usage_log").insert({
                  user_id: authUserId || null,
                  agent_role: currentTask,
                  task_type: currentTask,
                  model_used: modelUsed,
                  provider: providerUsed,
                  cost_tier: estimatedCost > 0 ? "paid" : "free",
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: totalTokens,
                  estimated_cost_usd: Number(estimatedCost.toFixed(6)),
                  latency_ms: Date.now() - requestStart,
                  started_at: new Date(requestStart).toISOString(),
                  success: true,
                  metadata: {
                    organization_id: callerOrgId,
                    is_free_tier: isFreeTier,
                    model_candidate: model,
                    preferred_provider: preferredProvider ?? null,
                    token_source: real ? "provider" : "estimated",
                    pricing_source: pricingSource,
                    streamed: true,
                  },
                }).then(() => {});
              } catch { /* non-blocking */ }
            }
          } catch (streamErr) {
            console.error("Stream controller error:", streamErr);
            sendEvent({ error: (streamErr as Error).message || "Streaming failed", done: true });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    let result = "";
    let executionSuccess = false;
    const diagnosticErrors: string[] = [];

    // Unified capability cascade: one ordered list, dispatch each model to the
    // right provider API. Single authoritative route when a capability was given;
    // the per-provider blocks below remain as a safety net.
    const dispatchOne = async (pm: PlanModel): Promise<boolean> => {
      const jm = jsonMode && pm.supports_json_object !== false;
      try {
        if (pm.provider === "groq" && GROQ_API_KEY) {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST", headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: pm.provider_model_id, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jm ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) { const d = await r.json(); const c = d?.choices?.[0]?.message?.content || ""; if (c) { result = c; providerUsed = "groq"; modelUsed = pm.id; recordUsage("groq", d); return true; } }
          else diagnosticErrors.push(`plan groq ${pm.id} (${r.status})`);
        } else if (pm.provider === "openrouter" && OPENROUTER_API_KEY) {
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST", headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "Altus Connect", "Content-Type": "application/json" },
            body: JSON.stringify({ model: pm.provider_model_id, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jm ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(45000),
          });
          if (r.ok) { const d = await r.json(); const c = d?.choices?.[0]?.message?.content || ""; if (c) { result = c; providerUsed = "openrouter"; modelUsed = pm.id; recordUsage("openrouter", d); return true; } }
          else diagnosticErrors.push(`plan openrouter ${pm.id} (${r.status}): ${(await r.text().catch(() => "")).slice(0, 120)}`);
        } else if (pm.provider === "gemini" && GEMINI_API_KEY) {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${pm.provider_model_id}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }], generationConfig: { temperature: effectiveTemperature, maxOutputTokens: effectiveMaxTokens, ...(jm ? { responseMimeType: "application/json" } : {}) } }),
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) { const d = await r.json(); const c = d?.candidates?.[0]?.content?.parts?.[0]?.text || ""; if (c) { result = c; providerUsed = "gemini"; modelUsed = pm.id; recordUsage("gemini", d); return true; } }
          else diagnosticErrors.push(`plan gemini ${pm.id} (${r.status})`);
        } else if (pm.provider === "cloudflare" && CF_ACCOUNT_ID && CF_API_TOKEN) {
          const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${pm.provider_model_id}`, {
            method: "POST", headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], max_tokens: Math.min(effectiveMaxTokens, 4096), temperature: effectiveTemperature }),
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) { const d = await r.json(); const c = d?.result?.response || d?.response || ""; if (c) { result = c; providerUsed = "cloudflare"; modelUsed = pm.id; recordUsage("cloudflare", d); return true; } }
          else diagnosticErrors.push(`plan cloudflare ${pm.id} (${r.status})`);
        } else if (pm.provider === "huggingface" && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
          const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN || HF_MINIMAX_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: pm.provider_model_id, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens }),
          });
          if (r.ok) { const d = await r.json(); const c = d?.choices?.[0]?.message?.content || ""; if (c) { result = c; providerUsed = "huggingface"; modelUsed = pm.id; recordUsage("huggingface", d); return true; } }
          else diagnosticErrors.push(`plan hf ${pm.id} (${r.status})`);
        }
      } catch (e) {
        diagnosticErrors.push(`plan ${pm.provider} ${pm.id} exception: ${(e as Error).message}`);
      }
      return false;
    };
    for (const pm of routingPlan) {
      if (executionSuccess) break;
      executionSuccess = await dispatchOne(pm);
    }

    if (!executionSuccess && preferredProvider === "gemini" && GEMINI_API_KEY && model?.includes("gemini")) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const gRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }], generationConfig: { temperature: effectiveTemperature, maxOutputTokens: effectiveMaxTokens, ...(jsonMode ? { responseMimeType: "application/json" } : {}) } }),
          signal: AbortSignal.timeout(45000),
        });
        if (gRes.ok) {
          const data = await gRes.json();
          result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (result) { providerUsed = "gemini"; modelUsed = model; executionSuccess = true; recordUsage("gemini", data); }
        } else {
          diagnosticErrors.push(`Preferred Gemini ${model} (${gRes.status}): ${(await gRes.text().catch(() => "")).slice(0, 160)}`);
        }
      } catch (e) {
        diagnosticErrors.push(`Preferred Gemini exception: ${(e as Error).message}`);
      }
    }

    if (!executionSuccess && preferredProvider === "groq" && GROQ_API_KEY && Boolean(model)) {
      try {
        const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
          signal: AbortSignal.timeout(30000),
        });
        if (grRes.ok) {
          const data = await grRes.json();
          result = data?.choices?.[0]?.message?.content || "";
          if (result) { providerUsed = "groq"; modelUsed = model; executionSuccess = true; recordUsage("groq", data); }
        } else {
          diagnosticErrors.push(`Preferred Groq ${model} (${grRes.status}): ${(await grRes.text().catch(() => "")).slice(0, 160)}`);
        }
      } catch (e) {
        diagnosticErrors.push(`Preferred Groq exception: ${(e as Error).message}`);
      }
    }

    if (!executionSuccess && OPENROUTER_API_KEY && providerEnabled("openrouter")) {
      for (const candModel of openRouterCandidates) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "Altus Connect", "Content-Type": "application/json" },
            body: JSON.stringify({ model: candModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(45000),
          });
          if (orRes.ok) {
            const data = await orRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) { providerUsed = "openrouter"; modelUsed = candModel; executionSuccess = true; recordUsage("openrouter", data); break; }
          } else {
            diagnosticErrors.push(`OpenRouter ${candModel} (${orRes.status}): ${await orRes.text().catch(() => "")}`);
          }
        } catch (orErr) {
          diagnosticErrors.push(`OpenRouter ${candModel} exception: ${(orErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && GROQ_API_KEY && providerEnabled("groq")) {
      for (const groqModel of DEFAULT_GROQ_MODELS) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: groqModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(30000),
          });
          if (groqRes.ok) {
            const data = await groqRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) { providerUsed = "groq"; modelUsed = groqModel; executionSuccess = true; recordUsage("groq", data); break; }
          } else {
            diagnosticErrors.push(`Groq ${groqModel} (${groqRes.status})`);
          }
        } catch (groqErr) {
          diagnosticErrors.push(`Groq ${groqModel} exception: ${(groqErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && GEMINI_API_KEY && providerEnabled("gemini")) {
      const geminiCandidates = model && model.includes("gemini")
        ? [model, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== model)]
        : DEFAULT_GEMINI_MODELS;
      for (const geminiModel of geminiCandidates) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }], generationConfig: { temperature: effectiveTemperature, maxOutputTokens: effectiveMaxTokens, ...(jsonMode ? { responseMimeType: "application/json" } : {}) } }),
            signal: AbortSignal.timeout(40000),
          });
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (result) { providerUsed = "gemini"; modelUsed = geminiModel; executionSuccess = true; recordUsage("gemini", data); break; }
          } else {
            diagnosticErrors.push(`Gemini ${geminiModel} (${geminiRes.status}): ${(await geminiRes.text().catch(() => "")).slice(0, 120)}`);
          }
        } catch (geminiErr) {
          diagnosticErrors.push(`Gemini ${geminiModel} exception: ${(geminiErr as Error).message}`);
        }
      }
    }

    // Cloudflare Workers AI — genuinely free text tier (10k neurons/day). The
    // last free fallback, so it always runs when reached (subject to provider gate).
    if (!executionSuccess && CF_ACCOUNT_ID && CF_API_TOKEN && providerEnabled("cloudflare")) {
      try {
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_TEXT_MODEL}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }],
              max_tokens: Math.min(effectiveMaxTokens, 4096),
              temperature: effectiveTemperature,
            }),
            signal: AbortSignal.timeout(30000),
          },
        );
        if (cfRes.ok) {
          const data = await cfRes.json();
          result = data?.result?.response || data?.response || "";
          if (result) { providerUsed = "cloudflare"; modelUsed = CF_TEXT_MODEL; executionSuccess = true; recordUsage("cloudflare", data); }
        } else {
          diagnosticErrors.push(`Cloudflare ${CF_TEXT_MODEL} (${cfRes.status}): ${(await cfRes.text().catch(() => "")).slice(0, 140)}`);
        }
      } catch (cfErr) {
        diagnosticErrors.push(`Cloudflare exception: ${(cfErr as Error).message}`);
      }
    }

    // Direct OpenAI (api.openai.com) removed as a text fallback — OpenRouter already
    // proxies openai/gpt-4o and openai/gpt-4o-mini, so a separate key just adds a
    // failure surface (a revoked key 401s on every cascade fall-through).

    if (!executionSuccess && TOGETHER_API_KEY && !policy.freeOnly) {
      for (const togetherModel of DEFAULT_TOGETHER_MODELS) {
        try {
          const togetherRes = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${TOGETHER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: togetherModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(40000),
          });
          if (togetherRes.ok) {
            const data = await togetherRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) { providerUsed = "together"; modelUsed = togetherModel; executionSuccess = true; recordUsage("together", data); break; }
          } else {
            diagnosticErrors.push(`Together ${togetherModel} (${togetherRes.status})`);
          }
        } catch (togetherErr) {
          diagnosticErrors.push(`Together ${togetherModel} exception: ${(togetherErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN) && providerEnabled("huggingface")) {
      const tokensToTry = [HF_TOKEN, HF_MINIMAX_TOKEN].filter(Boolean) as string[];
      for (const token of tokensToTry) {
        if (executionSuccess) break;
        for (const candidateModel of DEFAULT_HF_MODELS) {
          try {
            const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: candidateModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
            });
            if (hfRes.ok) {
              const data = await hfRes.json();
              result = data?.choices?.[0]?.message?.content || "";
              if (result) { providerUsed = "huggingface"; modelUsed = candidateModel; executionSuccess = true; recordUsage("huggingface", data); break; }
            } else {
              diagnosticErrors.push(`HF ${candidateModel} (${hfRes.status})`);
            }
          } catch (hfErr) {
            diagnosticErrors.push(`HF ${candidateModel} exception: ${(hfErr as Error).message}`);
          }
        }
      }
    }

    // Post provider-health transitions back to the registry (audit Phase 3) so
    // get_ai_routing_plan stops planning a provider that just auth-failed / ran
    // out of quota / got rate-limited. Fire-and-forget; never blocks the response.
    if (serviceRoleKey) {
      try {
        const healthAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
        const seen = new Set<string>();
        for (const line of diagnosticErrors) {
          const m = line.match(/^(?:plan )?(groq|openrouter|gemini|cloudflare|hf|HF|Cloudflare|Gemini|Groq|OpenRouter)\b[^(]*\((\d{3})\)/);
          if (!m) continue;
          const prov = m[1].toLowerCase().replace(/^hf$/, "huggingface");
          const code = Number(m[2]);
          if (seen.has(prov)) continue;
          let status: string | null = null;
          let cooldown: number | null = null;
          if (code === 401 || code === 403) { status = "auth_failed"; cooldown = 86400; }
          else if (code === 402) { status = "quota_exhausted"; cooldown = 21600; }
          else if (code === 429) { status = "rate_limited"; cooldown = 900; }
          if (status) {
            seen.add(prov);
            void healthAdmin.rpc("set_ai_provider_health", { p_provider: prov, p_status: status, p_cooldown_seconds: cooldown }).then(() => {});
          }
        }
        if (executionSuccess && providerUsed && providerUsed !== "none") {
          void healthAdmin.rpc("set_ai_provider_health", { p_provider: providerUsed, p_status: "healthy", p_cooldown_seconds: null }).then(() => {});
        }
      } catch (hErr) { console.warn("provider-health post skipped:", hErr); }
    }

    if (!executionSuccess || !result) {
      throw new Error(`AI generation failed. Diagnostics: ${diagnosticErrors.join(" | ")}`);
    }

    try {
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") || "", serviceRoleKey || Deno.env.get("SUPABASE_ANON_KEY") || "");
      const isFreeTier = providerUsed === "gemini" || providerUsed === "groq" || providerUsed === "cloudflare" || modelUsed.includes(":free");

      // Prefer the provider's *reported* usage; fall back to the len/4 heuristic
      // only when nothing usable came back on the successful response.
      const real: ProviderUsage | null = providerUsage && (providerUsage as ProviderUsage).total > 0
        ? (providerUsage as ProviderUsage)
        : null;
      const estPromptTokens = Math.max(1, Math.ceil(prompt.length / 4));
      const estCompletionTokens = Math.max(0, Math.ceil(result.length / 4));
      const promptTokens = real ? (real.prompt || estPromptTokens) : estPromptTokens;
      const completionTokens = real ? (real.completion || estCompletionTokens) : estCompletionTokens;
      const totalTokens = real ? real.total : promptTokens + completionTokens;

      // Real cost math from the per-model price table when we have real tokens
      // (or even estimated ones — a priced model still beats the flat guess).
      const pricing = resolvePricing(modelUsed);
      let estimatedCost: number;
      let pricingSource: string;
      if (pricing) {
        estimatedCost = (promptTokens / 1_000_000) * pricing.pin + (completionTokens / 1_000_000) * pricing.pout;
        pricingSource = pricing.src;
      } else if (isFreeTier) {
        estimatedCost = 0;
        pricingSource = "free_tier_heuristic";
      } else {
        estimatedCost = ((promptTokens + completionTokens) / 1_000_000) * 1.5;
        pricingSource = "flat_1.5_per_mtok";
      }
      const billable = estimatedCost > 0;

      void supabaseAdmin.from("ai_usage_log").insert({
        user_id: authUserId || null,
        agent_role: currentTask,
        task_type: currentTask,
        model_used: modelUsed,
        provider: providerUsed,
        cost_tier: billable ? "paid" : "free",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: Number(estimatedCost.toFixed(6)),
        latency_ms: Date.now() - requestStart,
        started_at: new Date(requestStart).toISOString(),
        success: true,
        metadata: {
          organization_id: callerOrgId,
          is_free_tier: isFreeTier,
          model_candidate: model,
          preferred_provider: preferredProvider ?? null,
          token_source: real ? "provider" : "estimated",
          pricing_source: pricingSource,
          streamed: false,
        },
      }).then(() => {});
    } catch { /* non-blocking */ }

    return new Response(
      JSON.stringify({ response: result, result, success: true, meta: { providerUsed, modelUsed, internalServiceCall: Boolean(isServiceRoleCall) } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("AI Request Failed:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal Server Error", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
