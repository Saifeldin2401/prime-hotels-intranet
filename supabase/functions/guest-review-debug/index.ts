import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serperApiKey = "88c094dee3b3009f6874a0396d85efaea7b25671";
    
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test Serper API directly
    console.log("Testing Serper API...");
    const serperRes = await fetch("https://google.serper.dev/reviews", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cid: "6082352680985290046",
        gl: "sa",
        hl: "en",
      }),
    });

    if (!serperRes.ok) {
      return new Response(JSON.stringify({ error: `Serper API failed: ${serperRes.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await serperRes.json();
    const reviews = data.reviews || [];
    
    console.log(`Got ${reviews.length} reviews from Serper`);

    if (reviews.length === 0) {
      return new Response(JSON.stringify({ error: "No reviews returned from Serper", data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to insert the first review
    const firstReview = reviews[0];
    console.log("First review:", JSON.stringify(firstReview, null, 2));

    const reviewPayload = {
      source_id: "f8a6c813-6b68-48a5-af87-d45b12b5a5d7",
      property_id: "990b0b9e-faeb-49fd-9c90-5308d7515c18",
      platform: "google",
      source_review_id: firstReview.reviewId || firstReview.id || `test-${Date.now()}`,
      review_text: firstReview.snippet || firstReview.text || "No text",
      review_text_normalized: (firstReview.snippet || firstReview.text || "No text").toLowerCase(),
      reviewer_name: firstReview.user?.name || firstReview.reviewerName || "Anonymous",
      original_rating: firstReview.rating || null,
      rating_normalized_5: firstReview.rating || null,
      rating_normalized_10: firstReview.rating ? firstReview.rating * 2 : null,
      published_at: firstReview.date || new Date().toISOString(),
      status: "collected",
      ai_analysis_status: "pending",
      dedupe_hash: `debug-${Date.now()}`,
      review_language: "en",
      metadata: firstReview,
      collected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Inserting review payload:", JSON.stringify(reviewPayload, null, 2));

    const { data: insertedData, error: insertError } = await serviceClient
      .from("guest_reviews")
      .insert(reviewPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Insert failed:", insertError);
      return new Response(JSON.stringify({ 
        error: "Insert failed", 
        details: insertError,
        payload: reviewPayload 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Insert successful:", insertedData);

    return new Response(JSON.stringify({
      success: true,
      reviews_count: reviews.length,
      inserted_review: insertedData,
      first_review_raw: firstReview,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
