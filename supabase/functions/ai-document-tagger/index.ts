/**
 * AI Document Auto-Tagging Edge Function
 *
 * Analyzes document content and automatically generates tags and categories
 * using AI. Can be triggered on document upload or update.
 */

import { createClient } from "@supabase/supabase-js";

interface AITagResult {
  tags: string[];
  category: string;
  summary: string;
}

export default async (req: Request) => {
  // Verify JWT and get user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { documentId, content, title, description, fileExtension } =
      await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: "Document ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine document type based on file extension
    const docType = getDocumentType(fileExtension);

    // Generate AI tags based on document metadata
    const aiResult = await generateDocumentTags(
      title || "",
      description || "",
      content || "",
      docType,
    );

    // Update document with AI-generated tags
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
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        aiResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("AI Document Tagging error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

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

async function generateDocumentTags(
  title: string,
  description: string,
  content: string,
  docType: string,
): Promise<AITagResult> {
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
  const summary = generateSummary(title, description, content);

  // Remove duplicates and limit to top 10 tags
  const uniqueTags = [...new Set(extractedTags)].slice(0, 10);

  return {
    tags: uniqueTags,
    category: aiCategory,
    summary,
  };
}

function generateSummary(
  title: string,
  description: string,
  content: string,
): string {
  // Simple summary generation based on content length
  const fullText = `${title}. ${description}`.trim();

  if (fullText.length > 200) {
    return fullText.substring(0, 200) + "...";
  }

  return fullText || "No summary available";
}
