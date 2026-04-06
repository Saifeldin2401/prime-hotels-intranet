import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ROLES = new Set([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
]);
const ALLOWED_PLATFORMS = new Set([
  "google",
  "booking",
  "expedia",
  "tripadvisor",
  "agoda",
  "hotels_com",
  "airbnb",
  "manual_import",
]);

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRating(value: unknown): {
  r5: number | null;
  r10: number | null;
} {
  const n = Number(value);
  if (!Number.isFinite(n)) return { r5: null, r10: null };
  if (n <= 5)
    return { r5: Number(n.toFixed(2)), r10: Number((n * 2).toFixed(2)) };
  if (n <= 10)
    return { r5: Number((n / 2).toFixed(2)), r10: Number(n.toFixed(2)) };
  return { r5: null, r10: null };
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

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

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const propertyId =
      typeof body.property_id === "string" ? body.property_id : "";
    const platform =
      typeof body.platform === "string" && ALLOWED_PLATFORMS.has(body.platform)
        ? body.platform
        : "manual_import";
    const rows = Array.isArray(body.rows)
      ? body.rows
      : Array.isArray(body.reviews)
        ? body.reviews
        : [];
    if (!propertyId || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "property_id and rows/reviews are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: vaultServiceSecret } = await serviceClient
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .filter("name", "eq", "service_role_key")
      .limit(1)
      .maybeSingle();
    const isServiceRole =
      authHeader === `Bearer ${serviceRoleKey}` ||
      (typeof vaultServiceSecret?.decrypted_secret === "string" &&
        authHeader === `Bearer ${vaultServiceSecret.decrypted_secret}`);

    let userId: string | null = null;
    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authErr } =
        await userClient.auth.getUser();
      if (authErr || !authData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = authData.user.id;
      const [{ data: roleRows }, { data: propRows }] = await Promise.all([
        serviceClient.from("user_roles").select("role").eq("user_id", userId),
        serviceClient
          .from("user_properties")
          .select("property_id")
          .eq("user_id", userId),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role);
      if (!roles.some((r) => ALLOWED_ROLES.has(r))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const canAccessAll = roles.some(
        (r) =>
          r === "corporate_admin" ||
          r === "regional_admin" ||
          r === "regional_hr",
      );
      const allowedPropertyIds = new Set(
        (propRows ?? []).map((p) => String(p.property_id)),
      );
      if (!canAccessAll && !allowedPropertyIds.has(propertyId)) {
        return new Response(
          JSON.stringify({ error: "Forbidden for this property" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const created: string[] = [];
    const updated: string[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      try {
        const reviewText = cleanText(
          row.review_text ?? row.text ?? row.content,
        );
        if (!reviewText) continue;

        const reviewerName =
          typeof row.reviewer_name === "string"
            ? row.reviewer_name.trim()
            : null;
        const sourceReviewId =
          typeof row.source_review_id === "string"
            ? row.source_review_id.trim()
            : null;
        const publishedAt =
          typeof row.published_at === "string" ? row.published_at : null;
        const rating = normalizeRating(row.rating ?? row.score ?? row.stars);
        const dedupeHash = await sha256(
          [
            propertyId,
            platform,
            sourceReviewId ?? "",
            reviewerName ?? "",
            publishedAt ?? "",
            rating.r10 ?? "",
            reviewText.toLowerCase(),
          ].join("|"),
        );

        let existing: { id: string } | null = null;
        if (sourceReviewId) {
          const { data } = await serviceClient
            .from("guest_reviews")
            .select("id")
            .eq("platform", platform)
            .eq("source_review_id", sourceReviewId)
            .maybeSingle();
          if (data?.id) existing = { id: String(data.id) };
        }
        if (!existing) {
          const { data } = await serviceClient
            .from("guest_reviews")
            .select("id")
            .eq("dedupe_hash", dedupeHash)
            .maybeSingle();
          if (data?.id) existing = { id: String(data.id) };
        }

        const payload = {
          property_id: propertyId,
          platform,
          source_review_id: sourceReviewId,
          review_url:
            typeof row.review_url === "string" ? row.review_url : null,
          reviewer_name: reviewerName,
          review_title:
            typeof row.review_title === "string" ? row.review_title : null,
          review_text: reviewText,
          review_text_normalized: reviewText.toLowerCase(),
          review_language:
            typeof row.review_language === "string"
              ? row.review_language
              : null,
          original_rating: rating.r5,
          rating_normalized_5: rating.r5,
          rating_normalized_10: rating.r10,
          published_at: publishedAt,
          dedupe_hash: dedupeHash,
          status: "collected",
          ai_analysis_status: "pending",
          metadata: row,
        };

        let reviewId: string;
        if (existing) {
          const { error } = await serviceClient
            .from("guest_reviews")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
          reviewId = existing.id;
          updated.push(reviewId);
        } else {
          const { data, error } = await serviceClient
            .from("guest_reviews")
            .insert(payload)
            .select("id")
            .single();
          if (error || !data?.id) throw error ?? new Error("Insert failed");
          reviewId = String(data.id);
          created.push(reviewId);
        }

        await serviceClient.from("guest_review_raw_snapshots").insert({
          review_id: reviewId,
          source_url:
            typeof row.review_url === "string" ? row.review_url : null,
          firecrawl_method: "import",
          request_payload: {},
          response_payload: row,
          extraction_metadata: { import_type: "manual" },
          checksum: await sha256(JSON.stringify(row)),
        });

        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/guest-review-analyzer`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ review_id: reviewId, force: true }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(
              `guest-review-analyzer failed HTTP ${response.status}: ${errorText}`,
            );
          }
        } catch (error) {
          throw new Error(
            `Analyzer handoff failed for imported review ${reviewId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } catch (error) {
        failed.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await serviceClient.from("guest_review_audit_events").insert({
      property_id: propertyId,
      actor_id: userId,
      event_type: "manual_import",
      event_payload: {
        platform,
        rows: rows.length,
        created: created.length,
        updated: updated.length,
        failed: failed.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        imported: created.length + updated.length,
        created: created.length,
        updated: updated.length,
        failed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("guest-review-import failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
