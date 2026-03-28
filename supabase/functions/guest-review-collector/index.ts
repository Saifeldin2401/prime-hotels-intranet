import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MANUAL_ALLOWED_ROLES = new Set([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
]);

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

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

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNullableString(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : null;
}

function normalizeRating(value: unknown): { r5: number | null; r10: number | null } {
  const n = Number(value);
  if (!Number.isFinite(n)) return { r5: null, r10: null };
  if (n <= 5) return { r5: Number(n.toFixed(2)), r10: Number((n * 2).toFixed(2)) };
  if (n <= 10) return { r5: Number((n / 2).toFixed(2)), r10: Number(n.toFixed(2)) };
  return { r5: null, r10: null };
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getReviewCandidates(payload: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const candidates: Array<unknown> = [
    payload,
    payload?.data,
    payload?.reviews,
    payload?.result,
    payload?.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>).reviews : null,
    payload?.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>).data : null,
    payload?.data && typeof payload.data === "object" &&
        (payload.data as Record<string, unknown>).json &&
        typeof (payload.data as Record<string, unknown>).json === "object"
      ? ((payload.data as Record<string, unknown>).json as Record<string, unknown>).reviews
      : null,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      return c.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFirecrawlErrorMessage(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  const message = body.error ?? body.message ?? body.detail;
  if (typeof message === "string" && message.trim()) return message.trim();
  return null;
}

async function resolveExtractPayload(
  extractPostBody: Record<string, unknown> | null,
  firecrawlApiKey: string,
): Promise<Record<string, unknown> | null> {
  const extractId = typeof extractPostBody?.id === "string" ? extractPostBody.id : null;
  if (!extractId) return extractPostBody;
  if (extractPostBody?.data && typeof extractPostBody.data === "object") return extractPostBody;

  const started = Date.now();
  const timeoutMs = 60000;
  const intervalMs = 2500;

  while (Date.now() - started < timeoutMs) {
    const statusRes = await fetch(`https://api.firecrawl.dev/v2/extract/${extractId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${firecrawlApiKey}` },
    });
    const statusBody = await statusRes.json().catch(() => null) as Record<string, unknown> | null;
    if (!statusRes.ok) {
      const detail = getFirecrawlErrorMessage(statusBody);
      throw new Error(
        detail
          ? `Firecrawl extract status failed HTTP ${statusRes.status}: ${detail}`
          : `Firecrawl extract status failed HTTP ${statusRes.status}`,
      );
    }

    const status = typeof statusBody?.status === "string" ? statusBody.status.toLowerCase() : "";
    if (status === "completed") return statusBody;
    if (status === "failed" || status === "cancelled") {
      const detail = getFirecrawlErrorMessage(statusBody);
      throw new Error(detail ? `Firecrawl extract ${status}: ${detail}` : `Firecrawl extract ${status}`);
    }
    await sleep(intervalMs);
  }

  throw new Error("Firecrawl extract timed out waiting for completion");
}

async function getManualContext(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error } = await userClient.auth.getUser();
  if (error || !authData.user) return null;
  const userId = authData.user.id;
  const { data: roleRows } = await serviceClient.from("user_roles").select("role").eq("user_id", userId);
  const roles = (roleRows ?? []).map((r) => r.role);
  if (!roles.some((r) => MANUAL_ALLOWED_ROLES.has(r))) return null;
  return { userId, roles };
}

