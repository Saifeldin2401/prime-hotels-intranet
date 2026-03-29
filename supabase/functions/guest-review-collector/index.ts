import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MANUAL_ALLOWED_ROLES = new Set([
  "corporate_admin", "regional_admin", "regional_hr", "property_manager", "property_hr",
]);

// ScraperAPI JS-rendering cost tiers
// render=true  → 5 credits, needed for SPA/JS-heavy pages
// premium=true → 10 credits, needed for heavily protected sites (Booking, TripAdvisor)
const SCRAPER_RENDER_PLATFORMS = new Set(["tripadvisor", "expedia", "hotels_com", "agoda"]);
const SCRAPER_PREMIUM_PLATFORMS = new Set(["booking"]);

// ─── Utility ──────────────────────────────────────────────────────────────────

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
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

/** Return ISO string if parseable, else null (handles "3 months ago" etc). */
function parseDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function getVaultSecret(client: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const envValue = Deno.env.get(name);
  if (envValue?.trim()) return envValue.trim();
  const { data } = await client.from("vault.decrypted_secrets").select("decrypted_secret").filter("name", "eq", name).limit(1).maybeSingle();
  return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
}

async function getManualContext(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error } = await userClient.auth.getUser();
  if (error || !authData.user) return null;
  const { data: roleRows } = await serviceClient.from("user_roles").select("role").eq("user_id", authData.user.id);
  const roles = (roleRows ?? []).map((r) => r.role);
  if (!roles.some((r) => MANUAL_ALLOWED_ROLES.has(r))) return null;
  return { userId: authData.user.id, roles };
}

// ─── Google / Serper ──────────────────────────────────────────────────────────

function extractFidFromGoogleUrl(url: string): string | null {
  try {
    const match = decodeURIComponent(url).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
    return match ? match[1] : null;
  } catch { return null; }
}

function extractGoogleSearchQuery(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("query") ?? u.searchParams.get("q");
  } catch { return null; }
}

async function findGoogleCidBySearch(query: string, serperKey: string): Promise<string | null> {
  const placesRes = await fetch("https://google.serper.dev/places", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "sa", hl: "en" }),
  });
  if (placesRes.ok) {
    const data = await placesRes.json() as Record<string, unknown>;
    for (const place of (data.places as Array<Record<string, unknown>> ?? [])) {
      if (place.cid) return `cid:${place.cid}`;
    }
  }
  // Fallback: web search for a maps link with an embedded FID
  const searchRes = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: `${query} google maps reviews`, gl: "sa", hl: "en", num: 5 }),
  });
  if (!searchRes.ok) return null;
  const data = await searchRes.json() as Record<string, unknown>;
  for (const r of (data.organic as Array<Record<string, unknown>> ?? [])) {
    const link = String(r.link ?? "");
    if (link.includes("google.com/maps") || link.includes("maps.google.com")) {
      const fid = extractFidFromGoogleUrl(link);
      if (fid) return fid;
    }
  }
  return null;
}

