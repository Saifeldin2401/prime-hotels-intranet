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

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceRoleJwt = getServiceRoleToken(authHeader);
    const isServiceRoleCall = isAuthorizedServiceRoleRequest(
      authHeader,
      serviceRoleKey,
    );

    if (!isServiceRoleCall) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        console.error("Auth error:", authError?.message || "No user found");
        throw new Error(
          "Session expired. Please refresh the page or log in again.",
        );
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
          : "You are the PRIME Connect AI Assistant, an elite hospitality operations intelligence system for luxury hotels. Provide professional, concise, and highly accurate guidance.");

    // Provider API Keys
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
    const HF_MINIMAX_TOKEN = Deno.env.get("HUGGINGFACE_MINIMAX_TOKEN");

    let providerUsed = "none";
    let modelUsed = model || "default";

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

            // 1. Try Google Gemini Streaming
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
                          // Ignore partial JSON
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

            // 2. Try OpenAI Streaming
            if (!streamSuccess && OPENAI_API_KEY) {
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
                    stream: true,
                  }),
                });

                if (openaiRes.ok && openaiRes.body) {
                  providerUsed = "openai";
                  modelUsed = openaiModel;
                  const reader = openaiRes.body.getReader();
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
                      if (trimmed === "data: [DONE]") continue;
                      if (trimmed.startsWith("data:")) {
                        try {
                          const json = JSON.parse(trimmed.slice(5).trim());
                          const textChunk = json?.choices?.[0]?.delta?.content;
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
              } catch (openaiErr) {
                console.warn("OpenAI streaming failed, falling back:", openaiErr);
              }
            }

            // 3. Try Hugging Face Streaming / Non-Streaming fallback
            if (!streamSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
              const token = HF_TOKEN || HF_MINIMAX_TOKEN || "";
              const hfModel = model || "Qwen/Qwen2.5-7B-Instruct";
              const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: hfModel,
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
                providerUsed = "huggingface";
                modelUsed = hfModel;
                // Emit full content as chunk
                sendEvent({ chunk: content, done: false });
                streamSuccess = true;
              }
            }

            if (!streamSuccess) {
              sendEvent({ error: "All AI providers were unavailable for streaming.", done: true });
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

    // 1. Primary: Google Gemini API
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
        }
      } catch (geminiErr) {
        console.warn("Gemini execution failed, trying OpenAI / HF:", geminiErr);
      }
    }

    // 2. Secondary: OpenAI API
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
        }
      } catch (openaiErr) {
        console.warn("OpenAI execution failed, trying HF:", openaiErr);
      }
    }

    // 3. Fallback: Hugging Face Router
    if (!executionSuccess && (HF_TOKEN || HF_MINIMAX_TOKEN)) {
      const token = HF_TOKEN || HF_MINIMAX_TOKEN || "";
      const hfModel = model || (currentTask === "summarization" ? "Qwen/Qwen2.5-72B-Instruct" : "Qwen/Qwen2.5-7B-Instruct");
      const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: hfModel,
          messages: [
            { role: "system", content: defaultSystemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: effectiveTemperature,
          max_tokens: effectiveMaxTokens,
        }),
      });

      if (hfRes.ok) {
        const data = await hfRes.json();
        result = data?.choices?.[0]?.message?.content || "";
        if (result) {
          providerUsed = "huggingface";
          modelUsed = hfModel;
          executionSuccess = true;
        }
      }
    }

    if (!executionSuccess || !result) {
      throw new Error("All configured AI providers (Gemini, OpenAI, Hugging Face) failed to generate a response. Please check API keys or retry.");
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
          internalServiceCall: Boolean(serviceRoleJwt),
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
