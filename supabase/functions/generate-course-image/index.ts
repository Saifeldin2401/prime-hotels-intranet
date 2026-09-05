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
  "https://altus-hospitality-erp.vercel.app",
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
  if (!origin) return allowedOrigins[0] || "https://altus-hospitality-erp.vercel.app";
  const cleanOrigin = origin.trim().replace(/\/$/, "");
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/.test(cleanOrigin);
  if (isLocalDevOrigin) return origin;
  const isVercelOrNetlify =
    /^https:\/\/([a-z0-9-]+)\.vercel\.app$/i.test(cleanOrigin) ||
    /^https:\/\/([a-z0-9-]+)\.netlify\.app$/i.test(cleanOrigin);
  if (isVercelOrNetlify) return origin;
  const isAllowed = allowedOrigins.some((ao) => ao.trim().replace(/\/$/, "") === cleanOrigin);
  return isAllowed ? origin : allowedOrigins[0] || "https://altus-hospitality-erp.vercel.app";
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  visual_style?: string;
  visual_type?: string;
  aspect_ratio?: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  component_id?: string;
  content_block_id?: string;
  title: string;
  title_ar?: string;
  alt_text: string;
  alt_text_ar?: string;
  caption?: string;
  caption_ar?: string;
  educational_purpose?: string;
  visual_concept?: string;
  provider?: "cloudflare" | "google" | "openrouter";
  cost_tier?: "free_only";
  model?: string;
  num_steps?: number;
  guidance?: number;
  seed?: number;
  source_image_b64?: string;
  mask_image_b64?: string;
}

const FLUX_CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const DEFAULT_CLOUDFLARE_MODEL = "@cf/leonardo/lucid-origin";
const FALLBACK_CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const DREAMSHAPER_CLOUDFLARE_MODEL = "@cf/lykon/dreamshaper-8-lcm";
const APPROVED_FREE_CLOUDFLARE_MODELS = [
  "@cf/leonardo/lucid-origin",
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/leonardo/phoenix-1.0",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/runwayml/stable-diffusion-v1-5-img2img",
  "@cf/runwayml/stable-diffusion-v1-5-inpainting",
];

function resolveDimensions(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "4:3":
      return { width: 1024, height: 768 };
    case "1:1":
      return { width: 1024, height: 1024 };
    case "3:2":
      return { width: 1080, height: 720 };
    case "16:9":
    default:
      return { width: 1024, height: 576 };
  }
}

