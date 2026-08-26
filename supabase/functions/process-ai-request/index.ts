import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupportedAiTask = "chat" | "summarization" | "generation" | "translation" | "triage";

interface ParsedAiRequest {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  task: SupportedAiTask;
  temperature?: number;
  max_tokens?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
}

const LEGACY_MODEL_MAP: Record<string, string> = {
  "Qwen/Qwen2.5-7B-Instruct": "nvidia/nemotron-3.5-lightning:free",
  "Qwen/Qwen2.5-72B-Instruct": "nvidia/nemotron-3-super-120b-a12b:free",
  "Qwen/Qwen2.5-14B-Instruct": "minimax/minimax-m3:free",
  "Qwen/Qwen2.5-32B-Instruct": "minimax/minimax-m3:free",
  "meta-llama/Llama-3.3-70B-Instruct": "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/Llama-3.1-8B-Instruct": "nvidia/nemotron-3.5-lightning:free",
  "google/gemini-2.0-flash-001": "openrouter/free",
  "google/gemini-2.0-flash": "openrouter/free",
  "default": "openrouter/free",
};

// Google Gemini native models (Primary Curriculum Engine)
const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

// Groq free-tier models (ultra-fast LPU inference)
const DEFAULT_GROQ_MODELS = [
  "qwen/qwen3.6-27b",
  "groq/compound-mini",
  "allam-2-7b",
  "openai/gpt-oss-20b",
];

const DEFAULT_OPENROUTER_MODELS = [
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "nvidia/nemotron-3.5-lightning:free",
  "minimax/minimax-m3:free",
  "openrouter/auto",
];

