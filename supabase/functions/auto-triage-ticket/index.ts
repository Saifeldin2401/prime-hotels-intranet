/**
 * Auto-Triage Maintenance Ticket
 *
 * Edge function triggered when a new maintenance ticket is created.
 * Automatically analyzes the description and applies AI suggestions.
 *
 * AI calls are routed through the central `process-ai-request` gateway so that
 * provider selection, `ai_platform_config` (free_only_mode / enabled_providers /
 * disabled_model_ids), retries, fallback and usage logging are all handled in one
 * place. This function keeps ownership of its own structured-JSON parsing,
 * validation and fallback behaviour.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TriageResult {
  priority: "low" | "medium" | "high" | "critical";
  suggested_category: string;
  estimated_hours: number;
  ai_notes: string;
}

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

async function analyzeTicket(
  title: string,
  description: string,
): Promise<TriageResult | null> {
  const systemPrompt =
    "You are a hotel maintenance manager performing ticket triage. Respond with valid JSON only.";

  const prompt = `You are a hotel maintenance manager. Analyze this maintenance ticket and provide triage information.

TICKET TITLE: ${title}
DESCRIPTION: ${description}

Respond with valid JSON only:
{
  "priority": "low|medium|high|critical",
  "suggested_category": "plumbing|electrical|hvac|appliance|structural|cosmetic|safety|other",
  "estimated_hours": 1,
  "ai_notes": "Brief note about approach"
}

RULES:
- critical: Safety hazards, water leaks, no power
- high: Guest-impacting issues, broken equipment
- medium: Maintenance needs affecting operations
- low: Cosmetic, preventive, non-urgent

Return ONLY valid JSON.`;

  const content = await callAiGateway(prompt, systemPrompt);
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TriageResult;
    }
  } catch (err) {
    console.warn("Failed to parse triage JSON:", err);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "Missing ticket_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const triageRoles = new Set([
      "corporate_admin",
      "regional_admin",
      "regional_hr",
      "property_manager",
      "department_head",
      "property_hr",
    ]);
    const hasTriageRole = (roleRows || []).some((row: { role: string }) =>
      triageRoles.has(row.role),
    );

    const { data: scopedTicket, error: scopedError } = await supabaseAuth
      .from("maintenance_tickets")
      .select("id, reported_by_id, assigned_to_id")
      .eq("id", ticket_id)
      .maybeSingle();

    if (scopedError || !scopedTicket) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to access this ticket" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isReporter = scopedTicket.reported_by_id === user.id;
    const isAssignee = scopedTicket.assigned_to_id === user.id;
    if (!hasTriageRole && !isReporter && !isAssignee) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: insufficient privileges to triage this ticket",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: ticket, error: fetchError } = await supabase
      .from("maintenance_tickets")
      .select("id, title, description, priority, category, ai_triage_status")
      .eq("id", ticket_id)
      .single();

    if (fetchError || !ticket) {
      console.error("Failed to fetch ticket:", fetchError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ticket.ai_triage_status === "triaged") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Ticket already triaged",
          skipped: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const triage = await analyzeTicket(ticket.title, ticket.description);

    if (!triage) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "AI analysis failed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Column names must match the live schema: hours go in `labor_hours`
    // (there is no `estimated_hours`), and `category` is the lowercase
    // `maintenance_category` enum. An unrecognized category is dropped rather
    // than failing the whole update.
    const VALID_CATEGORIES = [
      "plumbing", "electrical", "hvac", "appliance",
      "structural", "cosmetic", "safety", "other",
    ];
    const normalizedCategory = String(triage.suggested_category || "").toLowerCase().trim();
    const categoryUpdate = VALID_CATEGORIES.includes(normalizedCategory)
      ? { category: normalizedCategory }
      : {};

    const { error: updateError } = await supabase
      .from("maintenance_tickets")
      .update({
        priority: triage.priority,
        ...categoryUpdate,
        labor_hours: triage.estimated_hours,
        ai_triage_status: "triaged",
        ai_triage_notes: triage.ai_notes,
        ai_notes: triage.ai_notes,
        ai_triaged_at: new Date().toISOString(),
      })
      .eq("id", ticket_id);

    if (updateError) {
      console.error("Failed to update ticket:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update ticket",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        triage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Auto-triage error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
