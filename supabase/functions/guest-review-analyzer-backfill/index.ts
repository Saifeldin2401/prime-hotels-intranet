import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function timingSafeBearerMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ") || !secret) return false;
  const provided = new TextEncoder().encode(authHeader.slice("Bearer ".length));
  const expected = new TextEncoder().encode(secret);
  if (provided.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < provided.length; i += 1) mismatch |= provided[i] ^ expected[i];
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!timingSafeBearerMatch(authHeader, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const batchSize = Math.max(1, Math.min(100, Number(body.batch_size ?? 25)));
    const minAgeMinutes = Math.max(0, Math.min(1440, Number(body.min_age_minutes ?? 2)));
    const propertyId = typeof body.property_id === "string" ? body.property_id : null;
    const staleBefore = new Date(Date.now() - minAgeMinutes * 60_000).toISOString();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let pendingQuery = serviceClient
      .from("guest_reviews")
      .select("id")
      .eq("ai_analysis_status", "pending")
      .lte("created_at", staleBefore)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (propertyId) {
      pendingQuery = pendingQuery.eq("property_id", propertyId);
    }

    const { data: pendingReviews, error: pendingError } = await pendingQuery;
    if (pendingError) throw pendingError;

    const results: Array<Record<string, unknown>> = [];
    for (const review of pendingReviews ?? []) {
      const reviewId = String(review.id);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ review_id: reviewId, force: false }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          results.push({
            review_id: reviewId,
            status: "failed",
            error: payload?.error ?? `HTTP ${response.status}`,
          });
          continue;
        }

        results.push({
          review_id: reviewId,
          status: payload?.skipped ? "skipped" : "processed",
          reason: payload?.reason ?? null,
        });
      } catch (error) {
        results.push({
          review_id: reviewId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scanned: pendingReviews?.length ?? 0,
      processed: results.filter((row) => row.status === "processed").length,
      skipped: results.filter((row) => row.status === "skipped").length,
      failed: results.filter((row) => row.status === "failed").length,
      results,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("guest-review-analyzer-backfill failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
