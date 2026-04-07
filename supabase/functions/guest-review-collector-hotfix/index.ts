import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MANUAL_ALLOWED_ROLES = new Set([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
]);

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const MAX_SOURCES_PER_RUN = 8;
const DEFAULT_MAX_REVIEW_AGE_DAYS = 30;

const FIRECRAWL_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          source_review_id: { type: ["string", "null"] },
          reviewer_name: { type: ["string", "null"] },
          review_title: { type: ["string", "null"] },
          review_text: { type: ["string", "null"] },
          rating: { type: ["number", "string", "null"] },
          rating_scale: { type: ["number", "string", "null"] },
          published_at: { type: ["string", "null"] },
          review_language: { type: ["string", "null"] },
          review_url: { type: ["string", "null"] },
        },
        required: ["review_text"],
      },
    },
  },
  required: ["reviews"],
} as const;

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

function timingSafeBearerMatch(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function isServiceRoleJwt(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeReviewText(value: unknown): string {
  return cleanText(value);
}

function toNullableString(value: unknown): string | null {
  const text = cleanText(value);
  return text ? text : null;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const text = cleanText(value)
    .replace(/^reviewed:\s*/i, "")
    .replace(/^reviewed\s+/i, "")
    .trim();
  if (!text) return null;

  const now = new Date();
  const relativeMatch = text
    .toLowerCase()
    .match(/(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/);
  if (relativeMatch) {
    const amount = Number.parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const date = new Date(now);
    if (unit.startsWith("day")) date.setDate(date.getDate() - amount);
    else if (unit.startsWith("week")) date.setDate(date.getDate() - amount * 7);
    else if (unit.startsWith("month")) date.setMonth(date.getMonth() - amount);
    else if (unit.startsWith("year"))
      date.setFullYear(date.getFullYear() - amount);
    return date.toISOString();
  }

  if (text.toLowerCase().includes("yesterday")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

function normalizeRating(
  value: unknown,
  scale?: unknown,
): { r5: number | null; r10: number | null } {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return { r5: null, r10: null };

  const explicitScale = Number(scale);
  if (Number.isFinite(explicitScale) && explicitScale > 0) {
    const normalized10 = Number(((rating / explicitScale) * 10).toFixed(2));
    return { r5: Number((normalized10 / 2).toFixed(2)), r10: normalized10 };
  }

  if (rating <= 5)
    return {
      r5: Number(rating.toFixed(2)),
      r10: Number((rating * 2).toFixed(2)),
    };
  if (rating <= 10)
    return {
      r5: Number((rating / 2).toFixed(2)),
      r10: Number(rating.toFixed(2)),
    };
  return { r5: null, r10: null };
}

function isReviewOlderThanDays(
  publishedAt: string,
  maxAgeDays: number,
  now = new Date(),
): boolean {
  const reviewDate = new Date(publishedAt);
  if (Number.isNaN(reviewDate.getTime())) return true;
  return (
    now.getTime() - reviewDate.getTime() > maxAgeDays * 24 * 60 * 60 * 1000
  );
}

function reviewsUrl(url: string, platform: string, sinceDate?: string): string {
  if (platform !== "booking") return url;

  const match = url.match(
    /booking\.com\/hotel\/([^/]+)\/([^./]+)(?:\.[a-z-]+)?\.html/i,
  );
  if (!match) return url;

  let reviewUrl = `https://www.booking.com/reviewlist.html?pagename=${match[2]}&cc1=${match[1]}&type=total&order=review_date_and_time&rows=10`;
  if (sinceDate) reviewUrl += `&checkin=${sinceDate}`;
  return reviewUrl;
}

function matchOne(input: string, pattern: RegExp): string | null {
  return input.match(pattern)?.[1] ?? null;
}

function collectMatches(input: string, pattern: RegExp): string[] {
  return Array.from(input.matchAll(pattern), (match) => match[1]).filter(
    Boolean,
  );
}

function blockSplit(input: string, pattern: RegExp): string[] {
  return Array.from(input.matchAll(pattern), (match) => match[0]);
}

function mapGoogleReviews(reviews: Array<Record<string, unknown>>) {
  return reviews
    .map((review) => ({
      source_review_id: toNullableString(
        review.reviewId ?? review.review_id ?? review.id,
      ),
      reviewer_name: toNullableString(
        (isObject(review.user) ? review.user.name : null) ?? review.name,
      ),
      review_title: toNullableString(review.title),
      review_text: sanitizeReviewText(
        review.snippet ?? review.text ?? review.body,
      ),
      rating: review.rating ?? null,
      rating_scale: 5,
      published_at: parseDate(review.isoDate ?? review.iso_date ?? review.date),
      review_language: toNullableString(review.language) ?? "en",
      review_url: toNullableString(review.link),
      metadata: review,
    }))
    .filter((review) => review.review_text);
}

function mapFirecrawlJsonReviews(payload: Record<string, unknown>) {
  const jsonBlock = isObject(payload.json)
    ? payload.json
    : Array.isArray(payload.json)
      ? { reviews: payload.json }
      : payload;
  const rows = Array.isArray(jsonBlock.reviews) ? jsonBlock.reviews : [];

  return rows
    .map((review) => {
      const row = isObject(review) ? review : {};
      return {
        source_review_id: toNullableString(
          row.source_review_id ?? row.review_id ?? row.id,
        ),
        reviewer_name: toNullableString(
          row.reviewer_name ?? row.reviewer ?? row.author,
        ),
        review_title: toNullableString(row.review_title ?? row.title),
        review_text: sanitizeReviewText(
          row.review_text ?? row.text ?? row.comment ?? row.content,
        ),
        rating: row.rating ?? row.score ?? row.stars,
        rating_scale: row.rating_scale ?? row.scale ?? row.ratingScale,
        published_at: parseDate(row.published_at ?? row.date ?? row.created_at),
        review_language: toNullableString(row.review_language ?? row.language),
        review_url: toNullableString(row.review_url ?? row.url ?? row.link),
        metadata: row,
      };
    })
    .filter((review) => review.review_text);
}

function parseBookingReviews(html: string) {
  const blocks = blockSplit(
    html,
    /<li class="review_list_new_item_block"[\s\S]*?(?=<li class="review_list_new_item_block"|$)/g,
  );

  return blocks
    .map((block) => {
      const reviewBodies = collectMatches(
        block,
        /<span class="c-review__body"[^>]*>([\s\S]*?)<\/span>/g,
      )
        .map((text) => sanitizeReviewText(text))
        .filter(Boolean);

      return {
        source_review_id: toNullableString(
          matchOne(block, /data-review-url="([^"]+)"/i),
        ),
        reviewer_name: toNullableString(
          matchOne(
            block,
            /<span class="bui-avatar-block__title">([\s\S]*?)<\/span>/i,
          ),
        ),
        review_title: toNullableString(
          matchOne(
            block,
            /<h3[^>]*class="[^"]*c-review-block__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
          ),
        ),
        review_text: reviewBodies.join("\n").trim(),
        rating:
          matchOne(
            block,
            /<div class="bui-review-score__badge"[^>]*>\s*([0-9.]+)\s*<\/div>/i,
          ) ?? matchOne(block, /aria-label="Scored ([0-9.]+)/i),
        rating_scale: 10,
        published_at: parseDate(
          matchOne(block, /Reviewed:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ??
            matchOne(block, /Reviewed:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i) ??
            matchOne(block, /data-date="(\d{4}-\d{2}-\d{2})"/i) ??
            matchOne(block, /Reviewed:\s*([^<\n]+)/i),
        ),
        review_language: toNullableString(
          matchOne(block, /<span class="c-review__body"[^>]*lang="([^"]+)"/i),
        ),
        review_url: toNullableString(
          matchOne(block, /data-review-url="([^"]+)"/i),
        ),
        metadata: null,
      };
    })
    .filter((review) => review.review_text);
}

function parseAgodaReviews(html: string) {
  const blocks = blockSplit(
    html,
    /<div data-element-name="review-comment"[\s\S]*?(?=<div data-element-name="review-comment"|<\/ol>)/g,
  );

  return blocks
    .map((block) => ({
      source_review_id: toNullableString(
        matchOne(block, /data-review-id="([^"]+)"/i),
      ),
      reviewer_name: toNullableString(
        matchOne(
          block,
          /data-info-type="reviewer-name"[\s\S]*?<strong>([\s\S]*?)<\/strong>/i,
        ),
      ),
      review_title: toNullableString(
        matchOne(block, /data-testid="review-title">([\s\S]*?)<\/h4>/i),
      ),
      review_text: sanitizeReviewText(
        matchOne(block, /data-testid="review-comment">([\s\S]*?)<\/p>/i),
      ),
      rating: matchOne(
        block,
        /<div class="Review-comment-leftScore">([0-9.]+)<\/div>/i,
      ),
      rating_scale: 10,
      published_at: parseDate(
        matchOne(block, /Reviewed\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ??
          matchOne(block, /Reviewed\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i) ??
          matchOne(block, /data-selenium="review-date"[^>]*>([^<]+)/i),
      ),
      review_language: null,
      review_url: toNullableString(
        matchOne(block, /data-review-id="([^"]+)"/i),
      ),
      metadata: null,
    }))
    .filter((review) => review.review_text);
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getVaultSecret(
  client: ReturnType<typeof createClient>,
  name: string,
): Promise<string | null> {
  const envValue = Deno.env.get(name);
  if (envValue?.trim()) return envValue.trim();
  const { data } = await client
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", name)
    .limit(1)
    .maybeSingle();
  return typeof data?.decrypted_secret === "string"
    ? data.decrypted_secret
    : null;
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

  const { data: roleRows } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);
  const roles = (roleRows ?? []).map((row) => row.role);
  return roles.some((role) => MANUAL_ALLOWED_ROLES.has(role))
    ? { userId: authData.user.id, roles }
    : null;
}

async function callFirecrawl(payload: Record<string, unknown>, apiKey: string) {
  const response = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Firecrawl HTTP ${response.status}: ${(await response.text().catch(() => "")).slice(0, 300)}`,
    );
  }

  const result = await response.json().catch(() => null);
  if (!isObject(result) || result.success !== true || !isObject(result.data)) {
    throw new Error("Firecrawl returned an invalid payload");
  }
  return result.data;
}

async function fetchGoogleReviews(
  source: Record<string, unknown>,
  serperKey: string,
) {
  const schema = isObject(source.firecrawl_extract_schema)
    ? source.firecrawl_extract_schema
    : {};
  const cid = typeof schema.cid === "string" ? schema.cid : null;
  if (!cid) throw new Error(`Google source missing cid: ${source.source_name}`);

  const response = await fetch("https://google.serper.dev/reviews", {
    method: "POST",
    headers: {
      "X-API-KEY": serperKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cid, gl: "sa", hl: "en" }),
  });

  if (!response.ok) {
    throw new Error(
      `Serper Reviews HTTP ${response.status}: ${(await response.text().catch(() => "")).slice(0, 300)}`,
    );
  }

  const payload = await response.json().catch(() => null);
  return {
    method: "serper",
    reviews: mapGoogleReviews(
      Array.isArray(payload?.reviews) ? payload.reviews : [],
    ),
  };
}

async function fetchOtaReviews(
  source: Record<string, unknown>,
  apiKeys: string[],
  platform: "booking" | "agoda",
) {
  const firecrawlOptions = isObject(source.firecrawl_options)
    ? source.firecrawl_options
    : {};
  const prompt =
    typeof firecrawlOptions.prompt === "string" &&
    firecrawlOptions.prompt.trim()
      ? firecrawlOptions.prompt.trim()
      : `Extract real ${platform} guest reviews visible on this page. Return only JSON with a top-level reviews array.`;
  const maxAgeDays = Number.isFinite(Number(firecrawlOptions.maxReviewAgeDays))
    ? Math.max(1, Math.floor(Number(firecrawlOptions.maxReviewAgeDays)))
    : DEFAULT_MAX_REVIEW_AGE_DAYS;

  const sinceDate = source.last_success_at
    ? new Date(String(source.last_success_at)).toISOString().slice(0, 10)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const request = {
    url: reviewsUrl(String(source.source_url ?? ""), platform, sinceDate),
    timeout: 45000,
    waitFor: platform === "agoda" ? 5000 : 2500,
    proxy: platform === "agoda" ? "enhanced" : "auto",
    maxAge: 0,
    storeInCache: false,
    blockAds: true,
    removeBase64Images: true,
    location: {
      country: "SA",
      languages: ["en-US", "ar-SA"],
    },
  };

  const errors: string[] = [];

  for (const apiKey of apiKeys) {
    try {
      const htmlPayload = await callFirecrawl(
        {
          ...request,
          formats: ["rawHtml", "html"],
          onlyMainContent: false,
        },
        apiKey,
      );

      const rawHtml =
        typeof htmlPayload.rawHtml === "string" && htmlPayload.rawHtml.trim()
          ? htmlPayload.rawHtml
          : typeof htmlPayload.html === "string"
            ? htmlPayload.html
            : "";

      const htmlReviews =
        platform === "booking"
          ? parseBookingReviews(rawHtml)
          : parseAgodaReviews(rawHtml);
      if (htmlReviews.length > 0) {
        return {
          method: `firecrawl+${platform}-html`,
          reviews: htmlReviews,
          maxAgeDays,
        };
      }

      const jsonPayload = await callFirecrawl(
        {
          ...request,
          formats: [
            {
              type: "json",
              schema: FIRECRAWL_REVIEW_SCHEMA,
              prompt,
            },
          ],
          onlyMainContent: true,
        },
        apiKey,
      );

      const jsonReviews = mapFirecrawlJsonReviews(jsonPayload);
      if (jsonReviews.length > 0) {
        return {
          method: `firecrawl+${platform}-json`,
          reviews: jsonReviews,
          maxAgeDays,
        };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(
    errors.join(" | ") || `No Firecrawl key configured for ${platform}`,
  );
}

function buildFingerprint(
  row: Record<string, unknown>,
  publishedAt: string,
  rating10: number | null,
) {
  return JSON.stringify({
    reviewer_name: toNullableString(row.reviewer_name),
    review_title: toNullableString(row.review_title),
    review_text: sanitizeReviewText(row.review_text),
    rating_normalized_10: rating10,
    published_at: publishedAt,
  });
}

async function enqueueAnalysis(
  supabaseUrl: string,
  serviceRoleKey: string,
  reviewId: string,
) {
  await fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ review_id: reviewId, force: true }),
  }).catch((error) =>
    console.error("guest-review-analyzer enqueue failed", error),
  );
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
    const sourceId = typeof body.source_id === "string" ? body.source_id : null;
    const runMode =
      typeof body.run_mode === "string" ? body.run_mode : "scheduled";
    const batchOffset =
      typeof body.batch_offset === "number" ? Number(body.batch_offset) : 0;
    const maxSources =
      typeof body.max_sources === "number"
        ? Number(body.max_sources)
        : MAX_SOURCES_PER_RUN;
    const dryRun = body.dry_run === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const isInternalService =
      timingSafeBearerMatch(authHeader, serviceRoleKey) ||
      isServiceRoleJwt(authHeader);
    if (!isInternalService) {
      const manualContext = await getManualContext(
        supabaseUrl,
        anonKey,
        authHeader,
        serviceClient,
      );
      if (!manualContext) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const serperKey = await getVaultSecret(serviceClient, "SERPER_API_KEY");
    const firecrawlKeys = [
      await getVaultSecret(serviceClient, "FIRECRAWL_API_KEY"),
      await getVaultSecret(serviceClient, "FIRECRAWL_API_KEY_BACKUP"),
    ].filter((value): value is string => Boolean(value));

    const now = new Date();
    const { data: sourceRows, error: sourceError } = await serviceClient
      .from("guest_review_sources")
      .select("*")
      .eq("is_active", true)
      .eq("polling_enabled", true)
      .order("updated_at", { ascending: true });
    if (sourceError) throw sourceError;

    const allDue = (sourceRows ?? []).filter((source) => {
      if (sourceId && String(source.id) !== sourceId) return false;
      if (runMode === "manual" || runMode === "backfill" || sourceId !== null)
        return true;
      if (!source.next_poll_at) return true;
      return new Date(String(source.next_poll_at)).getTime() <= now.getTime();
    });

    const dueSources = allDue.slice(batchOffset, batchOffset + maxSources);
    const results: Array<Record<string, unknown>> = [];

    for (const source of dueSources) {
      const { data: runRow, error: runError } = await serviceClient
        .from("guest_review_collection_runs")
        .insert({ source_id: source.id, run_mode: runMode, status: "running" })
        .select("id")
        .single();
      if (runError) throw runError;

      let reviewsCollected = 0;
      let reviewsNew = 0;
      let reviewsUpdated = 0;
      let skippedStale = 0;

      try {
        const platform = String(source.platform ?? "");
        const collected =
          platform === "google"
            ? await fetchGoogleReviews(source, serperKey ?? "")
            : await fetchOtaReviews(
                source,
                firecrawlKeys,
                platform as "booking" | "agoda",
              );

        const maxAgeDays =
          "maxAgeDays" in collected
            ? collected.maxAgeDays
            : DEFAULT_MAX_REVIEW_AGE_DAYS;
        reviewsCollected = collected.reviews.length;

        for (const review of collected.reviews) {
          const reviewText = sanitizeReviewText(review.review_text);
          const publishedAt = parseDate(review.published_at);
          if (
            !reviewText ||
            !publishedAt ||
            isReviewOlderThanDays(publishedAt, maxAgeDays, now)
          ) {
            skippedStale += 1;
            continue;
          }

          const rating = normalizeRating(review.rating, review.rating_scale);
          const sourceReviewId = toNullableString(review.source_review_id);
          const reviewerName = toNullableString(review.reviewer_name);
          const dedupeHash = await sha256(
            [
              String(source.property_id),
              String(source.platform),
              sourceReviewId ?? "",
              reviewerName ?? "",
              publishedAt,
              String(rating.r10 ?? ""),
              reviewText.toLowerCase(),
            ].join("|"),
          );

          let existingId: string | null = null;
          if (sourceReviewId) {
            const { data } = await serviceClient
              .from("guest_reviews")
              .select("id")
              .eq("property_id", source.property_id)
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

          const timestamp = new Date().toISOString();
          const payload = {
            source_id: source.id,
            property_id: source.property_id,
            platform: source.platform,
            source_review_id: sourceReviewId,
            review_url: toNullableString(review.review_url),
            source_listing_url: source.source_url,
            reviewer_name: reviewerName,
            review_title: toNullableString(review.review_title),
            review_text: reviewText,
            review_text_normalized: reviewText.toLowerCase(),
            review_language: toNullableString(review.review_language) ?? "en",
            original_rating: rating.r5,
            rating_normalized_5: rating.r5,
            rating_normalized_10: rating.r10,
            published_at: publishedAt,
            dedupe_hash: dedupeHash,
            status: "collected",
            ai_analysis_status: "pending",
            metadata: review.metadata ?? review,
            collected_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp,
          };

          if (existingId) {
            const { data: old } = await serviceClient
              .from("guest_reviews")
              .select(
                "reviewer_name, review_title, review_text, rating_normalized_10, published_at",
              )
              .eq("id", existingId)
              .maybeSingle();

            const previousFingerprint = buildFingerprint(
              old ?? {},
              old?.published_at ?? "",
              old?.rating_normalized_10 ?? null,
            );
            const nextFingerprint = buildFingerprint(
              payload,
              publishedAt,
              rating.r10,
            );
            if (previousFingerprint === nextFingerprint) continue;

            if (!dryRun) {
              const { created_at: _createdAt, ...updatePayload } = payload;
              const { error } = await serviceClient
                .from("guest_reviews")
                .update(updatePayload)
                .eq("id", existingId);
              if (error) throw error;
              await enqueueAnalysis(supabaseUrl, serviceRoleKey, existingId);
            }
            reviewsUpdated += 1;
            continue;
          }

          if (!dryRun) {
            const { data, error } = await serviceClient
              .from("guest_reviews")
              .insert(payload)
              .select("id")
              .single();
            if (error || !data?.id)
              throw error ?? new Error("Failed to insert guest review");
            await enqueueAnalysis(supabaseUrl, serviceRoleKey, String(data.id));
          }
          reviewsNew += 1;
        }

        await serviceClient
          .from("guest_review_sources")
          .update({
            last_polled_at: now.toISOString(),
            last_success_at: now.toISOString(),
            next_poll_at: new Date(
              now.getTime() +
                Number(source.poll_frequency_hours ?? 24) * 3_600_000,
            ).toISOString(),
            consecutive_failures: 0,
            health_status: "healthy",
            last_error: null,
          })
          .eq("id", source.id);

        await serviceClient
          .from("guest_review_collection_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            reviews_collected: reviewsCollected,
            reviews_new: reviewsNew,
            reviews_updated: reviewsUpdated,
            result_summary: {
              method: collected.method,
              skipped_stale: skippedStale,
              dry_run: dryRun,
            },
          })
          .eq("id", runRow.id);

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "completed",
          method: collected.method,
          reviews_collected: reviewsCollected,
          reviews_new: reviewsNew,
          reviews_updated: reviewsUpdated,
          skipped_stale: skippedStale,
        });
      } catch (error) {
        const failures = Number(source.consecutive_failures ?? 0) + 1;
        const message = error instanceof Error ? error.message : String(error);

        await serviceClient
          .from("guest_review_sources")
          .update({
            last_polled_at: now.toISOString(),
            consecutive_failures: failures,
            health_status: failures >= 3 ? "degraded" : "healthy",
            last_error: message,
          })
          .eq("id", source.id);

        await serviceClient
          .from("guest_review_collection_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            reviews_collected: reviewsCollected,
            error_count: 1,
            error_message: message,
          })
          .eq("id", runRow.id);

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "failed",
          error: message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_sources: dueSources.length,
        total_due: allDue.length,
        batch_offset: batchOffset,
        has_more: batchOffset + maxSources < allDue.length,
        next_batch_offset:
          batchOffset + maxSources < allDue.length
            ? batchOffset + maxSources
            : null,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("guest-review-collector-hotfix error:", error);
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
