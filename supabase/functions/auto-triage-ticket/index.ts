/**
 * Auto-Triage Maintenance Ticket
 *
 * Edge function triggered when a new maintenance ticket is created.
 * Automatically analyzes the description and applies AI suggestions.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TriageResult {
  priority: "low" | "medium" | "high" | "critical";
  suggested_category: string;
  estimated_hours: number;
  ai_notes: string;
}

async function analyzeTicket(
  title: string,
  description: string,
): Promise<TriageResult | null> {
  const prompt = `You are a hotel maintenance manager. Analyze this maintenance ticket and provide triage information.

TICKET TITLE: ${title}
DESCRIPTION: ${description}

Respond with valid JSON only:
{
  "priority": "low|medium|high|critical",
  "suggested_category": "Plumbing|Electrical|HVAC|Carpentry|General|Safety",
  "estimated_hours": 1,
  "ai_notes": "Brief note about approach"
}

RULES:
- critical: Safety hazards, water leaks, no power
- high: Guest-impacting issues, broken equipment
- medium: Maintenance needs affecting operations
- low: Cosmetic, preventive, non-urgent

Return ONLY valid JSON.`;

  // 1. Primary: OpenRouter
  if (OPENROUTER_API_KEY) {
    const orModels = [
      "openrouter/auto",
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-r1:free",
      "google/gemini-2.0-flash-exp:free"
    ];

    for (const model of orModels) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://phg-connect.com",
            "X-Title": "PRIME Connect Ticket Triage",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.1,
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as TriageResult;
          }
        }
      } catch (err) {
        console.warn(`OpenRouter triage model ${model} failed:`, err);
      }
    }
  }

  // 2. Fallback: Hugging Face
  if (HF_TOKEN) {
    const candidateModels = [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct",
    ];

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          "https://router.huggingface.co/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 500,
              temperature: 0.1,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as TriageResult;
          }
        }
      } catch (err) {
        console.warn(`HF triage model ${model} failed:`, err);
      }
    }
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
      .select("id, title, description, priority, category")
      .eq("id", ticket_id)
      .single();

    if (fetchError || !ticket) {
      console.error("Failed to fetch ticket:", fetchError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ticket.category && ticket.priority !== "medium") {
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

    const { error: updateError } = await supabase
      .from("maintenance_tickets")
      .update({
        priority: triage.priority,
        category: triage.suggested_category,
        estimated_hours: triage.estimated_hours,
        ai_triage_notes: triage.ai_notes,
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
