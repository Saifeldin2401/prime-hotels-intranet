import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

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
  provider?: "cloudflare";
  cost_tier?: "free_only";
  model?: string;
  num_steps?: number;
  guidance?: number;
  seed?: number;
  source_image_b64?: string;
  mask_image_b64?: string;
}

const FLUX_CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const DEFAULT_CLOUDFLARE_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";
const FALLBACK_CLOUDFLARE_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const DREAMSHAPER_CLOUDFLARE_MODEL = "@cf/lykon/dreamshaper-8-lcm";
const APPROVED_FREE_CLOUDFLARE_MODELS = [
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/lykon/dreamshaper-8-lcm",
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
  if (!clean.toLowerCase().includes("hotel") && !clean.toLowerCase().includes("hospitality")) {
    clean = `${clean}, ${booster}`;
  }

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
    const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
    const cloudflareApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? Deno.env.get("CLOUDFLARE_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase server credentials" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body: ImageGenerationRequest = await req.json().catch(() => null);
    if (!body || !body.prompt || !body.course_id || !body.lesson_id) {
      return jsonResponse({ error: "Missing required fields (prompt, course_id, lesson_id)" }, 400);
    }

    // Strict Free-Only validation for Cloudflare Workers AI
    let requestedModel = body.model || DEFAULT_CLOUDFLARE_MODEL;
    if (!APPROVED_FREE_CLOUDFLARE_MODELS.includes(requestedModel)) {
      requestedModel = DEFAULT_CLOUDFLARE_MODEL;
    }

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
    const diagnosticErrors: string[] = [];

    // =========================================================================
    // EXCLUSIVE PROVIDER: CLOUDFLARE WORKERS AI
    // =========================================================================
    if (cloudflareAccountId && cloudflareApiToken) {
      // Cloudflare-only model candidate queue (No third party fallbacks)
      const isImg2Img = requestedModel === "@cf/runwayml/stable-diffusion-v1-5-img2img";
      const isInpainting = requestedModel === "@cf/runwayml/stable-diffusion-v1-5-inpainting";

      const candidateModels = isImg2Img || isInpainting
        ? [requestedModel]
        : Array.from(
            new Set([
              requestedModel,
              DEFAULT_CLOUDFLARE_MODEL,
              FALLBACK_CLOUDFLARE_MODEL,
              DREAMSHAPER_CLOUDFLARE_MODEL,
            ])
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
            const buf = await cfRes.arrayBuffer();
            if (buf.byteLength > 1000) {
              rawImageBuffer = buf;
              successfulModel = modelToTry;
              const respContentType = cfRes.headers.get("content-type");
              if (respContentType && respContentType.startsWith("image/")) {
                mimeType = respContentType;
                ext = mimeType.split("/")[1] || "png";
                if (ext === "jpeg") ext = "jpg";
              }
              break;
            }
          } else {
            const errText = await cfRes.text().catch(() => "");
            diagnosticErrors.push(`Cloudflare Workers AI model ${modelToTry} returned status ${cfRes.status}: ${errText.slice(0, 100)}`);
          }
        } catch (err) {
          diagnosticErrors.push(`Cloudflare Workers AI model ${modelToTry} failed: ${(err as Error).message}`);
        }
      }
    } else {
      diagnosticErrors.push("Cloudflare Workers AI credentials not set in server environment. Enforcing safe pending mode.");
    }

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
      // Safe 5-Star Educational Diagram Placeholder if Cloudflare free capacity is paused or credentials are being configured
      const safeTitle = (body.title || "Hospitality Operational Standard").replace(/[<>&"]/g, "");
      const safePurpose = (body.educational_purpose || "Educational Visual Standard").replace(/[<>&"]/g, "");
      const svgContent = `
        <svg width="1024" height="576" viewBox="0 0 1024 576" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="576" fill="#0B1329"/>
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#D97706"/>
              <stop offset="50%" stop-color="#F59E0B"/>
              <stop offset="100%" stop-color="#FBBF24"/>
            </linearGradient>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1E293B" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="1024" height="576" fill="url(#grid)" opacity="0.5"/>
          <circle cx="512" cy="288" r="220" fill="url(#goldGrad)" opacity="0.08"/>
          <rect x="80" y="60" width="864" height="456" rx="16" fill="#111C44" stroke="#D97706" stroke-opacity="0.3" stroke-width="1.5"/>
          <rect x="110" y="90" width="220" height="28" rx="14" fill="#D97706" fill-opacity="0.15"/>
          <text x="220" y="108" font-family="-apple-system, system-ui, sans-serif" font-size="11" font-weight="700" fill="#F59E0B" text-anchor="middle" letter-spacing="1.2">CLOUDFLARE WORKERS AI</text>
          <text x="512" y="260" font-family="-apple-system, system-ui, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle">${safeTitle}</text>
          <text x="512" y="300" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="500" fill="#94A3B8" text-anchor="middle">${safePurpose.toUpperCase()} • 5-STAR HOSPITALITY STANDARD</text>
          <text x="512" y="360" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="400" fill="#64748B" text-anchor="middle">SDXL-Lightning Free Tier ($0.00/step) • Queued for Generation</text>
        </svg>
      `;

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
      provider: "cloudflare",
      model: successfulModel,
      width: dimensions.width,
      height: dimensions.height,
      steps: steps,
      guidance: tunedGuidance,
      seed: seed,
      status: rawImageBuffer ? "completed" : "pending",
      order_index: 0,
      created_by: user.id,
      metadata: {
        diagnostics: diagnosticErrors,
        is_free_tier: true,
        cost_per_step: "$0.00",
        provider_exclusive: "cloudflare_workers_ai",
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
      success: true,
      asset: insertedAsset || assetRow,
      image_url: finalImageUrl,
      model_used: successfulModel,
      provider: "cloudflare",
      is_free: true,
      cost_per_step: "$0.00",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("generate-course-image error:", error);
    return jsonResponse({ error: message, success: false }, 500);
  }
});
