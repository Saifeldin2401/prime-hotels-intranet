import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// ai-model-verifier  (Gap C — model discovery / verification pipeline)
// ----------------------------------------------------------------------------
// discovered -> API-tested -> capability-tested -> approved
//
//   1. discover  : list each provider's live model catalog (openrouter, groq,
//                  gemini have list endpoints; cloudflare does not — skipped).
//                  Genuinely-new ids are upserted as availability='unverified',
//                  enabled=false with best-effort metadata.
//   2. probe     : for each unverified (or passed) model, a tiny real chat call
//                  ("Reply with OK"). Success -> availability='verified'.
//                  4xx model-not-found -> availability='deprecated'.
//                  Every attempt is logged to public.ai_model_probes.
//   3. capability: json-mode probe for supports_json_object models; image models
//                  are only stamped capability_checked_at (no real gen — cost).
//
// This function NEVER sets enabled=true. Verification only moves `availability`;
// an admin still flips `enabled` in the Model Catalog tab.
//
// Auth preamble mirrors process-ai-request: verify_jwt is false at the platform
// edge, so the handler enforces its own service-role / admin-JWT check.
// ============================================================================

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

function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];
  const parsed = raw.split(",").map((o: string) => o.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();
  if (!origin) return allowedOrigins[0] || "https://www.phg-connect.com";
  const cleanOrigin = origin.trim().replace(/\/$/, "");
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/.test(cleanOrigin);
  if (isLocalDevOrigin) return origin;
  const isAllowed = allowedOrigins.some((ao) => ao.trim().replace(/\/$/, "") === cleanOrigin);
  return isAllowed ? origin : allowedOrigins[0] || "https://www.phg-connect.com";
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

function isAuthorizedServiceRole(authHeader: string | null, serviceRoleKey: string): boolean {
  const expected = `Bearer ${serviceRoleKey}`;
  const actual = authHeader ?? "";
  if (actual.length !== expected.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

// ── Types ──────────────────────────────────────────────────────────────────
type ProbeType = "api" | "capability";
type ProviderId = "openrouter" | "groq" | "gemini" | "cloudflare" | "huggingface" | "recraft";

interface ModelRow {
  id: string;
  provider: string;
  provider_model_id: string;
  modality: string;
  supports_json_object: boolean;
  image_generation: boolean;
  availability: string;
  enabled: boolean;
}

interface ProbeOutcome {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  detail: string;
  notFound: boolean;
}

// Per-provider discovery cap so a list endpoint with thousands of ids (openrouter)
// cannot flood the registry. New ids beyond the cap are ignored until an admin
// asks for them explicitly via a future targeted run.
const DISCOVERY_MAX_NEW = 40;

// OpenRouter has hundreds of models — only auto-discover from vendors we route to.
const OPENROUTER_VENDOR_PREFIXES = [
  "anthropic/", "openai/", "google/", "deepseek/", "meta-llama/",
  "qwen/", "mistralai/", "x-ai/", "cohere/",
];

const PROBE_PROMPT = "Reply with the single word: OK";
const JSON_PROBE_PROMPT = 'Return ONLY this JSON object and nothing else: {"ok":true}';

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", success: false }, 405);

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!serviceRoleKey || !supabaseUrl) {
      return json({ error: "Server not configured", success: false }, 500);
    }
    if (!authHeader) {
      return json({ error: "Missing Authorization header", success: false }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const rawToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    const decodeJwt = (t: string): Record<string, unknown> | null => {
      try {
        const parts = t.split(".");
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      } catch {
        return null;
      }
    };

    // Accept either an exact service-role-key bearer (timing-safe) OR any token
    // that decodes to a service_role JWT — the ai-model-verifier-nightly cron and
    // run_model_verification() both authenticate with the vault `service_role_key`,
    // which may be a differently-signed-but-valid service_role JWT.
    const claims = decodeJwt(rawToken);
    const isServiceRoleCall =
      isAuthorizedServiceRole(authHeader, serviceRoleKey) || claims?.role === "service_role";

    // Non-service-role callers must be an authenticated super/corporate admin.
    if (!isServiceRoleCall) {
      let userId: string | null = null;
      try {
        const userClient = createClient(supabaseUrl, anonKey || rawToken, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch { /* falls through to 401 */ }

      if (!userId) return json({ error: "Unauthorized", success: false }, 401);

      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: { role: string }) =>
        r.role === "super_admin" || r.role === "corporate_admin");
      if (!isAdmin) return json({ error: "Forbidden: admin role required", success: false }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = (typeof body.mode === "string" ? body.mode : "all") as "discover" | "probe" | "capability" | "all";
    const onlyProvider = typeof body.provider === "string" && body.provider ? body.provider : null;
    const onlyUnverified = body.onlyUnverified !== false; // default true
    const explicitModelIds = Array.isArray(body.modelIds)
      ? (body.modelIds as unknown[]).filter((x): x is string => typeof x === "string")
      : null;

    // ── Provider keys (env first, vault fallback) ──────────────────────────
    const getSecret = async (name: string): Promise<string> => {
      const env = Deno.env.get(name);
      if (env) return env;
      try {
        const { data } = await admin.rpc("get_vault_secret", { secret_name: name });
        return typeof data === "string" ? data : "";
      } catch {
        return "";
      }
    };

    const OPENROUTER_API_KEY = await getSecret("OPENROUTER_API_KEY");
    const GROQ_API_KEY = await getSecret("GROQ_API_KEY");
    const GEMINI_API_KEY = (await getSecret("GEMINI_API_KEY")) || (await getSecret("GOOGLE_AI_API_KEY")) || (await getSecret("GOOGLE_API_KEY"));
    const CF_ACCOUNT_ID = await getSecret("CLOUDFLARE_ACCOUNT_ID");
    const CF_API_TOKEN = (await getSecret("CLOUDFLARE_API_TOKEN")) || (await getSecret("CLOUDFLARE_API_KEY"));
    const HF_TOKEN = (await getSecret("HUGGINGFACE_TOKEN")) || (await getSecret("HUGGINGFACE_MINIMAX_TOKEN"));

    const summary = {
      mode,
      provider: onlyProvider,
      discovered: [] as string[],
      probed: 0,
      verified: 0,
      deprecated: 0,
      failed: 0,
      capability_checked: 0,
      notes: [] as string[],
    };

    // ── Load current registry ─────────────────────────────────────────────
    const { data: allModels, error: modelsErr } = await admin
      .from("ai_models")
      .select("id, provider, provider_model_id, modality, supports_json_object, image_generation, availability, enabled");
    if (modelsErr) throw new Error(`registry read failed: ${modelsErr.message}`);
    const models = (allModels ?? []) as ModelRow[];
    const knownIds = new Set(models.map((m) => m.id));

    // ====================================================================
    // 1. DISCOVERY
    // ====================================================================
    if (mode === "discover" || mode === "all") {
      const wantProvider = (p: ProviderId) => !onlyProvider || onlyProvider === p;

      // -- OpenRouter --------------------------------------------------------
      if (wantProvider("openrouter")) {
        if (!OPENROUTER_API_KEY) {
          summary.notes.push("openrouter: no API key — discovery skipped");
        } else {
          try {
            const r = await fetch("https://openrouter.ai/api/v1/models", {
              headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
              signal: AbortSignal.timeout(20000),
            });
            if (r.ok) {
              const d = await r.json();
              const list: Array<Record<string, any>> = Array.isArray(d?.data) ? d.data : [];
              let added = 0;
              for (const m of list) {
                if (added >= DISCOVERY_MAX_NEW) break;
                const id: string = m?.id ?? "";
                if (!id || knownIds.has(id)) continue;
                if (!OPENROUTER_VENDOR_PREFIXES.some((v) => id.startsWith(v))) continue;
                const outModalities: string[] = m?.architecture?.output_modalities ?? [];
                const isImage = outModalities.includes("image");
                const promptPrice = Number(m?.pricing?.prompt ?? "0");
                const isFree = id.endsWith(":free") || (Number.isFinite(promptPrice) && promptPrice === 0);
                const ins = await admin.from("ai_models").insert({
                  id,
                  provider: "openrouter",
                  provider_model_id: id,
                  display_name: (m?.name as string) || id,
                  modality: isImage ? "image" : "text",
                  is_free: isFree,
                  cost_tier: isFree ? "free" : "low_cost",
                  supports_json_object: false,
                  image_generation: isImage,
                  availability: "unverified",
                  enabled: false,
                  pricing_source: "ai-model-verifier discovery",
                });
                if (!ins.error) {
                  knownIds.add(id);
                  summary.discovered.push(id);
                  added++;
                }
              }
            } else {
              summary.notes.push(`openrouter: list endpoint ${r.status}`);
            }
          } catch (e) {
            summary.notes.push(`openrouter discovery error: ${(e as Error).message}`);
          }
        }
      }

      // -- Groq -------------------------------------------------------------
      if (wantProvider("groq")) {
        if (!GROQ_API_KEY) {
          summary.notes.push("groq: no API key — discovery skipped");
        } else {
          try {
            const r = await fetch("https://api.groq.com/openai/v1/models", {
              headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
              signal: AbortSignal.timeout(20000),
            });
            if (r.ok) {
              const d = await r.json();
              const list: Array<Record<string, any>> = Array.isArray(d?.data) ? d.data : [];
              let added = 0;
              for (const m of list) {
                if (added >= DISCOVERY_MAX_NEW) break;
                const id: string = m?.id ?? "";
                if (!id || knownIds.has(id)) continue;
                // Groq exposes whisper / tts / guard ids too — keep chat-ish only.
                if (/whisper|tts|guard|prompt-guard|embed/i.test(id)) continue;
                const ins = await admin.from("ai_models").insert({
                  id,
                  provider: "groq",
                  provider_model_id: id,
                  display_name: id,
                  modality: "text",
                  is_free: true,
                  cost_tier: "free",
                  supports_json_object: false,
                  image_generation: false,
                  availability: "unverified",
                  enabled: false,
                  pricing_source: "ai-model-verifier discovery",
                });
                if (!ins.error) {
                  knownIds.add(id);
                  summary.discovered.push(id);
                  added++;
                }
              }
            } else {
              summary.notes.push(`groq: list endpoint ${r.status}`);
            }
          } catch (e) {
            summary.notes.push(`groq discovery error: ${(e as Error).message}`);
          }
        }
      }

      // -- Gemini ---------------------------------------------------------
      if (wantProvider("gemini")) {
        if (!GEMINI_API_KEY) {
          summary.notes.push("gemini: no API key — discovery skipped");
        } else {
          try {
            const r = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}&pageSize=200`,
              { signal: AbortSignal.timeout(20000) },
            );
            if (r.ok) {
              const d = await r.json();
              const list: Array<Record<string, any>> = Array.isArray(d?.models) ? d.models : [];
              let added = 0;
              for (const m of list) {
                if (added >= DISCOVERY_MAX_NEW) break;
                const fullName: string = m?.name ?? "";
                const id = fullName.replace(/^models\//, "");
                if (!id || knownIds.has(id)) continue;
                const methods: string[] = m?.supportedGenerationMethods ?? [];
                if (!methods.includes("generateContent")) continue;
                const isImage = /image/i.test(id);
                const ins = await admin.from("ai_models").insert({
                  id,
                  provider: "gemini",
                  provider_model_id: id,
                  display_name: (m?.displayName as string) || id,
                  modality: isImage ? "image" : "text",
                  is_free: true,
                  cost_tier: "free",
                  supports_json_object: !isImage,
                  image_generation: isImage,
                  availability: "unverified",
                  enabled: false,
                  pricing_source: "ai-model-verifier discovery",
                });
                if (!ins.error) {
                  knownIds.add(id);
                  summary.discovered.push(id);
                  added++;
                }
              }
            } else {
              summary.notes.push(`gemini: list endpoint ${r.status}`);
            }
          } catch (e) {
            summary.notes.push(`gemini discovery error: ${(e as Error).message}`);
          }
        }
      }

      if (wantProvider("cloudflare")) {
        summary.notes.push("cloudflare: no public list endpoint — discovery skipped by design");
      }
    }

    // Reload after discovery so the probe phase sees the new rows.
    let probeTargets: ModelRow[] = models;
    if ((mode === "all" || mode === "discover") && summary.discovered.length > 0) {
      const { data: reload } = await admin
        .from("ai_models")
        .select("id, provider, provider_model_id, modality, supports_json_object, image_generation, availability, enabled");
      probeTargets = (reload ?? []) as ModelRow[];
    }

    // ====================================================================
    // 2. API PROBE
    // ====================================================================
    const probeChat = async (m: ModelRow, prompt: string): Promise<ProbeOutcome> => {
      const t0 = Date.now();
      const done = (ok: boolean, httpStatus: number | null, detail: string, notFound = false): ProbeOutcome => ({
        ok, httpStatus, latencyMs: Date.now() - t0, detail: detail.slice(0, 400), notFound,
      });
      const looksMissing = (status: number, text: string) =>
        (status === 404 || status === 400) &&
        /not.*(found|exist)|no such model|does not exist|unknown model|invalid model|model_not_found|decommission/i.test(text);

      try {
        if (m.provider === "recraft") {
          return done(true, 200, "deterministic client-side engine — always available");
        }
        // A 200 with a well-formed body means the model exists and is callable.
        // We don't require non-empty text: reasoning models (gpt-oss, Gemini 2.5)
        // can spend a tiny token budget entirely on the thinking channel.
        const okChoices = (d: any) =>
          !d?.error && Array.isArray(d?.choices) && d.choices.length > 0;

        if (m.provider === "groq") {
          if (!GROQ_API_KEY) return done(false, null, "no GROQ_API_KEY configured");
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: m.provider_model_id, messages: [{ role: "user", content: prompt }], max_tokens: 256, temperature: 0 }),
            signal: AbortSignal.timeout(25000),
          });
          const txt = await r.text();
          if (!r.ok) return done(false, r.status, txt, looksMissing(r.status, txt));
          return done(okChoices(JSON.parse(txt)), r.status, "ok");
        }
        if (m.provider === "openrouter") {
          if (!OPENROUTER_API_KEY) return done(false, null, "no OPENROUTER_API_KEY configured");
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://phg-connect.com",
              "X-Title": "PRIME Connect Intranet",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: m.provider_model_id, messages: [{ role: "user", content: prompt }], max_tokens: 256, temperature: 0 }),
            signal: AbortSignal.timeout(30000),
          });
          const txt = await r.text();
          if (!r.ok) return done(false, r.status, txt, looksMissing(r.status, txt));
          return done(okChoices(JSON.parse(txt)), r.status, "ok");
        }
        if (m.provider === "gemini") {
          if (!GEMINI_API_KEY) return done(false, null, "no GEMINI_API_KEY configured");
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m.provider_model_id}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 256 } }),
              signal: AbortSignal.timeout(25000),
            },
          );
          const txt = await r.text();
          if (!r.ok) return done(false, r.status, txt, looksMissing(r.status, txt));
          const d = JSON.parse(txt);
          return done(!d?.error && Array.isArray(d?.candidates) && d.candidates.length > 0, r.status, "ok");
        }
        if (m.provider === "cloudflare") {
          if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return done(false, null, "no CLOUDFLARE credentials configured");
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${m.provider_model_id}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 256 }),
              signal: AbortSignal.timeout(25000),
            },
          );
          const txt = await r.text();
          if (!r.ok) return done(false, r.status, txt, looksMissing(r.status, txt));
          const d = JSON.parse(txt);
          return done(d?.success !== false && (d?.result !== undefined || d?.response !== undefined), r.status, "ok");
        }
        if (m.provider === "huggingface") {
          if (!HF_TOKEN) return done(false, null, "no HUGGINGFACE_TOKEN configured");
          const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: m.provider_model_id, messages: [{ role: "user", content: prompt }], max_tokens: 256 }),
            signal: AbortSignal.timeout(25000),
          });
          const txt = await r.text();
          if (!r.ok) return done(false, r.status, txt, looksMissing(r.status, txt));
          return done(okChoices(JSON.parse(txt)), r.status, "ok");
        }
        return done(false, null, `no probe path for provider "${m.provider}"`);
      } catch (e) {
        return done(false, null, `probe exception: ${(e as Error).message}`);
      }
    };

    const recordProbe = async (modelId: string, probeType: ProbeType, o: ProbeOutcome) => {
      await admin.from("ai_model_probes").insert({
        model_id: modelId,
        ok: o.ok,
        latency_ms: o.latencyMs,
        http_status: o.httpStatus,
        detail: o.detail,
        probe_type: probeType,
      });
    };

    if (mode === "probe" || mode === "all") {
      let targets = probeTargets.filter((m) => (!onlyProvider || m.provider === onlyProvider));
      if (explicitModelIds && explicitModelIds.length > 0) {
        const wanted = new Set(explicitModelIds);
        targets = targets.filter((m) => wanted.has(m.id));
      } else if (onlyUnverified) {
        targets = targets.filter((m) => m.availability !== "verified");
      }
      // Never re-probe already-deprecated models on a bulk unverified sweep.
      if (!explicitModelIds) targets = targets.filter((m) => m.availability !== "deprecated");

      for (const m of targets) {
        const o = await probeChat(m, PROBE_PROMPT);
        await recordProbe(m.id, "api", o);
        summary.probed++;

        const patch: Record<string, unknown> = {
          last_probe_ok: o.ok,
          last_probe_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (o.ok) {
          patch.availability = "verified";
          patch.verified_at = new Date().toISOString();
          summary.verified++;
        } else if (o.notFound) {
          patch.availability = "deprecated";
          summary.deprecated++;
        } else {
          summary.failed++;
        }
        // Only stamp verified_at once (keep the earliest).
        if (o.ok) {
          const existing = probeTargets.find((x) => x.id === m.id);
          if (existing && existing.availability === "verified") delete patch.verified_at;
        }
        await admin.from("ai_models").update(patch).eq("id", m.id);
        if (o.ok) m.availability = "verified";
        else if (o.notFound) m.availability = "deprecated";
      }
    }

    // ====================================================================
    // 3. CAPABILITY PROBE
    // ====================================================================
    if (mode === "capability" || mode === "all") {
      let capTargets = probeTargets.filter((m) => m.availability === "verified");
      if (onlyProvider) capTargets = capTargets.filter((m) => m.provider === onlyProvider);
      if (explicitModelIds && explicitModelIds.length > 0) {
        const wanted = new Set(explicitModelIds);
        capTargets = capTargets.filter((m) => wanted.has(m.id));
      }

      for (const m of capTargets) {
        if (m.image_generation || m.modality === "image") {
          // Skip real generation (cost) — just record that we looked.
          await admin.from("ai_models").update({ capability_checked_at: new Date().toISOString() }).eq("id", m.id);
          await recordProbe(m.id, "capability", {
            ok: true, httpStatus: null, latencyMs: 0, detail: "image model — real generation skipped by design", notFound: false,
          });
          summary.capability_checked++;
          continue;
        }
        if (!m.supports_json_object) continue;

        const o = await probeChat(m, JSON_PROBE_PROMPT);
        // Dedicated structured-output call: true only if json_object mode yields parseable JSON.
        let jsonValid = false;
        try {
          jsonValid = await validateJsonMode(m, {
            OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, CF_ACCOUNT_ID, CF_API_TOKEN, HF_TOKEN,
          });
        } catch {
          jsonValid = false;
        }

        await recordProbe(m.id, "capability", {
          ok: jsonValid,
          httpStatus: o.httpStatus,
          latencyMs: o.latencyMs,
          detail: jsonValid ? "json_object mode returned valid JSON" : `json_object mode failed: ${o.detail}`,
          notFound: false,
        });
        await admin.from("ai_models").update({
          capability_checked_at: new Date().toISOString(),
          ...(jsonValid ? {} : { supports_json_object: false }),
        }).eq("id", m.id);
        summary.capability_checked++;
      }
    }

    return json({
      success: true,
      elapsed_ms: Date.now() - startedAt,
      ...summary,
    });
  } catch (error) {
    console.error("ai-model-verifier failed:", error);
    return json({ error: (error as Error).message || "Internal Server Error", success: false }, 500);
  }
});

// Dedicated json-object mode probe: returns true only if the model responds with
// parseable JSON when asked in structured-output mode.
async function validateJsonMode(
  m: { provider: string; provider_model_id: string },
  keys: {
    OPENROUTER_API_KEY: string; GROQ_API_KEY: string; GEMINI_API_KEY: string;
    CF_ACCOUNT_ID: string; CF_API_TOKEN: string; HF_TOKEN: string;
  },
): Promise<boolean> {
  const parseable = (s: string) => {
    const cleaned = s.replace(/```json|```/g, "").trim();
    try { JSON.parse(cleaned); return true; } catch { return false; }
  };

  if (m.provider === "groq" && keys.GROQ_API_KEY) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${keys.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: m.provider_model_id,
        messages: [{ role: "user", content: JSON_PROBE_PROMPT }],
        max_tokens: 64, temperature: 0, response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return false;
    const d = await r.json();
    return parseable(d?.choices?.[0]?.message?.content ?? "");
  }
  if (m.provider === "openrouter" && keys.OPENROUTER_API_KEY) {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://phg-connect.com",
        "X-Title": "PRIME Connect Intranet",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: m.provider_model_id,
        messages: [{ role: "user", content: JSON_PROBE_PROMPT }],
        max_tokens: 64, temperature: 0, response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return false;
    const d = await r.json();
    return parseable(d?.choices?.[0]?.message?.content ?? "");
  }
  if (m.provider === "gemini" && keys.GEMINI_API_KEY) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m.provider_model_id}:generateContent?key=${keys.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: JSON_PROBE_PROMPT }] }],
          generationConfig: { maxOutputTokens: 64, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!r.ok) return false;
    const d = await r.json();
    return parseable(d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }
  if (m.provider === "cloudflare" && keys.CF_ACCOUNT_ID && keys.CF_API_TOKEN) {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${keys.CF_ACCOUNT_ID}/ai/run/${m.provider_model_id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${keys.CF_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: JSON_PROBE_PROMPT }], max_tokens: 64 }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!r.ok) return false;
    const d = await r.json();
    return parseable(String(d?.result?.response ?? d?.response ?? ""));
  }
  if (m.provider === "huggingface" && keys.HF_TOKEN) {
    const r = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${keys.HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m.provider_model_id, messages: [{ role: "user", content: JSON_PROBE_PROMPT }], max_tokens: 64 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return false;
    const d = await r.json();
    return parseable(d?.choices?.[0]?.message?.content ?? "");
  }
  return false;
}
