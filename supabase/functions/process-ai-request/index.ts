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
}

const LEGACY_MODEL_MAP: Record<string, string> = {
  "Qwen/Qwen2.5-7B-Instruct": "qwen/qwen-2.5-72b-instruct:free",
  "Qwen/Qwen2.5-72B-Instruct": "qwen/qwen-2.5-72b-instruct:free",
  "Qwen/Qwen2.5-14B-Instruct": "qwen/qwen-2.5-72b-instruct:free",
  "Qwen/Qwen2.5-32B-Instruct": "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/Llama-3.1-8B-Instruct": "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-001": "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash": "google/gemini-2.0-flash-exp:free",
  "default": "openrouter/auto",
};

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
];

const DEFAULT_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "allam-2-7b",
  "openai/gpt-oss-20b",
];

const DEFAULT_OPENROUTER_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "deepseek/deepseek-r1:free",
  "openai/gpt-4o-mini",
  "deepseek/deepseek-chat",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.7-sonnet",
  "openai/gpt-4o",
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
    void authUserId;

    const { model, prompt, systemPrompt, task, preferredProvider, temperature, max_tokens, maxOutputTokens, stream, jsonMode } =
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
    const HF_MINIMAX_TOKEN = Deno.env.get("HUGGINGFACE_MINIMAX_TOKEN");

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
      } catch (vaultErr) {
        console.warn("Vault secret lookup warning in process-ai-request:", vaultErr);
      }
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

      if (GEMINI_API_KEY) {
        for (const gm of ["imagen-4.0-generate-001", "imagen-3.0-generate-002"]) {
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

      if (OPENAI_API_KEY) {
        try {
          const r = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-image-1", prompt: cleanPrompt, n: 1, size: "1536x1024" }),
            signal: AbortSignal.timeout(60000),
          });
          if (r.ok) {
            const d = await r.json();
            const b64 = d?.data?.[0]?.b64_json;
            if (b64) return jsonResponse({ success: true, image_url: `data:image/png;base64,${b64}`, provider: "openai", model: "gpt-image-1" });
          }
        } catch { /* fall through */ }
      }

      return jsonResponse({
        success: false,
        error: "Image generation unavailable: no configured provider produced an image (check GEMINI / OPENAI keys and quotas).",
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

    const openRouterCandidates = resolveModelCandidates(model);
    let providerUsed = "none";
    let modelUsed = openRouterCandidates[0] || "openrouter/auto";

    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventData: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
          };
          try {
            let streamSuccess = false;
            const streamDiagnostics: string[] = [];
            if (!streamSuccess && OPENROUTER_API_KEY) {
              for (const candModel of openRouterCandidates) {
                try {
                  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "PRIME Connect Intranet", "Content-Type": "application/json" },
                    body: JSON.stringify({ model: candModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, stream: true }),
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
                            if (textChunk) { hadTokens = true; sendEvent({ chunk: textChunk, done: false }); }
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
            if (!streamSuccess && GROQ_API_KEY) {
              for (const groqModel of DEFAULT_GROQ_MODELS) {
                try {
                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: groqModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, stream: true }),
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
                            if (textChunk) { hadTokens = true; sendEvent({ chunk: textChunk, done: false }); }
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
            if (!streamSuccess && GEMINI_API_KEY) {
              try {
                const geminiModel = model && model.includes("gemini") ? model : "gemini-2.0-flash";
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
                          if (textChunk) sendEvent({ chunk: textChunk, done: false });
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
            if (!streamSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
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
                      if (content) { providerUsed = "huggingface"; modelUsed = candidateModel; sendEvent({ chunk: content, done: false }); streamSuccess = true; break; }
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
          if (result) { providerUsed = "gemini"; modelUsed = model; executionSuccess = true; }
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
          if (result) { providerUsed = "groq"; modelUsed = model; executionSuccess = true; }
        } else {
          diagnosticErrors.push(`Preferred Groq ${model} (${grRes.status}): ${(await grRes.text().catch(() => "")).slice(0, 160)}`);
        }
      } catch (e) {
        diagnosticErrors.push(`Preferred Groq exception: ${(e as Error).message}`);
      }
    }

    if (!executionSuccess && OPENROUTER_API_KEY) {
      for (const candModel of openRouterCandidates) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "HTTP-Referer": "https://phg-connect.com", "X-Title": "PRIME Connect Intranet", "Content-Type": "application/json" },
            body: JSON.stringify({ model: candModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
            signal: AbortSignal.timeout(45000),
          });
          if (orRes.ok) {
            const data = await orRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) { providerUsed = "openrouter"; modelUsed = candModel; executionSuccess = true; break; }
          } else {
            diagnosticErrors.push(`OpenRouter ${candModel} (${orRes.status}): ${await orRes.text().catch(() => "")}`);
          }
        } catch (orErr) {
          diagnosticErrors.push(`OpenRouter ${candModel} exception: ${(orErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && GROQ_API_KEY) {
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
            if (result) { providerUsed = "groq"; modelUsed = groqModel; executionSuccess = true; break; }
          } else {
            diagnosticErrors.push(`Groq ${groqModel} (${groqRes.status})`);
          }
        } catch (groqErr) {
          diagnosticErrors.push(`Groq ${groqModel} exception: ${(groqErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && GEMINI_API_KEY) {
      try {
        const geminiModel = model && model.includes("gemini") ? model : "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] }], generationConfig: { temperature: effectiveTemperature, maxOutputTokens: effectiveMaxTokens, ...(jsonMode ? { responseMimeType: "application/json" } : {}) } }),
        });
        if (geminiRes.ok) {
          const data = await geminiRes.json();
          result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (result) { providerUsed = "gemini"; modelUsed = geminiModel; executionSuccess = true; }
        } else {
          diagnosticErrors.push(`Gemini (${geminiRes.status}): ${await geminiRes.text()}`);
        }
      } catch (geminiErr) {
        diagnosticErrors.push(`Gemini exception: ${(geminiErr as Error).message}`);
      }
    }

    if (!executionSuccess && OPENAI_API_KEY) {
      try {
        const openaiModel = model || "gpt-4o-mini";
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: openaiModel, messages: [{ role: "system", content: defaultSystemPrompt }, { role: "user", content: prompt }], temperature: effectiveTemperature, max_tokens: effectiveMaxTokens, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
        });
        if (openaiRes.ok) {
          const data = await openaiRes.json();
          result = data?.choices?.[0]?.message?.content || "";
          if (result) { providerUsed = "openai"; modelUsed = openaiModel; executionSuccess = true; }
        } else {
          diagnosticErrors.push(`OpenAI (${openaiRes.status}): ${await openaiRes.text()}`);
        }
      } catch (openaiErr) {
        diagnosticErrors.push(`OpenAI exception: ${(openaiErr as Error).message}`);
      }
    }

    if (!executionSuccess && TOGETHER_API_KEY) {
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
            if (result) { providerUsed = "together"; modelUsed = togetherModel; executionSuccess = true; break; }
          } else {
            diagnosticErrors.push(`Together ${togetherModel} (${togetherRes.status})`);
          }
        } catch (togetherErr) {
          diagnosticErrors.push(`Together ${togetherModel} exception: ${(togetherErr as Error).message}`);
        }
      }
    }

    if (!executionSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
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
              if (result) { providerUsed = "huggingface"; modelUsed = candidateModel; executionSuccess = true; break; }
            } else {
              diagnosticErrors.push(`HF ${candidateModel} (${hfRes.status})`);
            }
          } catch (hfErr) {
            diagnosticErrors.push(`HF ${candidateModel} exception: ${(hfErr as Error).message}`);
          }
        }
      }
    }

    if (!executionSuccess || !result) {
      throw new Error(`AI generation failed. Diagnostics: ${diagnosticErrors.join(" | ")}`);
    }

    try {
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") || "", serviceRoleKey || Deno.env.get("SUPABASE_ANON_KEY") || "");
      const isFreeTier = providerUsed === "gemini" || providerUsed === "groq" || providerUsed === "cloudflare" || modelUsed.includes(":free");
      const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
      const completionTokens = Math.max(0, Math.ceil(result.length / 4));
      const estimatedCost = isFreeTier ? 0 : ((promptTokens + completionTokens) / 1000000) * 1.5;
      void supabaseAdmin.from("ai_usage_log").insert({
        agent_role: currentTask,
        task_type: currentTask,
        model_used: modelUsed,
        provider: providerUsed,
        cost_tier: isFreeTier ? "free" : "paid",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost_usd: Number(estimatedCost.toFixed(6)),
        latency_ms: Date.now() - requestStart,
        started_at: new Date(requestStart).toISOString(),
        success: true,
        metadata: { is_free_tier: isFreeTier, model_candidate: model, preferred_provider: preferredProvider ?? null },
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
