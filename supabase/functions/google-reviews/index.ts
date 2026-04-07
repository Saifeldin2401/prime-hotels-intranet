import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers - restrict to allowed origins in production
const getCorsHeaders = (origin: string | null) => {
  // In production, validate the origin against an allowlist
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [
    "https://phg-connect.com",
    "https://www.phg-connect.com",
  ];
  
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith(allowed.replace("https://", "."))
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  // SECURITY: API key must be provided via environment variable
  const serperKey = Deno.env.get("SERPER_API_KEY");
  
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  
  if (!serperKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: SERPER_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cid = "6082352680985290046";
  const sourceId = "f8a6c813-6b68-48a5-af87-d45b12b5a5d7";
  const propertyId = "990b0b9e-faeb-49fd-9c90-5308d7515c18";

  try {
    // Fetch from Serper
    const res = await fetch("https://google.serper.dev/reviews", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ cid, gl: "sa", hl: "en" }),
    });

    if (!res.ok) throw new Error(`Serper API error: ${res.status}`);

    const data = await res.json();
    const reviews = data.reviews || [];

    let inserted = 0;
    let errors: string[] = [];

    for (const r of reviews) {
      try {
        const text = r.snippet || r.text;
        if (!text || text.length < 3) continue;

        const reviewId = r.reviewId || r.id;
        const hash = await sha256(`${propertyId}|google|${reviewId}`);

        // Check if exists
        const { data: existing } = await client
          .from("guest_reviews")
          .select("id")
          .eq("source_review_id", reviewId)
          .maybeSingle();

        if (existing) {
          // Update
          await client
            .from("guest_reviews")
            .update({
              review_text: text,
              reviewer_name: r.user?.name || r.reviewerName || "Guest",
              original_rating: r.rating,
              rating_normalized_5: r.rating,
              rating_normalized_10: r.rating ? r.rating * 2 : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert with explicit error handling
          const payload = {
            source_id: sourceId,
            property_id: propertyId,
            platform: "google",
            source_review_id: reviewId,
            review_text: text,
            review_text_normalized: text.toLowerCase(),
            reviewer_name: r.user?.name || r.reviewerName || "Guest",
            original_rating: r.rating,
            rating_normalized_5: r.rating,
            rating_normalized_10: r.rating ? r.rating * 2 : null,
            published_at: r.date,
            dedupe_hash: hash,
            status: "collected",
            ai_analysis_status: "pending",
            review_language: "en",
            collected_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const result = await client
            .from("guest_reviews")
            .insert(payload)
            .select();

          if (result.error) {
            errors.push(`Insert error: ${result.error.message}`);
            continue;
          }
          if (!result.data || result.data.length === 0) {
            errors.push("Insert returned no data");
            continue;
          }
          inserted++;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_reviews: reviews.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("google-reviews error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