async function getVaultSecret(client: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const envValue = Deno.env.get(name);
  if (envValue && envValue.trim()) return envValue.trim();

  const { data } = await client.from("vault.decrypted_secrets").select("decrypted_secret").filter("name", "eq", name).limit(1)
    .maybeSingle();
  return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sourceId = typeof body.source_id === "string" ? body.source_id : null;
    const runMode = typeof body.run_mode === "string" ? body.run_mode : "scheduled";
    const dryRun = body.dry_run === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const vaultServiceRoleKey = await getVaultSecret(serviceClient, "service_role_key");
    const isServiceRole = timingSafeBearerMatch(authHeader, serviceRoleKey);
    const isVaultServiceRole = vaultServiceRoleKey ? timingSafeBearerMatch(authHeader, vaultServiceRoleKey) : false;
    const isInternalService = isServiceRole || isVaultServiceRole;

    if (!isInternalService) {
      const ctx = await getManualContext(supabaseUrl, anonKey, authHeader, serviceClient);
      if (!ctx) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const firecrawlApiKey = await getVaultSecret(serviceClient, "FIRECRAWL_API_KEY") ??
      await getVaultSecret(serviceClient, "firecrawl_api_key");
    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Vault secret FIRECRAWL_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const { data: allSources, error: sourceErr } = await serviceClient
      .from("guest_review_sources")
      .select("*")
      .eq("is_active", true)
      .eq("polling_enabled", true)
      .order("updated_at", { ascending: true });
    if (sourceErr) throw sourceErr;

    const dueSources = (allSources ?? []).filter((s) => {
      if (sourceId && String(s.id) !== sourceId) return false;
      if (!s.next_poll_at) return true;
      return new Date(String(s.next_poll_at)).getTime() <= now.getTime();
    });

    const results: Array<Record<string, unknown>> = [];
    for (const source of dueSources) {
      const { data: runRow } = await serviceClient
        .from("guest_review_collection_runs")
        .insert({
          source_id: source.id,
          run_mode: runMode,
          status: "running",
        })
        .select("id")
        .single();

      let reviewsCollected = 0;
      let reviewsNew = 0;
      let reviewsUpdated = 0;
      try {
        const hasSchema = source.firecrawl_extract_schema && Object.keys(source.firecrawl_extract_schema).length > 0;
        const endpoint = hasSchema ? "https://api.firecrawl.dev/v2/extract" : "https://api.firecrawl.dev/v2/scrape";
        const requestPayload = hasSchema
          ? {
              urls: [source.source_url],
              schema: source.firecrawl_extract_schema,
              ...((source.firecrawl_options as Record<string, unknown>) ?? {}),
            }
          : {
              url: source.source_url,
              formats: ["markdown", "html"],
              ...((source.firecrawl_options as Record<string, unknown>) ?? {}),
            };

        const firecrawlRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        });
        let firecrawlBody = await firecrawlRes.json().catch(() => null) as Record<string, unknown> | null;
        if (!firecrawlRes.ok) {
          const detail = getFirecrawlErrorMessage(firecrawlBody);
          throw new Error(detail ? `Firecrawl failed HTTP ${firecrawlRes.status}: ${detail}` : `Firecrawl failed HTTP ${firecrawlRes.status}`);
        }
        if (hasSchema) {
          firecrawlBody = await resolveExtractPayload(firecrawlBody, firecrawlApiKey);
        }

        const candidates = getReviewCandidates(firecrawlBody);
        reviewsCollected = candidates.length;
        if (candidates.length === 0) throw new Error("No review rows returned from Firecrawl");

        for (const row of candidates) {
          const reviewText = cleanText(row.review_text ?? row.text ?? row.content ?? row.comment);
          if (!reviewText) continue;

          const sourceReviewId = toNullableString(row.source_review_id ?? row.review_id ?? row.id);
          const reviewerName = toNullableString(row.reviewer_name ?? row.reviewer ?? row.author);
          const publishedAt = toNullableString(row.published_at ?? row.date ?? row.created_at);
          const rating = normalizeRating(row.rating ?? row.score ?? row.stars);
          const dedupeHash = await sha256([
            String(source.property_id),
            String(source.platform),
            sourceReviewId ?? "",
            reviewerName ?? "",
            publishedAt ?? "",
            rating.r10 ?? "",
            reviewText.toLowerCase(),
          ].join("|"));

          let existingId: string | null = null;
          if (sourceReviewId) {
            const { data } = await serviceClient
              .from("guest_reviews")
              .select("id")
              .eq("platform", source.platform)
              .eq("source_review_id", sourceReviewId)
              .maybeSingle();
            existingId = data?.id ? String(data.id) : null;
          }
          if (!existingId) {
            const { data } = await serviceClient
              .from("guest_reviews")
              .select("id")
              .eq("dedupe_hash", dedupeHash)
              .maybeSingle();
            existingId = data?.id ? String(data.id) : null;
          }

          const reviewPayload = {
            source_id: source.id,
            property_id: source.property_id,
            platform: source.platform,
            source_review_id: sourceReviewId,
            review_url: toNullableString(row.review_url ?? row.url),
            source_listing_url: source.source_url,
            reviewer_name: reviewerName,
            review_title: toNullableString(row.review_title ?? row.title ?? row.headline),
            review_text: reviewText,
            review_text_normalized: reviewText.toLowerCase(),
            review_language: toNullableString(row.review_language ?? row.language),
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
          let changed = true;
          if (existingId) {
            const { data: old } = await serviceClient.from("guest_reviews").select("review_text").eq("id", existingId).maybeSingle();
            changed = cleanText(old?.review_text) !== reviewText;
            await serviceClient.from("guest_reviews").update(reviewPayload).eq("id", existingId);
            reviewId = existingId;
            if (changed) reviewsUpdated += 1;
          } else {
            const { data } = await serviceClient.from("guest_reviews").insert(reviewPayload).select("id").single();
            reviewId = String(data?.id);
            reviewsNew += 1;
          }

          await serviceClient.from("guest_review_raw_snapshots").insert({
            review_id: reviewId,
            source_id: source.id,
            source_url: source.source_url,
            firecrawl_method: hasSchema ? "extract" : "scrape",
            request_payload: requestPayload,
            response_payload: row,
            extraction_metadata: { source_name: source.source_name, platform: source.platform },
            checksum: await sha256(JSON.stringify(row)),
          });

          if (changed && !dryRun) {
            await fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ review_id: reviewId, force: true }),
            }).catch(() => null);
          }
        }

        const nextPollAt = new Date(now.getTime() + Number(source.poll_frequency_hours ?? 5) * 60 * 60 * 1000).toISOString();
        await serviceClient.from("guest_review_sources").update({
          last_polled_at: now.toISOString(),
          last_success_at: now.toISOString(),
          next_poll_at: nextPollAt,
          consecutive_failures: 0,
          health_status: "healthy",
          last_error: null,
        }).eq("id", source.id);

        await serviceClient.from("guest_review_collection_runs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          reviews_collected: reviewsCollected,
          reviews_new: reviewsNew,
          reviews_updated: reviewsUpdated,
          result_summary: { source_name: source.source_name, platform: source.platform, dry_run: dryRun },
        }).eq("id", runRow.id);

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "completed",
          reviews_collected: reviewsCollected,
          reviews_new: reviewsNew,
          reviews_updated: reviewsUpdated,
        });
      } catch (error) {
        const failures = Number(source.consecutive_failures ?? 0) + 1;
        const health = failures >= 3 ? "degraded" : "healthy";
        const message = error instanceof Error ? error.message : String(error);
        await serviceClient.from("guest_review_sources").update({
          last_polled_at: now.toISOString(),
          consecutive_failures: failures,
          health_status: health,
          last_error: message,
        }).eq("id", source.id);

        await serviceClient.from("guest_review_collection_runs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          reviews_collected: reviewsCollected,
          reviews_new: reviewsNew,
          reviews_updated: reviewsUpdated,
          error_count: 1,
          error_message: message,
        }).eq("id", runRow.id);

        await serviceClient.from("guest_review_audit_events").insert({
          property_id: source.property_id,
          event_type: "source_collection_failed",
          event_payload: { source_id: source.id, source_name: source.source_name, error: message, consecutive_failures: failures },
        });

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "failed",
          error: message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_sources: dueSources.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("guest-review-collector failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
