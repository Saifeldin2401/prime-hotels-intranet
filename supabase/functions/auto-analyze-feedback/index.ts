// deno-lint-ignore-file no-explicit-any
/**
 * Auto-Analyze Document Feedback
 *
 * Analyzes free-text feedback left on Knowledge Base documents and stores an AI
 * sentiment / theme / actionable-item summary. When feedback is negative it also
 * records a `knowledge.feedback_action_required` platform event for the
 * document's organization.
 *
 * AI calls are routed through the central `process-ai-request` gateway so that
 * provider selection, `ai_platform_config` (free_only_mode / enabled_providers /
 * disabled_model_ids), retries, fallback and usage logging are all handled in one
 * place. This function keeps ownership of its own structured-JSON parsing,
 * validation and fallback behaviour.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

/**
 * Calls the central AI gateway (`process-ai-request`) as a server-to-server
 * request and returns the raw model text, or null on any failure.
 */
async function callAiGateway(
  prompt: string,
  systemPrompt: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/process-ai-request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          task: "triage",
          jsonMode: true,
          max_tokens: 500,
          temperature: 0.1,
        }),
      },
    );

    if (!res.ok) {
      console.warn(`process-ai-request returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data?.success) {
      console.warn("process-ai-request reported failure:", data?.error);
      return null;
    }

    const content = data.response ?? data.result ?? "";
    return typeof content === "string" && content.trim() ? content : null;
  } catch (err) {
    console.warn("process-ai-request call failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const feedback_id =
      typeof payload?.feedback_id === "string"
        ? payload.feedback_id.trim()
        : "";

    if (!feedback_id) {
      return new Response(
        JSON.stringify({ error: "No feedback_id provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: scopedFeedback, error: scopedError } = await supabaseAuth
      .from("document_feedback")
      .select(
        `
        id,
        ai_analysis_status,
        feedback_text,
        helpful,
        documents (
          id,
          title,
          department_id,
          organization_id
        )
      `,
      )
      .eq("id", feedback_id)
      .maybeSingle();

    if (scopedError) {
      console.error("Scoped feedback lookup failed:", scopedError);
      return new Response(
        JSON.stringify({ error: "Unable to verify feedback access" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!scopedFeedback) {
      return new Response(
        JSON.stringify({ error: "Feedback not accessible" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    if (
      scopedFeedback.ai_analysis_status === "completed" ||
      !scopedFeedback.feedback_text
    ) {
      return new Response(
        JSON.stringify({ success: true, message: "Skipped" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt =
      "You are an AI assistant for a hotel intranet system analyzing Knowledge Base document feedback. Return valid JSON only.";

    const prompt = `You are an AI assistant for a hotel intranet system. Analyze the following feedback left by an employee on a Knowledge Base document (SOP/Policy).

    DOCUMENT TITLE: ${scopedFeedback.documents?.title || "Unknown"}
    HELPFUL: ${scopedFeedback.helpful ? "Yes" : "No"}
    FEEDBACK TEXT: "${scopedFeedback.feedback_text}"

    Analyze the feedback and provide:
    1. Sentiment: "positive", "neutral", or "negative".
    2. Primary Themes: List 1-3 key themes (e.g., "Clarity", "Missing Steps", "Policy Change").
    3. Actionable Item: A 1-sentence suggestion for the document owner.

    Return VALID JSON ONLY:
    {
      "sentiment": "...",
      "themes": ["...", "..."],
      "actionable_item": "..."
    }`;

    let analysis: any = null;

    const content = await callAiGateway(prompt, systemPrompt);
    if (content) {
      try {
        const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.warn("Failed to parse feedback analysis JSON:", err);
      }
    }

    if (!analysis) {
      throw new Error("Feedback analysis failed across all candidate AI models.");
    }

    // 3. Update database
    const { error: updateError } = await supabase
      .from("document_feedback")
      .update({
        ai_analysis_status: "completed",
        ai_sentiment: analysis.sentiment,
        ai_themes: analysis.themes,
        ai_actionable_item: analysis.actionable_item,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", feedback_id);

    if (updateError) {
      throw updateError;
    }

    // ── Record an actionable item for the knowledge team ─────────────────
    // (The tasks module was removed; the signal goes to the platform event
    // outbox so the knowledge review queue / notifications can pick it up.)
    if (analysis.sentiment === "negative" && analysis.actionable_item) {
      const doc = (scopedFeedback as any).documents ?? null;
      const { error: eventError } = await supabase.rpc("emit_platform_event", {
        p_event_type: "knowledge.feedback_action_required",
        p_organization_id: doc?.organization_id ?? null,
        p_resource_type: "document",
        p_resource_id: doc?.id ?? null,
        p_payload: {
          feedback_id,
          document_title: doc?.title ?? null,
          department_id: doc?.department_id ?? null,
          actionable_item: String(analysis.actionable_item).slice(0, 500),
          themes: Array.isArray(analysis.themes) ? analysis.themes : [],
        },
      });
      if (eventError) {
        console.error("Failed to record feedback action event:", eventError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Critical error in auto-analyze-feedback:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
