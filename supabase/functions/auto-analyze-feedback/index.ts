// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
    try {
        const { feedback_id } = await req.json();

        if (!feedback_id) {
            return new Response(JSON.stringify({ error: "No feedback_id provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

        // 1. Get feedback details
        const { data: feedback, error: fetchError } = await supabase
            .from("feedback")
            .select(`
        *,
        documents (
          title,
          department_id
        )
      `)
            .eq("id", feedback_id)
            .single();

        if (fetchError || !feedback) {
            console.error("Error fetching feedback:", fetchError);
            return new Response(JSON.stringify({ error: "Feedback not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Skip if already analyzed or no text
        if (feedback.ai_analysis_status === "completed" || !feedback.comment) {
            return new Response(JSON.stringify({ success: true, message: "Skipped" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2. Call Together.ai for analysis
        const prompt = `You are an AI assistant for a hotel intranet system. Analyze the following feedback left by an employee on a Knowledge Base document (SOP/Policy).
    
    DOCUMENT TITLE: ${feedback.documents?.title || "Unknown"}
    HELPFUL: ${feedback.is_helpful ? "Yes" : "No"}
    FEEDBACK TEXT: "${feedback.comment}"

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

        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-72B-Instruct",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
                temperature: 0.1,
            }),
        });

        const aiResult = await response.json();
        const content = aiResult.choices[0].message.content;
        const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
        const analysis = JSON.parse(cleanJson);

        // 3. Update database
        const { error: updateError } = await supabase
            .from("feedback")
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

        return new Response(JSON.stringify({ success: true, analysis }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Critical error in auto-analyze-feedback:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
