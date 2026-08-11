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

    const aiResult = generateDocumentTags(
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

function generateDocumentTags(
  title: string,
  description: string,
  content: string,
  docType: string,
): AITagResult {
  // Extract keywords from title and description
  const text = `${title} ${description} ${content}`.toLowerCase();

  // Define tag categories based on hospitality industry
  const tagCategories: Record<string, string[]> = {
    Operations: [
      "operations",
      "housekeeping",
      "maintenance",
      "front desk",
      "reception",
      "check-in",
      "check-out",
      "room service",
      "laundry",
    ],
    "Guest Services": [
      "guest",
      "customer",
      "service",
      "hospitality",
      "concierge",
      "amenities",
      "complaint",
      "review",
      "feedback",
    ],
    "HR & Training": [
      "hr",
      "training",
      "employee",
      "staff",
      "onboarding",
      "policy",
      "procedure",
      "manual",
      "handbook",
    ],
    Finance: [
      "finance",
      "accounting",
      "billing",
      "invoice",
      "budget",
      "payment",
      "revenue",
      "cost",
    ],
    "Safety & Compliance": [
      "safety",
      "security",
      "compliance",
      "regulation",
      "emergency",
      "fire",
      "health",
      "sop",
    ],
    "Food & Beverage": [
      "food",
      "beverage",
      "restaurant",
      "menu",
      "kitchen",
      "cooking",
      "dining",
      "bar",
    ],
    "Sales & Marketing": [
      "sales",
      "marketing",
      "promotion",
      "booking",
      "reservation",
      "rate",
      "pricing",
      "advertising",
    ],
    Technology: [
      "technology",
      "system",
      "software",
      "app",
      "digital",
      "it",
      "computer",
      "network",
    ],
    Management: [
      "management",
      "manager",
      "leadership",
      "supervisor",
      "director",
      "executive",
      "gm",
    ],
    Events: [
      "event",
      "conference",
      "banquet",
      "meeting",
      "wedding",
      "party",
      "group",
    ],
  };

  // Extract matching tags
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

  // Add document type as tag
  extractedTags.push(docType);

  // Generate summary
  const summary = generateSummary(title, description);

  // Remove duplicates and limit to top 10 tags
  const uniqueTags = [...new Set(extractedTags)].slice(0, 10);

  return {
    tags: uniqueTags,
    category: aiCategory,
    summary,
  };
}

function generateSummary(title: string, description: string): string {
  // Simple summary generation based on content length
  const fullText = `${title}. ${description}`.trim();

  if (fullText.length > 200) {
    return fullText.substring(0, 200) + "...";
  }

  return fullText || "No summary available";
}
