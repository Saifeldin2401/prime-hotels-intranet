import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeBearerMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sourceId = typeof body.source_id === "string" ? body.source_id : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Verify service role
    const isServiceRole = timingSafeBearerMatch(authHeader, `Bearer ${serviceRoleKey}`);
    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get source info
    const { data: source } = await serviceClient
      .from("guest_review_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (!source) {
      return new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create collection run record
    const { data: runRow } = await serviceClient
      .from("guest_review_collection_runs")
      .insert({
        source_id: sourceId,
        run_mode: "manual",
        status: "running",
      })
      .select("id")
      .single();

    // Fetch from Serper API
    const serperKey = "88c094dee3b3009f6874a0396d85efaea7b25671";
    const cid = "6082352680985290046";
    
    const serperRes = await fetch("https://google.serper.dev/reviews", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cid, gl: "sa", hl: "en" }),
    });

    if (!serperRes.ok) {
      throw new Error(`Serper failed: ${serperRes.status}`);
    }

    const data = await serperRes.json();
    const reviews = data.reviews || [];

    let inserted = 0;
    let errors: string[] = [];

    for (const r of reviews) {
      try {
        const reviewText = r.snippet || r.text || "";
        if (!reviewText || reviewText.length < 3) continue;

        const sourceReviewId = r.reviewId || r.id;
        const dedupeHash = await sha256(`${source.property_id}|google|${sourceReviewId}`);

        // Check for existing
        const { data: existing } = await serviceClient
          .from("guest_reviews")
          .select("id")
          .eq("source_review_id", sourceReviewId)
          .maybeSingle();

        if (existing) {
          // Update existing
          await serviceClient
            .from("guest_reviews")
            .update({
              review_text: reviewText,
              reviewer_name: r.user?.name || r.reviewerName || "Guest",
              original_rating: r.rating,
              rating_normalized_5: r.rating,
              rating_normalized_10: r.rating ? r.rating * 2 : null,
              published_at: r.date,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          const { error: insertErr } = await serviceClient
            .from("guest_reviews")
            .insert({
              source_id: sourceId,
              property_id: source.property_id,
              platform: "google",
              source_review_id: sourceReviewId,
              review_text: reviewText,
              review_text_normalized: reviewText.toLowerCase(),
              reviewer_name: r.user?.name || r.reviewerName || "Guest",
              original_rating: r.rating,
              rating_normalized_5: r.rating,
              rating_normalized_10: r.rating ? r.rating * 2 : null,
              published_at: r.date,
              dedupe_hash: dedupeHash,
              status: "collected",
              ai_analysis_status: "pending",
              review_language: "en",
              metadata: r,
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertErr) {
            errors.push(`Insert failed: ${insertErr.message}`);
            continue;
          }
          inserted++;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Update run status
    await serviceClient
      .from("guest_review_collection_runs")
      .update({
        status: errors.length > 0 && inserted === 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        reviews_collected: reviews.length,
        reviews_new: inserted,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", runRow.id);

    // Update source last poll
    await serviceClient
      .from("guest_review_sources")
      .update({
        last_polled_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        next_poll_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", sourceId);

    return new Response(JSON.stringify({
      success: true,
      source_id: sourceId,
      reviews_found: reviews.length,
      reviews_inserted: inserted,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
