/**
 * AI Document Auto-Tagging Edge Function
 *
 * Analyzes document metadata/content and writes keyword tags, a category and a
 * short summary onto public.documents (ai_tags / ai_category / ai_summary /
 * ai_processed_at). Those columns are read by DocumentPicker and KnowledgeEditor.
 *
 * Two callers are supported:
 *
 *  1. Internal / service-role callers (cron, other edge functions). They present
 *     the service-role key as a bearer token and may tag any document, passing
 *     the text to analyse in the request body.
 *
 *  2. The browser, right after a user uploads a document. The caller presents
 *     their normal user JWT; they may only tag a document they created
 *     (documents.created_by = auth user id). For this path the text to analyse
 *     is read from the database rather than trusted from the request body, so a
 *     client cannot make the stored summary say something the document doesn't.
 *
 * Tagging is an enhancement: callers invoke this fire-and-forget and must never
 * fail an upload because tagging failed.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAuthorizedServiceRoleRequest } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

interface AITagResult {
  tags: string[];
  category: string;
  summary: string;
}

interface DocumentRow {
  id: string;
  title: string | null;
  description: string | null;
  content: string | null;
  file_extension: string | null;
  created_by: string | null;
}

// NOTE: this function previously only did `export default async (req) => ...`
// and never registered a server, so every request hung until the caller timed
// out. It is invoked now, so it registers a handler like every other function
// in this project.
Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server misconfigured" }, 500);
  }

  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { documentId, content, title, description, fileExtension } = body as {
      documentId?: string;
      content?: string;
      title?: string;
      description?: string;
      fileExtension?: string;
    };

    if (!documentId) {
      return json({ error: "Document ID required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const isServiceRole = isAuthorizedServiceRoleRequest(
      authHeader,
      serviceRoleKey,
    );

    // Load the document with the service client so the authorization decision
    // below is made against the real row, not against RLS-filtered output.
    const { data: document, error: loadError } = await supabase
      .from("documents")
      .select("id, title, description, content, file_extension, created_by")
      .eq("id", documentId)
      .maybeSingle<DocumentRow>();

    if (loadError) {
      console.error("Error loading document:", loadError);
      return json({ error: loadError.message }, 500);
    }
    if (!document) {
      return json({ error: "Document not found" }, 404);
    }

    let sourceTitle = title ?? document.title ?? "";
    let sourceDescription = description ?? document.description ?? "";
    let sourceContent = content ?? document.content ?? "";
    let sourceExtension = fileExtension ?? document.file_extension ?? "";

    if (!isServiceRole) {
      // User-JWT path: authenticate the caller and require document ownership.
      if (!anonKey) {
        console.error("Missing SUPABASE_ANON_KEY for user-token verification");
        return json({ error: "Server misconfigured" }, 500);
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await userClient.auth
        .getUser();

      if (userError || !user) {
        return json({ error: "Unauthorized" }, 401);
      }

      if (document.created_by !== user.id) {
        return json({ error: "Forbidden" }, 403);
      }

      // Never trust caller-supplied text for user-initiated tagging.
      sourceTitle = document.title ?? "";
      sourceDescription = document.description ?? "";
      sourceContent = document.content ?? "";
      sourceExtension = document.file_extension ?? "";
    }

    const docType = getDocumentType(sourceExtension);

    const aiResult = await extractSemanticDocumentTags(
      sourceTitle,
      sourceDescription,
      sourceContent,
      docType,
    );

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        ai_tags: aiResult.tags,
        ai_category: aiResult.category,
        ai_summary: aiResult.summary,
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document with AI tags:", updateError);
      return json({ error: updateError.message }, 500);
    }

    return json({ success: true, documentId, aiResult }, 200);
  } catch (error) {
    console.error("AI Document Tagging error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

function getDocumentType(fileExtension: string): string {
  const ext = fileExtension?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "powerpoint";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "image";
  return "document";
}

async function extractSemanticDocumentTags(
  title: string,
  description: string,
  content: string,
  docType: string,
): Promise<AITagResult> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY") || "";
  const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN") || "";

  const excerpt = `${title}\n${description}\n${(content || '').replace(/<[^>]*>/g, ' ')}`.slice(0, 3000).trim();

  const systemPrompt = `You are the master knowledge taxonomy engine for ALTUS 5-Star Luxury Hotels.
Analyze the provided hotel document and return structured JSON ONLY:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "Operations|Guest Services|HR & Training|Finance|Safety & Compliance|Food & Beverage|Sales & Marketing|Technology|Management|Events",
  "summary": "Concise 2-sentence executive summary of the document's operational purpose and key standards."
}`;

  const userPrompt = `Document Type: ${docType}
Title: ${title}
Description: ${description}
Content Excerpt:
${excerpt}`;

  // 1. Primary: OpenRouter
  if (OPENROUTER_API_KEY) {
    const candidateModels = [
      "google/gemini-2.5-flash-lite",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "openrouter/auto",
    ];

    for (const model of candidateModels) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://phg-connect.com",
            "X-Title": "PRIME Connect Document Tagger",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 500,
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content || "";
          const match = rawContent.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as AITagResult;
            if (Array.isArray(parsed.tags) && parsed.category && parsed.summary) {
              const tags = [...new Set([...parsed.tags, docType])].slice(0, 10);
              return { tags, category: parsed.category, summary: parsed.summary };
            }
          }
        }
      } catch (err) {
        console.warn(`OpenRouter tagging model ${model} failed, cascading:`, err);
      }
    }
  }

  // 2. Secondary: Direct Google Gemini
  if (GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as AITagResult;
          if (Array.isArray(parsed.tags) && parsed.category && parsed.summary) {
            const tags = [...new Set([...parsed.tags, docType])].slice(0, 10);
            return { tags, category: parsed.category, summary: parsed.summary };
          }
        }
      }
    } catch (gErr) {
      console.warn("Direct Gemini tagging failed, cascading:", gErr);
    }
  }

  // 3. Tertiary: Hugging Face
  if (HF_TOKEN) {
    try {
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.3-70B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const match = rawContent.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as AITagResult;
          if (Array.isArray(parsed.tags) && parsed.category && parsed.summary) {
            const tags = [...new Set([...parsed.tags, docType])].slice(0, 10);
            return { tags, category: parsed.category, summary: parsed.summary };
          }
        }
      }
    } catch (hfErr) {
      console.warn("HF tagging failed, using heuristic fallback:", hfErr);
    }
  }

  // Heuristic Rule-Based Fallback
  return fallbackHeuristicTags(title, description, content, docType);
}

function fallbackHeuristicTags(
  title: string,
  description: string,
  content: string,
  docType: string,
): AITagResult {
  const text = `${title} ${description} ${content}`.toLowerCase();

  const tagCategories: Record<string, string[]> = {
    Operations: [
      "operations", "housekeeping", "maintenance", "front desk", "reception",
      "check-in", "check-out", "room service", "laundry", "shift", "handover",
    ],
    "Guest Services": [
      "guest", "customer", "service", "hospitality", "concierge", "amenities",
      "complaint", "review", "feedback", "vip", "butler",
    ],
    "HR & Training": [
      "hr", "training", "employee", "staff", "onboarding", "policy", "procedure",
      "manual", "handbook", "learning", "development",
    ],
    Finance: [
      "finance", "accounting", "billing", "invoice", "budget", "payment",
      "revenue", "cost", "audit", "p&l",
    ],
    "Safety & Compliance": [
      "safety", "security", "compliance", "regulation", "emergency", "fire",
      "health", "sop", "civil defense", "haccp", "balady",
    ],
    "Food & Beverage": [
      "food", "beverage", "restaurant", "menu", "kitchen", "cooking",
      "dining", "bar", "banquet", "culinary",
    ],
    "Sales & Marketing": [
      "sales", "marketing", "promotion", "booking", "reservation", "rate",
      "pricing", "advertising", "corporate", "revenue management",
    ],
    Technology: [
      "technology", "system", "software", "app", "digital", "it",
      "computer", "network", "pms", "pos", "opera",
    ],
    Management: [
      "management", "manager", "leadership", "supervisor", "director",
      "executive", "gm", "duty manager", "coaching",
    ],
    Events: [
      "event", "conference", "banquet", "meeting", "wedding", "party", "group",
    ],
  };

  const extractedTags: string[] = [];
  let aiCategory = "General";

  for (const [category, keywords] of Object.entries(tagCategories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        extractedTags.push(keyword);
        aiCategory = category;
      }
    }
  }

  extractedTags.push(docType);

  const fullText = `${title}. ${description}`.trim();
  const summary = fullText.length > 200 ? fullText.substring(0, 200) + "..." : fullText || "Standard operating hotel documentation.";

  const uniqueTags = [...new Set(extractedTags)].slice(0, 10);

  return {
    tags: uniqueTags,
    category: aiCategory,
    summary,
  };
}