// Together AI models (OpenAI-compatible, free credits)
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

  return {
    model:
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : undefined,
    prompt,
    systemPrompt,
    task: taskValue as SupportedAiTask,
    temperature:
      typeof body.temperature === "number" ? body.temperature : undefined,
    max_tokens:
      typeof body.max_tokens === "number" ? body.max_tokens : undefined,
    maxOutputTokens:
      typeof body.maxOutputTokens === "number"
        ? body.maxOutputTokens
        : undefined,
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

  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 2. Validate Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const rawToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();

    let jwtRole = "anon";
    try {
      const parts = rawToken.split(".");
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        jwtRole = payload.role || "anon";
      }
    } catch {
      // Fallback
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRoleCall = isAuthorizedServiceRoleRequest(
      authHeader,
      serviceRoleKey,
    );

    // If caller has authenticated user token, optionally verify with Supabase Auth
    if (!isServiceRoleCall && jwtRole === "authenticated") {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? rawToken,
          { global: { headers: { Authorization: authHeader } } },
        );
        await supabaseClient.auth.getUser();
      } catch (authErr) {
        console.warn("User token verification soft warning:", authErr);
      }
    }

    // 3. Parse Request Payload
    const { model, prompt, systemPrompt, task, temperature, max_tokens, maxOutputTokens, stream, jsonMode } =
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

    // Provider API Keys
    let OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
    let GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
    const HF_MINIMAX_TOKEN = Deno.env.get("HUGGINGFACE_MINIMAX_TOKEN");

    // Dynamic Vault fallback for OpenRouter & Groq keys
    if (!OPENROUTER_API_KEY && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          serviceRoleKey,
        );
        const { data: vKey } = await supabaseAdmin.rpc("get_vault_secret", {
          secret_name: "OPENROUTER_API_KEY",
        });
        if (vKey && typeof vKey === "string") {
          OPENROUTER_API_KEY = vKey;
        }
      } catch (vaultErr) {
        console.warn("Vault secret lookup warning:", vaultErr);
      }
    }

    const openRouterCandidates = resolveModelCandidates(model);

    let providerUsed = "none";
    let modelUsed = openRouterCandidates[0] || "openrouter/auto";

    // --- STREAMING MODE (Server-Sent Events) ---
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

            // 1. Primary: OpenRouter Streaming
            if (!streamSuccess && OPENROUTER_API_KEY) {
              for (const candModel of openRouterCandidates) {
                try {
                  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                      "HTTP-Referer": "https://phg-connect.com",
                      "X-Title": "PRIME Connect Intranet",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: candModel,
                      messages: [
                        { role: "system", content: defaultSystemPrompt },
                        { role: "user", content: prompt },
                      ],
                      temperature: effectiveTemperature,
                      max_tokens: effectiveMaxTokens,
                      stream: true,
                    }),
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
                            if (textChunk) {
                              hadTokens = true;
                              sendEvent({ chunk: textChunk, done: false });
                            }
                          } catch {
                            // Skip non-JSON
                          }
                        }
                      }
                    }

                    if (hadTokens) {
                      streamSuccess = true;
                      break;
                    }
                  } else {
                    const errText = await orRes.text().catch(() => "");
                    streamDiagnostics.push(`OpenRouter ${candModel} (${orRes.status}): ${errText}`);
                  }
                } catch (orErr) {
                  streamDiagnostics.push(`OpenRouter ${candModel} error: ${(orErr as Error).message}`);
                }
              }
            }

            // 2. Fallback: Groq Streaming (ultra-fast LPU inference)
            if (!streamSuccess && GROQ_API_KEY) {
              for (const groqModel of DEFAULT_GROQ_MODELS) {
                try {
                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${GROQ_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: groqModel,
                      messages: [
                        { role: "system", content: defaultSystemPrompt },
                        { role: "user", content: prompt },
                      ],
                      temperature: effectiveTemperature,
                      max_tokens: effectiveMaxTokens,
                      stream: true,
                    }),
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
                            if (textChunk) {
                              hadTokens = true;
                              sendEvent({ chunk: textChunk, done: false });
                            }
                          } catch {
                            // Skip non-JSON
                          }
                        }
                      }
                    }

                    if (hadTokens) {
                      streamSuccess = true;
                      break;
                    }
                  } else {
                    const errText = await groqRes.text().catch(() => "");
                    streamDiagnostics.push(`Groq ${groqModel} (${groqRes.status}): ${errText}`);
                  }
                } catch (groqErr) {
                  streamDiagnostics.push(`Groq ${groqModel} error: ${(groqErr as Error).message}`);
                }
              }
            }

            // 3. Fallback: Google Gemini Streaming
            if (!streamSuccess && GEMINI_API_KEY) {
              try {
                const geminiModel = model && model.includes("gemini") ? model : "gemini-1.5-flash";
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
                const geminiRes = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      { role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] },
                    ],
                    generationConfig: {
                      temperature: effectiveTemperature,
                      maxOutputTokens: effectiveMaxTokens,
                    },
                  }),
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
                          if (textChunk) {
                            sendEvent({ chunk: textChunk, done: false });
                          }
                        } catch {
                          // Ignore
                        }
                      }
                    }
                  }
                  streamSuccess = true;
                }
              } catch (geminiErr) {
                console.warn("Gemini streaming failed, falling back:", geminiErr);
              }
            }

            // 4. Fallback: Together AI Streaming
            if (!streamSuccess && TOGETHER_API_KEY) {
              for (const togetherModel of DEFAULT_TOGETHER_MODELS) {
                try {
                  const togetherRes = await fetch("https://api.together.xyz/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${TOGETHER_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: togetherModel,
                      messages: [
                        { role: "system", content: defaultSystemPrompt },
                        { role: "user", content: prompt },
                      ],
                      temperature: effectiveTemperature,
                      max_tokens: effectiveMaxTokens,
                      stream: false,
                    }),
                    signal: AbortSignal.timeout(40000),
                  });

                  if (togetherRes.ok) {
                    const data = await togetherRes.json();
                    const content = data?.choices?.[0]?.message?.content || "";
                    if (content) {
                      providerUsed = "together";
                      modelUsed = togetherModel;
                      sendEvent({ chunk: content, done: false });
                      streamSuccess = true;
                      break;
                    }
                  } else {
                    const errText = await togetherRes.text().catch(() => "");
                    streamDiagnostics.push(`Together ${togetherModel} (${togetherRes.status}): ${errText}`);
                  }
                } catch (togetherErr) {
                  streamDiagnostics.push(`Together ${togetherModel} error: ${(togetherErr as Error).message}`);
                }
              }
            }

            // 5. Fallback: Hugging Face Router
            if (!streamSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
              const tokensToTry = [HF_TOKEN, HF_MINIMAX_TOKEN].filter(Boolean) as string[];
              for (const token of tokensToTry) {
                if (streamSuccess) break;
                for (const candidateModel of DEFAULT_HF_MODELS) {
                  try {
                    const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: candidateModel,
                        messages: [
                          { role: "system", content: defaultSystemPrompt },
                          { role: "user", content: prompt },
                        ],
                        temperature: effectiveTemperature,
                        max_tokens: effectiveMaxTokens,
                        stream: false,
                      }),
                    });

                    if (hfRes.ok) {
                      const data = await hfRes.json();
                      const content = data?.choices?.[0]?.message?.content || "";
                      if (content) {
                        providerUsed = "huggingface";
                        modelUsed = candidateModel;
                        sendEvent({ chunk: content, done: false });
                        streamSuccess = true;
                        break;
                      }
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
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // --- STANDARD (NON-STREAMING) EXECUTION ---
    let result = "";
    let executionSuccess = false;
    const diagnosticErrors: string[] = [];

    // 1. Primary: OpenRouter API
    if (!executionSuccess && OPENROUTER_API_KEY) {
      for (const candModel of openRouterCandidates) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://phg-connect.com",
              "X-Title": "PRIME Connect Intranet",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: candModel,
              messages: [
                { role: "system", content: defaultSystemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: effectiveTemperature,
              max_tokens: effectiveMaxTokens,
              ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: AbortSignal.timeout(45000),
          });

          if (orRes.ok) {
            const data = await orRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) {
              providerUsed = "openrouter";
              modelUsed = candModel;
              executionSuccess = true;
              break;
            }
          } else {
            const errText = await orRes.text().catch(() => "");
            diagnosticErrors.push(`OpenRouter ${candModel} (${orRes.status}): ${errText}`);
          }
        } catch (orErr) {
          diagnosticErrors.push(`OpenRouter ${candModel} exception: ${(orErr as Error).message}`);
        }
      }
    }

    // 2. Fallback: Groq API (ultra-fast LPU inference)
    if (!executionSuccess && GROQ_API_KEY) {
      for (const groqModel of DEFAULT_GROQ_MODELS) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: "system", content: defaultSystemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: effectiveTemperature,
              max_tokens: effectiveMaxTokens,
              ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) {
              providerUsed = "groq";
              modelUsed = groqModel;
              executionSuccess = true;
              break;
            }
          } else {
            const errText = await groqRes.text().catch(() => "");
            diagnosticErrors.push(`Groq ${groqModel} (${groqRes.status}): ${errText}`);
          }
        } catch (groqErr) {
          diagnosticErrors.push(`Groq ${groqModel} exception: ${(groqErr as Error).message}`);
        }
      }
    }

    // 3. Fallback: Google Gemini API
    if (!executionSuccess && GEMINI_API_KEY) {
      try {
        const geminiModel = model && model.includes("gemini") ? model : "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${defaultSystemPrompt}\n\n${prompt}` }] },
            ],
            generationConfig: {
              temperature: effectiveTemperature,
              maxOutputTokens: effectiveMaxTokens,
              ...(jsonMode ? { responseMimeType: "application/json" } : {}),
            },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (result) {
            providerUsed = "gemini";
            modelUsed = geminiModel;
            executionSuccess = true;
          }
        } else {
          const geminiErr = await geminiRes.text();
          diagnosticErrors.push(`Gemini (${geminiRes.status}): ${geminiErr}`);
        }
      } catch (geminiErr) {
        diagnosticErrors.push(`Gemini exception: ${(geminiErr as Error).message}`);
      }
    }

    // 3. Fallback: OpenAI API
    if (!executionSuccess && OPENAI_API_KEY) {
      try {
        const openaiModel = model || "gpt-4o-mini";
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [
              { role: "system", content: defaultSystemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: effectiveTemperature,
            max_tokens: effectiveMaxTokens,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          result = data?.choices?.[0]?.message?.content || "";
          if (result) {
            providerUsed = "openai";
            modelUsed = openaiModel;
            executionSuccess = true;
          }
        } else {
          const openaiErr = await openaiRes.text();
          diagnosticErrors.push(`OpenAI (${openaiRes.status}): ${openaiErr}`);
        }
      } catch (openaiErr) {
        diagnosticErrors.push(`OpenAI exception: ${(openaiErr as Error).message}`);
      }
    }

    // 5. Fallback: Together AI API
    if (!executionSuccess && TOGETHER_API_KEY) {
      for (const togetherModel of DEFAULT_TOGETHER_MODELS) {
        try {
          const togetherRes = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${TOGETHER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: togetherModel,
              messages: [
                { role: "system", content: defaultSystemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: effectiveTemperature,
              max_tokens: effectiveMaxTokens,
              ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: AbortSignal.timeout(40000),
          });

          if (togetherRes.ok) {
            const data = await togetherRes.json();
            result = data?.choices?.[0]?.message?.content || "";
            if (result) {
              providerUsed = "together";
              modelUsed = togetherModel;
              executionSuccess = true;
              break;
            }
          } else {
            const errText = await togetherRes.text().catch(() => "");
            diagnosticErrors.push(`Together ${togetherModel} (${togetherRes.status}): ${errText}`);
          }
        } catch (togetherErr) {
          diagnosticErrors.push(`Together ${togetherModel} exception: ${(togetherErr as Error).message}`);
        }
      }
    }

    // 6. Fallback: Hugging Face Router API
    if (!executionSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
      const tokensToTry = [HF_TOKEN, HF_MINIMAX_TOKEN].filter(Boolean) as string[];
      for (const token of tokensToTry) {
        if (executionSuccess) break;
        for (const candidateModel of DEFAULT_HF_MODELS) {
          try {
            const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: candidateModel,
                messages: [
                  { role: "system", content: defaultSystemPrompt },
                  { role: "user", content: prompt },
                ],
                temperature: effectiveTemperature,
                max_tokens: effectiveMaxTokens,
                ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
              }),
            });

            if (hfRes.ok) {
              const data = await hfRes.json();
              result = data?.choices?.[0]?.message?.content || "";
              if (result) {
                providerUsed = "huggingface";
                modelUsed = candidateModel;
                executionSuccess = true;
                break;
              }
            } else {
              const hfErr = await hfRes.text();
              diagnosticErrors.push(`HF ${candidateModel} (${hfRes.status}): ${hfErr}`);
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

    // 4. Return Success Response
    return new Response(
      JSON.stringify({
        response: result,
        result,
        success: true,
        meta: {
          providerUsed,
          modelUsed,
          internalServiceCall: Boolean(isServiceRoleCall),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("AI Request Failed:", error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Internal Server Error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