async function callSerperReviews(body: Record<string, unknown>, serperKey: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch("https://google.serper.dev/reviews", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Serper Reviews HTTP ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json() as Record<string, unknown>;
  return Array.isArray(data.reviews) ? data.reviews as Array<Record<string, unknown>> : [];
}

async function fetchSerperReviews(
  source: Record<string, unknown>,
  serperKey: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Array<Record<string, unknown>>> {
  const sourceUrl = String(source.source_url ?? "");
  const schema = (source.firecrawl_extract_schema ?? {}) as Record<string, unknown>;
  const sourceName = String(source.source_name ?? "");

  // 1. Stored identifier
  if (schema.cid || schema.fid || schema.place_id) {
    const body: Record<string, unknown> = { gl: "sa", hl: "en" };
    if (schema.cid) body.cid = String(schema.cid);
    else if (schema.fid) body.fid = String(schema.fid);
    else body.placeId = String(schema.place_id);
    const reviews = await callSerperReviews(body, serperKey);
    if (reviews.length > 0) return mapSerperReviews(reviews);
  }

  // 2. FID from URL
  const urlFid = extractFidFromGoogleUrl(sourceUrl);
  if (urlFid) {
    const reviews = await callSerperReviews({ fid: urlFid, gl: "sa", hl: "en" }, serperKey);
    if (reviews.length > 0) return mapSerperReviews(reviews);
  }

  // 3. Search → CID discovery
  const searchQuery = extractGoogleSearchQuery(sourceUrl) ?? sourceName.replace(/^Google.*?-\s*/i, "").trim();
  if (!searchQuery) throw new Error("Cannot resolve Google Place identifier");

  console.log(`Resolving CID for "${searchQuery}" via Serper…`);
  const resolvedId = await findGoogleCidBySearch(searchQuery, serperKey);
  if (!resolvedId) throw new Error(`Could not find Google Place via search: ${searchQuery}`);

  const body: Record<string, unknown> = { gl: "sa", hl: "en" };
  if (resolvedId.startsWith("cid:")) {
    const cid = resolvedId.slice(4);
    body.cid = cid;
    try {
      await serviceClient.from("guest_review_sources")
        .update({ firecrawl_extract_schema: { ...schema, cid } })
        .eq("id", source.id);
      console.log(`Persisted CID ${cid} for ${sourceName}`);
    } catch { /* non-fatal */ }
  } else {
    body.fid = resolvedId;
    try {
      await serviceClient.from("guest_review_sources")
        .update({ firecrawl_extract_schema: { ...schema, fid: resolvedId } })
        .eq("id", source.id);
    } catch { /* non-fatal */ }
  }

  const reviews = await callSerperReviews(body, serperKey);
  if (reviews.length === 0) throw new Error(`Serper returned 0 reviews for: ${searchQuery}`);
  return mapSerperReviews(reviews);
}

function mapSerperReviews(reviews: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return reviews.map((r) => ({
    review_text: r.snippet ?? r.text ?? r.body ?? "",
    reviewer_name: r.name ?? r.user ?? null,
    rating: r.rating ?? null,
    published_at: parseDate(r.iso_date) ?? parseDate(r.date),
    review_title: r.title ?? null,
    source_review_id: r.reviewId ?? r.review_id ?? r.id ?? null,
    review_url: r.link ?? null,
    review_language: r.language ?? "en",
  }));
}

// ─── ScraperAPI (OTA scraping) ────────────────────────────────────────────────

/**
 * Scrape a URL via ScraperAPI.
 * - premium=true for Booking.com (heavily bot-protected, residential proxy)
 * - render=true for JS-heavy platforms (TripAdvisor, Expedia, Hotels.com, Agoda)
 */
async function fetchWithScraperApi(url: string, apiKey: string, platform: string): Promise<string> {
  const params = new URLSearchParams({ api_key: apiKey, url });
  if (SCRAPER_PREMIUM_PLATFORMS.has(platform)) {
    params.set("premium", "true");
    params.set("render", "true");
  } else if (SCRAPER_RENDER_PLATFORMS.has(platform)) {
    params.set("render", "true");
  }
  // For all hotel review pages request English
  params.set("country_code", "us");

  const res = await fetch(`https://api.scraperapi.com/?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScraperAPI HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return await res.text();
}

/** Strip HTML and decode entities → plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

/**
 * Use HuggingFace LLM to extract structured hotel reviews from page text.
 * targetDate is used to bias extraction toward recent reviews (YYYY-MM-DD).
 */
async function extractReviewsWithAI(
  pageText: string,
  hfToken: string,
  hfModel: string,
  platform: string,
  targetDate: string,
): Promise<Array<Record<string, unknown>>> {
  const snippet = pageText.slice(0, 16000);
  const yesterday = targetDate; // e.g. "2026-03-28"

  const prompt =
    `You are extracting hotel guest reviews from a ${platform} webpage. ` +
    `Today is ${new Date().toISOString().slice(0, 10)}. Focus especially on reviews posted on or around ${yesterday}. ` +
    `Extract ALL individual reviews visible in the text (prioritise the most recent ones). ` +
    `Return ONLY a valid JSON array — no markdown, no extra text. Each object must have:\n` +
    `- "review_text" (string, required — the full review body, preserve original language)\n` +
    `- "reviewer_name" (string or null)\n` +
    `- "rating" (number or null — convert to a 0-10 scale; if given out of 5 multiply by 2)\n` +
    `- "published_at" (ISO 8601 date string or null — use null if only relative like "2 days ago")\n` +
    `- "review_title" (string or null)\n` +
    `- "source_review_id" (string or null — any unique id visible in the HTML)\n` +
    `- "review_language" (2-letter ISO code or null)\n\n` +
    `PAGE TEXT:\n${snippet}\n\nJSON array:`;

  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: hfModel,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`HuggingFace HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const content = ((data.choices as Array<Record<string, unknown>>)?.[0]
    ?.message as Record<string, unknown>)?.content as string ?? "[]";

  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sourceId = typeof body.source_id === "string" ? body.source_id : null;
    const runMode = typeof body.run_mode === "string" ? body.run_mode : "scheduled";
    const dryRun = body.dry_run === true;

    // target_date defaults to yesterday (YYYY-MM-DD)
    const defaultYesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const targetDate = typeof body.target_date === "string" ? body.target_date : defaultYesterday;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth
    const vaultServiceRoleKey = await getVaultSecret(serviceClient, "service_role_key");
    const isInternalService =
      timingSafeBearerMatch(authHeader, serviceRoleKey) ||
      (vaultServiceRoleKey ? timingSafeBearerMatch(authHeader, vaultServiceRoleKey) : false);

    if (!isInternalService) {
      const ctx = await getManualContext(supabaseUrl, anonKey, authHeader, serviceClient);
      if (!ctx) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve API keys
    const serperKey = await getVaultSecret(serviceClient, "SERPER_API_KEY");
    const scraperKey = await getVaultSecret(serviceClient, "SCRAPER_API_KEY");
    const hfToken = Deno.env.get("HUGGINGFACE_TOKEN") ?? await getVaultSecret(serviceClient, "HUGGINGFACE_TOKEN") ?? "";
    const hfModel = Deno.env.get("HF_TRANSLATION_MODEL") || "Qwen/Qwen2.5-7B-Instruct";

    if (!serperKey && !scraperKey) {
      return new Response(JSON.stringify({ success: false, error: "No API keys configured (SERPER_API_KEY or SCRAPER_API_KEY required)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    console.log(`Processing ${dueSources.length} due sources (target_date: ${targetDate})`);

    const results: Array<Record<string, unknown>> = [];

    for (const source of dueSources) {
      const { data: runRow } = await serviceClient
        .from("guest_review_collection_runs")
        .insert({ source_id: source.id, run_mode: runMode, status: "running" })
        .select("id")
        .single();

      let reviewsCollected = 0;
      let reviewsNew = 0;
      let reviewsUpdated = 0;
      let collectionMethod = "unknown";

      try {
        let candidates: Array<Record<string, unknown>>;

        if (source.platform === "google") {
          // ── Google: Serper /reviews ──
          if (!serperKey) throw new Error("SERPER_API_KEY not configured for Google source");
          console.log(`[${source.source_name}] Fetching via Serper…`);
          candidates = await fetchSerperReviews(source, serperKey, serviceClient);
          collectionMethod = "serper";
        } else {
          // ── OTA platforms: ScraperAPI + HuggingFace ──
          if (!scraperKey) throw new Error("SCRAPER_API_KEY not configured for OTA source");
          if (!hfToken) throw new Error("HUGGINGFACE_TOKEN not configured for AI extraction");

          console.log(`[${source.source_name}] Scraping via ScraperAPI (${source.platform})…`);
          const html = await fetchWithScraperApi(source.source_url, scraperKey, source.platform);
          const pageText = htmlToText(html);

          if (pageText.length < 200) throw new Error("ScraperAPI returned near-empty page");

          console.log(`[${source.source_name}] Extracting reviews via HuggingFace…`);
          candidates = await extractReviewsWithAI(pageText, hfToken, hfModel, source.platform, targetDate);
          collectionMethod = "scraperapi+ai";
        }

        reviewsCollected = candidates.length;
        if (reviewsCollected === 0) throw new Error("No reviews returned from collection step");

        // ── Upsert each review ──
        for (const row of candidates) {
          const reviewText = cleanText(row.review_text ?? row.text ?? row.content ?? row.comment);
          if (!reviewText) continue;

          const sourceReviewId = toNullableString(row.source_review_id ?? row.review_id ?? row.id);
          const reviewerName = toNullableString(row.reviewer_name ?? row.reviewer ?? row.author);
          const publishedAt = parseDate(row.published_at ?? row.date ?? row.created_at);
          const rating = normalizeRating(row.rating ?? row.score ?? row.stars);
          const dedupeHash = await sha256([
            String(source.property_id),
            String(source.platform),
            sourceReviewId ?? "",
            reviewerName ?? "",
            publishedAt ?? "",
            String(rating.r10 ?? ""),
            reviewText.toLowerCase(),
          ].join("|"));

          // Deduplicate: try source_review_id first, then hash
          let existingId: string | null = null;
          if (sourceReviewId) {
            const { data } = await serviceClient.from("guest_reviews").select("id")
              .eq("platform", source.platform).eq("source_review_id", sourceReviewId).maybeSingle();
            existingId = data?.id ? String(data.id) : null;
          }
          if (!existingId) {
            const { data } = await serviceClient.from("guest_reviews").select("id")
              .eq("dedupe_hash", dedupeHash).maybeSingle();
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
            const { error: updateErr } = await serviceClient.from("guest_reviews").update(reviewPayload).eq("id", existingId);
            if (updateErr) { console.error("UPDATE error:", updateErr.message); continue; }
            reviewId = existingId;
            if (changed) reviewsUpdated += 1;
          } else {
            const { data, error: insertErr } = await serviceClient.from("guest_reviews").insert(reviewPayload).select("id").single();
            if (insertErr) { console.error("INSERT error:", insertErr.message, insertErr.code); continue; }
            reviewId = String(data?.id);
            reviewsNew += 1;
          }

          // Raw snapshot
          await serviceClient.from("guest_review_raw_snapshots").insert({
            review_id: reviewId,
            source_id: source.id,
            source_url: source.source_url,
            firecrawl_method: collectionMethod,
            request_payload: { url: source.source_url, platform: source.platform, method: collectionMethod, target_date: targetDate },
            response_payload: row,
            extraction_metadata: { source_name: source.source_name, platform: source.platform },
            checksum: await sha256(JSON.stringify(row)),
          }).then(({ error }) => { if (error) console.error("snapshot insert error:", error.message); });

          // Trigger analyzer for new/changed reviews
          if (changed && !dryRun) {
            fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
              method: "POST",
              headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ review_id: reviewId, force: true }),
            }).catch(() => null);
          }
        }

        const nextPollAt = new Date(now.getTime() + Number(source.poll_frequency_hours ?? 24) * 3_600_000).toISOString();
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
          result_summary: { source_name: source.source_name, platform: source.platform, method: collectionMethod, target_date: targetDate, dry_run: dryRun },
        }).eq("id", runRow.id);

        results.push({ source_id: source.id, source_name: source.source_name, status: "completed", method: collectionMethod, reviews_collected: reviewsCollected, reviews_new: reviewsNew, reviews_updated: reviewsUpdated });

        if (dueSources.length > 1) await sleep(800);
      } catch (error) {
        const failures = Number(source.consecutive_failures ?? 0) + 1;
        const message = error instanceof Error ? error.message : String(error);

        await serviceClient.from("guest_review_sources").update({
          last_polled_at: now.toISOString(),
          consecutive_failures: failures,
          health_status: failures >= 3 ? "degraded" : "healthy",
          last_error: message,
        }).eq("id", source.id);

        await serviceClient.from("guest_review_collection_runs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          reviews_collected: reviewsCollected,
          error_count: 1,
          error_message: message,
        }).eq("id", runRow.id);

        await serviceClient.from("guest_review_audit_events").insert({
          property_id: source.property_id,
          event_type: "source_collection_failed",
          event_payload: { source_id: source.id, source_name: source.source_name, error: message, consecutive_failures: failures },
        });

        results.push({ source_id: source.id, source_name: source.source_name, status: "failed", error: message });
        console.error(`[${source.source_name}] FAILED: ${message}`);
      }
    }

    const succeeded = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const totalNew = results.reduce((s, r) => s + Number(r.reviews_new ?? 0), 0);

    return new Response(
      JSON.stringify({ success: true, processed_sources: dueSources.length, succeeded, failed, total_new_reviews: totalNew, target_date: targetDate, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("guest-review-collector fatal:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
