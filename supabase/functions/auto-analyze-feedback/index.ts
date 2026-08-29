// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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
          title,
          department_id
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

    // 1. Primary: OpenRouter
    if (OPENROUTER_API_KEY) {
      const orModels = [
        "google/gemini-2.5-flash-lite",
        "openai/gpt-4o-mini",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-r1",
        "openrouter/auto"
      ];

      for (const model of orModels) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://phg-connect.com",
              "X-Title": "PRIME Connect Feedback Analysis",
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
            const aiResult = await response.json();
            const content = aiResult.choices?.[0]?.message?.content || "";
            const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
              break;
            }
          }
        } catch (err) {
          console.warn(`OpenRouter feedback model ${model} failed:`, err);
        }
      }
    }

    // 2. Fallback: Hugging Face
    if (!analysis && HF_TOKEN) {
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
            const aiResult = await response.json();
            const content = aiResult.choices?.[0]?.message?.content || "";
            const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
              break;
            }
          }
        } catch (err) {
          console.warn(`Feedback analysis model ${model} failed:`, err);
        }
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

    // ── Auto-create a task when the AI identifies an actionable item ─────
    if (analysis.sentiment === "negative" && analysis.actionable_item) {
      const docTitle =
        (scopedFeedback as any).documents?.title ?? "Knowledge Base Document";
      const deptId = (scopedFeedback as any).documents?.department_id ?? null;

      let assigneeId: string | null = null;
      if (deptId) {
        const { data: deptUsers } = await supabase
          .from("user_departments")
          .select("user_id")
          .eq("department_id", deptId);
        const deptUserIds = (deptUsers ?? []).map((r: any) => r.user_id);
        if (deptUserIds.length > 0) {
          const { data: headRow } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "department_head")
            .in("user_id", deptUserIds)
            .limit(1)
            .maybeSingle();
          if (headRow?.user_id) assigneeId = headRow.user_id;
        }
      }

      const taskTitle = `KB Doc Action: ${String(analysis.actionable_item).slice(0, 100)}`;
      await supabase.from("tasks").insert({
        title: taskTitle,
        description: [
          `Document: ${docTitle}`,
          `AI Actionable Item: ${analysis.actionable_item}`,
          `Themes: ${Array.isArray(analysis.themes) ? analysis.themes.join(", ") : ""}`,
          `Feedback ID: ${feedback_id}`,
        ].join("\n\n"),
        status: "todo",
        priority: "medium",
        assigned_to_id: assigneeId,
        assigned_to: assigneeId,
        department_id: deptId,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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