function sanitizeHospitalityPrompt(prompt: string, visualStyle?: string): string {
  let clean = prompt
    .replace(/[^\x20-\x7E\u0600-\u06FF,.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const styleBoosters: Record<string, string> = {
    infographic:
      "professional modern infographic chart, structured procedure flowchart, vector icons, corporate slide design, high contrast graphic design, 8k vector aesthetics, no cartoon drawing",
    technical_diagram:
      "technical SOP schematic diagram, operational workflow boxes, crisp architectural vector layout, clear visual hierarchy",
    photorealistic:
      "award-winning photorealistic 8k photograph, luxury 5-star hotel interior, professional staff in tailored uniform, Hasselblad 50mm, warm ambient lighting, crisp focus",
    realistic:
      "high-definition documentary photograph, authentic hotel operations, natural lighting, professional posture, Saudi hospitality standard",
    professional_corporate:
      "clean executive corporate training visual, 5-star luxury hotel setting, professional hospitality aesthetic, crisp lighting",
    "3d_illustration":
      "modern 3d architectural render, soft ambient hotel lighting, luxury interior textures, crisp depth of field, octane render",
    educational_illustration:
      "refined modern educational visual illustration, clean geometric forms, elegant hospitality color palette, studio clarity",
  };

  const booster =
    styleBoosters[visualStyle || "educational_illustration"] ||
    "clean professional educational visual, 5-star luxury hotel standard, high clarity";
  
  clean = `${clean}. Visual style: ${booster}`;
  return clean;
}

function generateTailoredNegativePrompt(customNegative?: string, visualStyle?: string): string {
  const baseNegatives = [
    "blurry",
    "low quality",
    "distorted anatomy",
    "malformed hands",
    "extra fingers",
    "duplicate objects",
    "duplicate people",
    "excessive text",
    "watermark",
    "signature",
    "logo",
    "unrelated objects",
    "cluttered composition",
    "poor framing",
    "deformed",
    "bad proportions",
  ];

  if (visualStyle === "infographic" || visualStyle === "technical_diagram") {
    baseNegatives.push(
      "cartoon",
      "comic book",
      "sketch",
      "drawing",
      "room sketch",
      "messy lines",
      "painting",
      "photograph of empty room",
      "distorted furniture"
    );
  } else if (visualStyle === "photorealistic" || visualStyle === "realistic") {
    baseNegatives.push(
      "cartoon",
      "anime",
      "cgi rendering",
      "oversaturated",
      "doll-like",
      "drawing",
      "sketch",
      "3d render"
    );
  }

  return customNegative ? `${customNegative}, ${baseNegatives.join(", ")}` : baseNegatives.join(", ");
}

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
    let cloudflareApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? Deno.env.get("CLOUDFLARE_API_KEY") ?? "";
    let geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
    let openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    let openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase server credentials" }, 500);
    }

    // Admin control surface (ai_platform_config) — governs which image providers run.
    let imgPolicy = { freeOnly: false, enabledProviders: ["gemini", "openrouter", "cloudflare"] as string[] };

    // Dynamic Supabase Vault Lookup for Enterprise-Secured AI Keys
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      if (!geminiApiKey) {
        const { data: gKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });
        if (gKey && typeof gKey === "string") geminiApiKey = gKey;
      }
      if (!openrouterApiKey) {
        const { data: oKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "OPENROUTER_API_KEY" });
        if (oKey && typeof oKey === "string") openrouterApiKey = oKey;
      }
      if (!openaiApiKey) {
        const { data: aKey } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "OPENAI_API_KEY" });
        if (aKey && typeof aKey === "string") openaiApiKey = aKey;
      }
      if (!cloudflareAccountId) {
        const { data: cfAcc } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "CLOUDFLARE_ACCOUNT_ID" });
        if (cfAcc && typeof cfAcc === "string") cloudflareAccountId = cfAcc;
      }
      if (!cloudflareApiToken) {
        const { data: cfTok } = await supabaseAdmin.rpc("get_vault_secret", { secret_name: "CLOUDFLARE_API_TOKEN" });
        if (cfTok && typeof cfTok === "string") cloudflareApiToken = cfTok;
      }
      try {
        const { data: cfgRow } = await supabaseAdmin
          .from("ai_platform_config")
          .select("free_only_mode,enabled_providers")
          .eq("id", true)
          .maybeSingle();
        if (cfgRow) {
          imgPolicy = {
            freeOnly: Boolean(cfgRow.free_only_mode),
            enabledProviders: Array.isArray(cfgRow.enabled_providers) && cfgRow.enabled_providers.length
              ? cfgRow.enabled_providers
              : imgPolicy.enabledProviders,
          };
        }
      } catch (cfgErr) {
        console.warn("ai_platform_config lookup skipped:", cfgErr);
      }
    } catch (vErr) {
      console.warn("Vault secret lookup warning in generate-course-image:", vErr);
    }

    // free-only forces Cloudflare ($0); paid engines (OpenRouter / OpenAI / Imagen) are gated off.
    const imgProviderEnabled = (p: string) => imgPolicy.enabledProviders.includes(p);
    const allowPaidImages = !imgPolicy.freeOnly;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    // Best-effort resolution of the calling user (for `created_by`). A missing
    // or service-role token simply yields a null author — it must never throw
    // (a bare `user?.id` reference previously crashed every request here).
    let user: { id: string } | null = null;
    try {
      const rawToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      if (rawToken && rawToken !== serviceRoleKey) {
        const authClient = createClient(supabaseUrl, supabaseAnonKey || rawToken, {
          global: { headers: { Authorization: `Bearer ${rawToken}` } },
        });
        const { data: authData } = await authClient.auth.getUser();
        if (authData?.user?.id) user = { id: authData.user.id };
      }
    } catch (authErr) {
      console.warn("generate-course-image: user resolution skipped:", authErr);
    }

    const body: ImageGenerationRequest = await req.json().catch(() => null);
    if (!body || !body.prompt || !body.course_id || !body.lesson_id) {
      return jsonResponse({ error: "Missing required fields (prompt, course_id, lesson_id)" }, 400);
    }

    let requestedModel = body.model || DEFAULT_CLOUDFLARE_MODEL;
    // Provider intent — @cf/ is checked FIRST (it contains "/" but is NOT OpenRouter).
    // A "vendor/model" id (e.g. "google/gemini-3-pro-image") is an OpenRouter id and must
    // NOT be treated as a Google-direct request even though it contains "gemini".
    const isCfModel = requestedModel.startsWith("@cf/");
    const isSlashModel = !isCfModel && requestedModel.includes("/");
    const wantsOpenRouter =
      body.provider === "openrouter" ||
      (body.provider !== "google" && body.provider !== "cloudflare" && isSlashModel);
    const wantsGoogle =
      !wantsOpenRouter &&
      (body.provider === "google" || (!isCfModel && /imagen|nano.?banana|gemini/i.test(requestedModel)));

    const dimensions = resolveDimensions(body.aspect_ratio);
    const cleanPrompt = sanitizeHospitalityPrompt(body.prompt, body.visual_style);
    const negativePrompt = generateTailoredNegativePrompt(body.negative_prompt, body.visual_style);
    const seed = body.seed || Math.floor(Math.random() * 1000000);
    const steps = body.num_steps || (requestedModel === DEFAULT_CLOUDFLARE_MODEL ? 6 : 20);
    let tunedGuidance = requestedModel === DEFAULT_CLOUDFLARE_MODEL ? 4.5 : requestedModel === DREAMSHAPER_CLOUDFLARE_MODEL ? 2.0 : (body.guidance || 7.0);

    let rawImageBuffer: ArrayBuffer | null = null;
    let mimeType = "image/png";
    let ext = "png";
    let successfulModel = requestedModel;
    let successfulProvider: "google" | "openrouter" | "openai" | "cloudflare" = "cloudflare";
    const diagnosticErrors: string[] = [];

    const decodeB64 = (b64: string): ArrayBuffer => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    };

    // =========================================================================
    // PROVIDER: GOOGLE (Gemini 2.5 Flash Image "Nano Banana" / Imagen predict)
    // =========================================================================
    const tryGoogle = async () => {
      if (rawImageBuffer || !geminiApiKey || !imgProviderEnabled("gemini")) return;
      // Imagen :predict is paid — only when an Imagen id is requested AND paid images are allowed.
      const wantsImagen = allowPaidImages && /imagen/i.test(requestedModel);
      // 1) Imagen :predict (photoreal, when an Imagen id was requested)
      if (wantsImagen) {
        for (const im of ["imagen-4.0-generate-001", "imagen-3.0-generate-002"]) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${im}:predict?key=${geminiApiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt: cleanPrompt }],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: body.aspect_ratio === "1:1" ? "1:1" : body.aspect_ratio === "4:3" ? "4:3" : "16:9",
                  personGeneration: "ALLOW_ADULT",
                },
              }),
              signal: AbortSignal.timeout(30000),
            });
            if (r.ok) {
              const d = await r.json();
              const b64 = d?.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                rawImageBuffer = decodeB64(b64);
                mimeType = d?.predictions?.[0]?.mimeType || "image/png";
                ext = "png";
                successfulModel = im;
                successfulProvider = "google";
                return;
              }
            } else {
              diagnosticErrors.push(`Google ${im} (${r.status}): ${(await r.text().catch(() => "")).slice(0, 120)}`);
            }
          } catch (e) {
            diagnosticErrors.push(`Google ${im} failed: ${(e as Error).message}`);
          }
        }
      }
      // 2) Gemini 2.5 Flash Image (generateContent + IMAGE modality)
      for (const gm of ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]) {
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gm}:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: cleanPrompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) {
            const d = await r.json();
            for (const p of (d?.candidates?.[0]?.content?.parts || [])) {
              if (p.inlineData?.data) {
                rawImageBuffer = decodeB64(p.inlineData.data);
                mimeType = p.inlineData.mimeType || "image/png";
                ext = "png";
                successfulModel = gm;
                successfulProvider = "google";
                return;
              }
            }
          } else {
            diagnosticErrors.push(`Google ${gm} (${r.status}): ${(await r.text().catch(() => "")).slice(0, 120)}`);
          }
        } catch (e) {
          diagnosticErrors.push(`Google ${gm} failed: ${(e as Error).message}`);
        }
      }
    };

    // =========================================================================
    // PROVIDER: OPENROUTER (image output via /chat/completions + image modality)
    // =========================================================================
    const tryOpenRouter = async () => {
      if (rawImageBuffer || !openrouterApiKey || !imgProviderEnabled("openrouter") || !allowPaidImages) return;
      // Real OpenRouter image ids verified live via https://openrouter.ai/api/v1/models
      // (the old "google/gemini-2.5-flash-image-preview" 404s — "No endpoints found").
      const explicitRaw = requestedModel.includes("/") && !isCfModel ? requestedModel : null;
      const explicit = explicitRaw ? explicitRaw.replace(/-preview$/, "") : null;
      const orModels = Array.from(new Set([
        ...(explicit ? [explicit] : []),
        "google/gemini-3-pro-image",
        "google/gemini-2.5-flash-image",
        "google/gemini-3.1-flash-image",
      ]));
      for (const orModel of orModels) {
        try {
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              "HTTP-Referer": "https://phg-connect.com",
              "X-Title": "Altus Connect",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: orModel,
              modalities: ["image", "text"],
              messages: [{ role: "user", content: cleanPrompt }],
            }),
            signal: AbortSignal.timeout(45000),
          });
          if (r.ok) {
            const d = await r.json();
            const imgs = d?.choices?.[0]?.message?.images || [];
            const url: string | undefined = imgs[0]?.image_url?.url || imgs[0]?.url;
            if (url && url.startsWith("data:")) {
              rawImageBuffer = decodeB64(url.split(",")[1]);
              mimeType = url.slice(5, url.indexOf(";")) || "image/png";
              ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
              successfulModel = orModel;
              successfulProvider = "openrouter";
              return;
            }
            if (url) {
              const f = await fetch(url);
              if (f.ok) {
                rawImageBuffer = await f.arrayBuffer();
                mimeType = f.headers.get("content-type") || "image/png";
                ext = "png";
                successfulModel = orModel;
                successfulProvider = "openrouter";
                return;
              }
            }
            diagnosticErrors.push(`OpenRouter ${orModel}: no image in response`);
          } else {
            diagnosticErrors.push(`OpenRouter ${orModel} (${r.status}): ${(await r.text().catch(() => "")).slice(0, 140)}`);
          }
        } catch (e) {
          diagnosticErrors.push(`OpenRouter ${orModel} failed: ${(e as Error).message}`);
        }
      }
    };

    // =========================================================================
    // PROVIDER: OPENAI (gpt-image-1 — reliable paid image generation)
    // =========================================================================
    const tryOpenAI = async () => {
      if (rawImageBuffer || !openaiApiKey || !allowPaidImages) return;
      try {
        const size = body.aspect_ratio === "1:1" ? "1024x1024" : body.aspect_ratio === "4:3" ? "1536x1024" : "1536x1024";
        const r = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-image-1", prompt: cleanPrompt, n: 1, size }),
          signal: AbortSignal.timeout(60000),
        });
        if (r.ok) {
          const d = await r.json();
          const b64 = d?.data?.[0]?.b64_json;
          if (b64) {
            rawImageBuffer = decodeB64(b64);
            mimeType = "image/png";
            ext = "png";
            successfulModel = "gpt-image-1";
            successfulProvider = "openai";
            return;
          }
          const u = d?.data?.[0]?.url;
          if (u) {
            const f = await fetch(u);
            if (f.ok) {
              rawImageBuffer = await f.arrayBuffer();
              mimeType = f.headers.get("content-type") || "image/png";
              ext = "png";
              successfulModel = "gpt-image-1";
              successfulProvider = "openai";
            }
          }
        } else {
          diagnosticErrors.push(`OpenAI gpt-image-1 (${r.status}): ${(await r.text().catch(() => "")).slice(0, 140)}`);
        }
      } catch (e) {
        diagnosticErrors.push(`OpenAI image failed: ${(e as Error).message}`);
      }
    };

    // Attempt providers in intent order; Google is also a strong free fallback.
    if (wantsGoogle) await tryGoogle();
    if (wantsOpenRouter) await tryOpenRouter();

    // =========================================================================
    // PROVIDER: CLOUDFLARE WORKERS AI (free tier — 10k neurons/day)
    // =========================================================================
    if (!rawImageBuffer && cloudflareAccountId && cloudflareApiToken && imgProviderEnabled("cloudflare")) {
      // Only ever call Cloudflare with real @cf/ model ids.
      const isImg2Img = requestedModel === "@cf/runwayml/stable-diffusion-v1-5-img2img";
      const isInpainting = requestedModel === "@cf/runwayml/stable-diffusion-v1-5-inpainting";
      const cfRequested = isCfModel && APPROVED_FREE_CLOUDFLARE_MODELS.includes(requestedModel) ? requestedModel : null;

      const candidateModels = isImg2Img || isInpainting
        ? [requestedModel]
        : Array.from(
            new Set([
              cfRequested,
              FLUX_CLOUDFLARE_MODEL,
              DEFAULT_CLOUDFLARE_MODEL,
              FALLBACK_CLOUDFLARE_MODEL,
              DREAMSHAPER_CLOUDFLARE_MODEL,
            ].filter(Boolean) as string[])
          );

      for (const modelToTry of candidateModels) {
        try {
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${modelToTry}`;

          const isFlux = modelToTry === FLUX_CLOUDFLARE_MODEL;
          const isLCM = modelToTry === DREAMSHAPER_CLOUDFLARE_MODEL;
          const isLightning = modelToTry === DEFAULT_CLOUDFLARE_MODEL;
          const modelGuidance = isFlux ? 3.5 : isLightning ? 4.5 : isLCM ? 2.0 : 7.0;
          tunedGuidance = modelGuidance;

          let cfPayload: Record<string, unknown>;

          if (isFlux) {
            cfPayload = {
              prompt: cleanPrompt,
              steps: 4,
            };
          } else if (isImg2Img && body.source_image_b64) {
            cfPayload = {
              image_b64: body.source_image_b64,
              prompt: cleanPrompt,
              strength: 0.75,
              guidance: modelGuidance,
              num_steps: steps,
            };
          } else if (isInpainting && body.source_image_b64 && body.mask_image_b64) {
            cfPayload = {
              image_b64: body.source_image_b64,
              mask_b64: body.mask_image_b64,
              prompt: cleanPrompt,
              negative_prompt: negativePrompt,
              guidance: modelGuidance,
              num_steps: steps,
            };
          } else {
            cfPayload = {
              prompt: cleanPrompt,
              negative_prompt: negativePrompt,
              num_steps: isLightning ? 6 : isLCM ? 8 : steps,
              guidance: modelGuidance,
              seed: seed,
              width: dimensions.width,
              height: dimensions.height,
            };
          }

          const cfRes = await fetch(cfUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cloudflareApiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cfPayload),
            signal: AbortSignal.timeout(25000),
          });

          if (cfRes.ok) {
            const respContentType = cfRes.headers.get("content-type") || "";
            if (respContentType.startsWith("image/")) {
              const buf = await cfRes.arrayBuffer();
              if (buf.byteLength > 1000) {
                rawImageBuffer = buf;
                successfulModel = modelToTry;
                successfulProvider = "cloudflare";
                mimeType = respContentType.split(";")[0];
                ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
                break;
              }
            } else {
              const cfJson = await cfRes.json().catch(() => null);
              const b64 = cfJson?.result?.image || cfJson?.image;
              if (b64) {
                rawImageBuffer = decodeB64(b64);
                mimeType = "image/jpeg";
                ext = "jpg";
                successfulModel = modelToTry;
                successfulProvider = "cloudflare";
                break;
              }
            }
          } else {
            const errText = await cfRes.text().catch(() => "");
            diagnosticErrors.push(`Cloudflare Workers AI model ${modelToTry} returned status ${cfRes.status}: ${errText.slice(0, 100)}`);
          }
        } catch (err) {
          diagnosticErrors.push(`Cloudflare Workers AI model ${modelToTry} failed: ${(err as Error).message}`);
        }
      }
    }

    // Fallbacks (only if the requested provider produced nothing). OpenRouter first —
    // it has a funded paid account here; Google is quota-limited pending billing.
    if (!rawImageBuffer && !wantsOpenRouter) await tryOpenRouter();
    if (!rawImageBuffer && !wantsGoogle) await tryGoogle();
    if (!rawImageBuffer) await tryOpenAI();
    // No keyless fallback — if every configured provider failed, the request
    // returns status "pending" with a placeholder so the failure is visible.

    // =========================================================================
    // PERSISTENCE: SUPABASE STORAGE & DATABASE METADATA
    // =========================================================================
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let finalImageUrl = "";
    let storagePath = "";
    const assetId = crypto.randomUUID();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isRealUuid = Boolean(body.course_id && uuidRegex.test(body.course_id));
    const realCourseId = isRealUuid ? body.course_id : null;
    const tempCourseId = isRealUuid ? null : (body.course_id || "temp_course");

    const safeCoursePath = (body.course_id || "draft").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeModulePath = (body.module_id || "mod").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeLessonPath = (body.lesson_id || "les").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (rawImageBuffer) {
      storagePath = `courses/${safeCoursePath}/modules/${safeModulePath}/lessons/${safeLessonPath}/images/${assetId}.${ext}`;
      const { error: uploadError } = await serviceClient.storage
        .from("content-media")
        .upload(storagePath, rawImageBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
      } else {
        const { data: pubData } = serviceClient.storage
          .from("content-media")
          .getPublicUrl(storagePath);
        finalImageUrl = pubData.publicUrl;
      }
    } else {
      // Every configured provider failed — visible placeholder, status stays "pending".
      const safeTitle = (body.title || "Hospitality Operational Standard").replace(/[<>&"]/g, "");
      const safePurpose = (body.educational_purpose || "Educational Visual Standard").replace(/[<>&"]/g, "");
      const svgContent = `<svg width="1024" height="576" viewBox="0 0 1024 576" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="576" fill="#0B1329"/><rect x="80" y="60" width="864" height="456" rx="16" fill="#111C44" stroke="#D97706" stroke-opacity="0.3"/><text x="512" y="270" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle">${safeTitle}</text><text x="512" y="310" font-family="system-ui, sans-serif" font-size="14" fill="#94A3B8" text-anchor="middle">${safePurpose.toUpperCase()}</text><text x="512" y="360" font-family="system-ui, sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Image generation unavailable - all providers failed</text></svg>`;

      storagePath = `courses/${safeCoursePath}/modules/${safeModulePath}/lessons/${safeLessonPath}/images/${assetId}.svg`;
      await serviceClient.storage
        .from("content-media")
        .upload(storagePath, new TextEncoder().encode(svgContent), {
          contentType: "image/svg+xml",
          upsert: true,
        });

      const { data: pubData } = serviceClient.storage
        .from("content-media")
        .getPublicUrl(storagePath);
      finalImageUrl = pubData.publicUrl;
    }

    // Provider = the branch that actually produced the buffer.
    const resolvedAssetProvider = rawImageBuffer ? successfulProvider : "cloudflare";

    const assetRow = {
      id: assetId,
      course_id: realCourseId,
      temp_course_id: tempCourseId,
      module_id: body.module_id,
      lesson_id: body.lesson_id,
      content_block_id: body.content_block_id || null,
      image_url: finalImageUrl,
      storage_path: storagePath || null,
      storage_bucket: "content-media",
      title: body.title,
      title_ar: body.title_ar || null,
      alt_text: body.alt_text,
      alt_text_ar: body.alt_text_ar || null,
      caption: body.caption || null,
      caption_ar: body.caption_ar || null,
      educational_purpose: body.educational_purpose || "concept_illustration",
      visual_concept: body.visual_concept || body.prompt,
      prompt: cleanPrompt,
      negative_prompt: negativePrompt,
      aspect_ratio: body.aspect_ratio || "16:9",
      visual_style: body.visual_style || "educational_illustration",
      placement: body.placement || "concept_explanation",
      provider: resolvedAssetProvider,
      model: successfulModel,
      width: dimensions.width,
      height: dimensions.height,
      steps: steps,
      guidance: tunedGuidance,
      seed: seed,
      status: rawImageBuffer ? "completed" : "pending",
      order_index: 0,
      created_by: user?.id || null,
      metadata: {
        diagnostics: diagnosticErrors,
        is_free_tier: resolvedAssetProvider === "cloudflare",
        provider_used: resolvedAssetProvider,
        generated_at: new Date().toISOString(),
        dimensions,
      },
    };

    const { data: insertedAsset, error: insertError } = await serviceClient
      .from("course_visual_assets")
      .insert(assetRow)
      .select()
      .single();

    if (insertError) {
      console.warn("Notice: course_visual_assets row deferred:", insertError.message);
    }

    return jsonResponse({
      success: Boolean(rawImageBuffer),
      asset: insertedAsset || assetRow,
      image_url: finalImageUrl,
      model_used: successfulModel,
      provider: resolvedAssetProvider,
      status: rawImageBuffer ? "completed" : "pending",
      is_free: resolvedAssetProvider === "cloudflare",
      persisted: Boolean(insertedAsset),
      db_error: insertError?.message ?? null,
      diagnostics: diagnosticErrors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("generate-course-image error:", error);
    return jsonResponse({ error: message, success: false }, 500);
  }
});
