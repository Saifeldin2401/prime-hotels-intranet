import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MANUAL_ALLOWED_ROLES = new Set([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
]);

const GOOGLE_PLACE_EXCLUDE_RE = /mall|shopping|restaurant|cafe|museum|park|beach|gym|hospital|clinic/i;
const GOOGLE_PLACE_LODGING_RE = /hotel|resort|lodging|inn|accommodation|suites|hostel|motel|serviced/i;
const INVALID_REVIEW_TEXT_RE = [
  /^scraperapi fetch - html length:/i,
  /^direct fetch - html length:/i,
  /^no review text provided\.?$/i,
  /^no comments\.?$/i,
];
const SUPPORTED_PLATFORMS = new Set(["google", "booking", "agoda"]);
const SCRAPER_RENDER_PLATFORMS = new Set(["agoda"]);
const MAX_SOURCES_PER_RUN = 8;

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

function isServiceRoleJwt(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string): string {
  try {
    const doc = new DOMParser().parseFromString(`<body>${value}</body>`, "text/html");
    const text = doc?.body?.textContent;
    if (typeof text === "string" && text.length > 0) return text;
  } catch {
    // Fall back to a small manual decoder if the runtime DOM parser is unavailable.
  }

  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    middot: "-",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\"",
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const num = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : _;
    }
    return named[entity] ?? _;
  });
}

function fixMojibake(value: string): string {
  return value
    .replace(/\u00c2/g, "")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, "\"")
    .replace(/\u00e2\u20ac\u009d/g, "\"")
    .replace(/\u00e2\u20ac"/g, "\"")
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u20ac\u00a6/g, "...")
    .replace(/\u00e2\u20ac\u00a2/g, "*")
    .replace(/\u00c5\u0178/g, "s");
}

function cleanText(value: unknown): string {
  return fixMojibake(
    decodeHtmlEntities(
      String(value ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  ).trim();
}

function sanitizeReviewText(value: unknown): string {
  const text = cleanText(value);
  if (!text) return "";
  if (INVALID_REVIEW_TEXT_RE.some((pattern) => pattern.test(text))) return "";
  return text;
}

function toNullableString(value: unknown): string | null {
  const v = cleanText(value);
  return v ? v : null;
}

function normalizeRating(value: unknown): { r5: number | null; r10: number | null } {
  const n = Number(value);
  if (!Number.isFinite(n)) return { r5: null, r10: null };
  if (n <= 5) return { r5: Number(n.toFixed(2)), r10: Number((n * 2).toFixed(2)) };
  if (n <= 10) return { r5: Number((n / 2).toFixed(2)), r10: Number(n.toFixed(2)) };
  return { r5: null, r10: null };
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  let s = cleanText(value);
  if (!s) return null;
  
  // Remove common prefixes
  s = s.replace(/^reviewed:\s*/i, "").replace(/^reviewed\s+/i, "").trim();
  
  const now = new Date();
  const lowerS = s.toLowerCase();
  
  // Handle relative dates (e.g., "2 days ago", "last week", "yesterday")
  const relativeMatch = lowerS.match(/(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const date = new Date(now);
    if (unit.startsWith("day")) date.setDate(date.getDate() - amount);
    else if (unit.startsWith("week")) date.setDate(date.getDate() - amount * 7);
    else if (unit.startsWith("month")) date.setMonth(date.getMonth() - amount);
    else if (unit.startsWith("year")) date.setFullYear(date.getFullYear() - amount);
    return date.toISOString();
  }
  
  if (lowerS.includes("yesterday")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }
  
  // Handle "last week", "this week", etc.
  if (lowerS.includes("last week")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }
  
  // Handle formats like "Mar 2026", "March 2026"
  const monthYearMatch = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthNames = ["january", "february", "march", "april", "may", "june",
                       "july", "august", "september", "october", "november", "december"];
    const monthIdx = monthNames.findIndex(m => monthYearMatch[1].toLowerCase().startsWith(m));
    if (monthIdx !== -1) {
      const date = new Date(parseInt(monthYearMatch[2], 10), monthIdx, 15);
      if (Number.isFinite(date.getTime())) return date.toISOString();
    }
  }
  
  // Handle formats like "29 Mar 2026", "March 29, 2026", "2026-03-29"
  // Try multiple date parsing approaches
  const dateFormats = [
    // "29 March 2026" or "29 Mar 2026"
    { regex: /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/, parser: (m: string[]) => new Date(`${m[2]} ${m[1]}, ${m[3]}`) },
    // "March 29, 2026"
    { regex: /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/, parser: (m: string[]) => new Date(`${m[1]} ${m[2]}, ${m[3]}`) },
    // ISO format "2026-03-29"
    { regex: /(\d{4})-(\d{2})-(\d{2})/, parser: (m: string[]) => new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`) },
  ];
  
  for (const fmt of dateFormats) {
    const match = s.match(fmt.regex);
    if (match) {
      try {
        const d = fmt.parser(match);
        if (Number.isFinite(d.getTime())) return d.toISOString();
      } catch {
        // Continue to next format
      }
    }
  }
  
  // Fallback to native Date parsing
  const d = new Date(s);
  if (Number.isFinite(d.getTime())) {
    // If the parsed date is in the future, it's likely missing a year and defaulted to current year
    // In that case, assume it's from last year (e.g., "Jan 2" in April 2026 should be Jan 2, 2025)
    const now = new Date();
    if (d > now) {
      d.setFullYear(d.getFullYear() - 1);
    }
    return d.toISOString();
  }
  
  return null;
}

function matchOne(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);
  return match?.[1] ?? null;
}

function collectMatches(input: string, pattern: RegExp): string[] {
  return Array.from(input.matchAll(pattern), (match) => match[1]).filter(Boolean);
}

function blockSplit(input: string, pattern: RegExp): string[] {
  return Array.from(input.matchAll(pattern), (match) => match[0]);
}

function isValidReviewCandidate(text: string): boolean {
  if (!text) return false;
  if (INVALID_REVIEW_TEXT_RE.some((pattern) => pattern.test(text))) return false;
  return text.length >= 5;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVaultSecret(client: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const envValue = Deno.env.get(name);
  if (envValue?.trim()) return envValue.trim();
  const { data } = await client
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", name)
    .limit(1)
    .maybeSingle();
  return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
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
  if (!roles.some((role) => MANUAL_ALLOWED_ROLES.has(role))) return null;
  return { userId: authData.user.id, roles };
}

function extractFidFromGoogleUrl(url: string): string | null {
  try {
    const match = decodeURIComponent(url).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function extractGoogleSearchQuery(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("query") ?? parsed.searchParams.get("q");
  } catch {
    return null;
  }
}

function placeNameScore(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((word) =>
    word.length > 2 && !["the", "and", "for", "by", "hotel", "hotels"].includes(word)
  );
  if (words.length === 0) return 0;
  return words.filter((word) => titleLower.includes(word)).length / words.length;
}

function extractReviewerName(value: unknown): string | null {
  if (typeof value === "string") return toNullableString(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return toNullableString(record.name ?? record.displayName ?? record.title);
  }
  return null;
}

async function findGoogleCidBySearch(query: string, serperKey: string): Promise<string | null> {
  const hotelQuery = /hotel|resort|inn|suites/i.test(query) ? query : `${query} hotel`;
  const placesRes = await fetch("https://google.serper.dev/places", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: hotelQuery, gl: "sa", hl: "en" }),
  });

  if (placesRes.ok) {
    const data = await placesRes.json() as Record<string, unknown>;
    const places = (data.places as Array<Record<string, unknown>> ?? []);

    for (const place of places) {
      const category = String(place.category ?? place.type ?? "").toLowerCase();
      if (GOOGLE_PLACE_LODGING_RE.test(category) && place.cid) return `cid:${place.cid}`;
    }

    let bestCid: string | null = null;
    let bestScore = 0;
    for (const place of places) {
      const category = String(place.category ?? place.type ?? "").toLowerCase();
      if (GOOGLE_PLACE_EXCLUDE_RE.test(category)) continue;
      const score = placeNameScore(String(place.title ?? place.name ?? ""), query);
      if (score > bestScore && place.cid) {
        bestScore = score;
        bestCid = String(place.cid);
      }
    }
    if (bestCid && bestScore >= 0.5) return `cid:${bestCid}`;
  }

  const searchRes = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: `${hotelQuery} google maps reviews`, gl: "sa", hl: "en", num: 5 }),
  });
  if (!searchRes.ok) return null;
  const data = await searchRes.json() as Record<string, unknown>;
  for (const result of (data.organic as Array<Record<string, unknown>> ?? [])) {
    const link = String(result.link ?? "");
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

function mapSerperReviews(reviews: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return reviews
    .map((review) => ({
      review_text: sanitizeReviewText(review.snippet ?? review.text ?? review.body ?? ""),
      reviewer_name: extractReviewerName(review.name) ?? extractReviewerName(review.user),
      rating: review.rating ?? null,
      published_at: parseDate(review.isoDate) ?? parseDate(review.iso_date) ?? parseDate(review.date),
      review_title: review.title ?? null,
      source_review_id: review.reviewId ?? review.review_id ?? review.id ?? null,
      review_url: review.link ?? null,
      review_language: review.language ?? "en",
      metadata: review,
    }))
    .filter((review) => isValidReviewCandidate(String(review.review_text ?? "")));
}

async function fetchSerperReviews(
  source: Record<string, unknown>,
  serperKey: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Array<Record<string, unknown>>> {
  const sourceUrl = String(source.source_url ?? "");
  const schema = (source.firecrawl_extract_schema ?? {}) as Record<string, unknown>;
  const sourceName = String(source.source_name ?? "");

  if (schema.cid || schema.fid || schema.place_id) {
    const body: Record<string, unknown> = { gl: "sa", hl: "en" };
    if (schema.cid) body.cid = String(schema.cid);
    else if (schema.fid) body.fid = String(schema.fid);
    else body.placeId = String(schema.place_id);
    const reviews = await callSerperReviews(body, serperKey);
    if (reviews.length > 0) return mapSerperReviews(reviews);
  }

  const urlFid = extractFidFromGoogleUrl(sourceUrl);
  if (urlFid) {
    const reviews = await callSerperReviews({ fid: urlFid, gl: "sa", hl: "en" }, serperKey);
    if (reviews.length > 0) return mapSerperReviews(reviews);
  }

  const searchQuery =
    (typeof schema.search_query === "string" && schema.search_query.trim()) ||
    extractGoogleSearchQuery(sourceUrl) ||
    sourceName.replace(/^Google[^-]*-\s*/i, "").trim();

  if (!searchQuery) throw new Error("Cannot resolve Google Place identifier");

  const resolvedId = await findGoogleCidBySearch(searchQuery, serperKey);
  if (!resolvedId) throw new Error(`Could not find Google Place via search: ${searchQuery}`);

  const body: Record<string, unknown> = { gl: "sa", hl: "en" };
  if (resolvedId.startsWith("cid:")) {
    const cid = resolvedId.slice(4);
    body.cid = cid;
    await serviceClient
      .from("guest_review_sources")
      .update({ firecrawl_extract_schema: { ...schema, cid } })
      .eq("id", source.id);
  } else {
    body.fid = resolvedId;
    await serviceClient
      .from("guest_review_sources")
      .update({ firecrawl_extract_schema: { ...schema, fid: resolvedId } })
      .eq("id", source.id);
  }

  const reviews = await callSerperReviews(body, serperKey);
  if (reviews.length === 0) throw new Error(`Serper returned 0 reviews for: ${searchQuery}`);
  return mapSerperReviews(reviews);
}

function reviewsUrl(url: string, platform: string, sinceDate?: string): string {
  if (platform === "booking") {
    const match = url.match(/booking\.com\/hotel\/([^/]+)\/([^./]+)(?:\.[a-z-]+)?\.html/i);
    if (match) {
      const country = match[1];
      const slug = match[2];
      // Only fetch 10 most recent reviews, sorted by date
      let reviewUrl = `https://www.booking.com/reviewlist.html?pagename=${slug}&cc1=${country}&type=total&order=review_date_and_time&rows=10`;
      // Add date filter if provided (for incremental collection)
      if (sinceDate) {
        reviewUrl += `&checkin=${sinceDate}`;
      }
      return reviewUrl;
    }
  }
  return url;
}

async function fetchWithScraperApi(url: string, apiKey: string, platform: string, sinceDate?: string): Promise<string> {
  const targetUrl = reviewsUrl(url, platform, sinceDate);
  const params = new URLSearchParams({ api_key: apiKey, url: targetUrl, country_code: "us" });
  if (SCRAPER_RENDER_PLATFORMS.has(platform)) {
    params.set("render", "true");
    params.set("wait_for_selector", platform === "agoda" ? ".Review-comment" : "body");
    params.set("wait", "5000");
  }

  const res = await fetch(`https://api.scraperapi.com/?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScraperAPI HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return await res.text();
}

function parseBookingReviews(html: string): Array<Record<string, unknown>> {
  const blocks = blockSplit(
    html,
    /<li class="review_list_new_item_block"[\s\S]*?(?=<li class="review_list_new_item_block"|$)/g,
  );

  return blocks.map((block) => {
    const reviewBodies = collectMatches(block, /<span class="c-review__body"[^>]*>([\s\S]*?)<\/span>/g)
      .map((text) => sanitizeReviewText(text))
      .filter(Boolean);

    const ratingText = matchOne(block, /<div class="bui-review-score__badge"[^>]*>\s*([0-9.]+)\s*<\/div>/i)
      ?? matchOne(block, /aria-label="Scored ([0-9.]+)/i);

    const language = matchOne(block, /<span class="c-review__body"[^>]*lang="([^"]+)"/i);

    return {
      source_review_id: toNullableString(matchOne(block, /data-review-url="([^"]+)"/i)),
      reviewer_name: toNullableString(matchOne(block, /<span class="bui-avatar-block__title">([\s\S]*?)<\/span>/i)),
      rating: ratingText ? Number(ratingText) : null,
      // Try multiple date patterns for Booking
      published_at: parseDate(matchOne(block, /Reviewed:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i))
        ?? parseDate(matchOne(block, /Reviewed:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i))
        ?? parseDate(matchOne(block, /Reviewed:\s*(\d{4}-\d{2}-\d{2})/i))
        ?? parseDate(matchOne(block, /data-date="(\d{4}-\d{2}-\d{2})"/i))
        ?? parseDate(matchOne(block, /<span[^>]*class="c-review-block__date"[^>]*>\s*([A-Za-z]+\s+\d{4})\s*<\/span>/i))
        ?? parseDate(matchOne(block, /Reviewed:\s*([^<\n]+)/i)),
      review_title: toNullableString(matchOne(block, /<h3[^>]*class="[^"]*c-review-block__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)),
      review_text: reviewBodies.join("\n").trim(),
      review_url: toNullableString(matchOne(block, /data-review-url="([^"]+)"/i)),
      review_language: language ? language.slice(0, 2).toLowerCase() : null,
      metadata: {
        room_type: toNullableString(matchOne(block, /<div class="bui-list__body">\s*([\s\S]*?)\s*<\/div>\s*<\/a>/i)),
        traveler_type: toNullableString(
          matchOne(block, /review-panel-wide__traveller_type[\s\S]*?<div class="bui-list__body">\s*([\s\S]*?)\s*<\/div>/i),
        ),
        stay_date: toNullableString(matchOne(block, /<span class="c-review-block__date">\s*([^<]+)\s*<\/span>/i)),
      },
    };
  }).filter((review) => isValidReviewCandidate(String(review.review_text ?? "")));
}

function parseAgodaReviews(html: string): Array<Record<string, unknown>> {
  const blocks = blockSplit(
    html,
    /<div data-element-name="review-comment"[\s\S]*?(?=<div data-element-name="review-comment"|<\/ol>)/g,
  );

  return blocks.map((block) => ({
    source_review_id: toNullableString(matchOne(block, /data-review-id="([^"]+)"/i)),
    reviewer_name: toNullableString(
      matchOne(block, /data-info-type="reviewer-name"[\s\S]*?<strong>([\s\S]*?)<\/strong>/i),
    ),
    rating: Number(matchOne(block, /<div class="Review-comment-leftScore">([0-9.]+)<\/div>/i) ?? ""),
    // Try multiple date patterns for Agoda
    published_at: parseDate(matchOne(block, /Reviewed\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i))
      ?? parseDate(matchOne(block, /Reviewed\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i))
      ?? parseDate(matchOne(block, /Reviewed\s+(\d{4}-\d{2}-\d{2})/i))
      ?? parseDate(matchOne(block, /data-selenium="review-date"[^>]*>([^<]+)/i))
      ?? parseDate(matchOne(block, /Reviewed\s+([^<]+)<\/span>/i)),
    review_title: toNullableString(matchOne(block, /data-testid="review-title">([\s\S]*?)<\/h4>/i)),
    review_text: sanitizeReviewText(matchOne(block, /data-testid="review-comment">([\s\S]*?)<\/p>/i)),
    review_url: toNullableString(matchOne(block, /data-review-id="([^"]+)"/i)),
    review_language: null,
    metadata: {
      reviewer_country: toNullableString(
        matchOne(block, /data-info-type="reviewer-name"[\s\S]*?<span>\s*from\s*<\/span><span>([\s\S]*?)<\/span>/i),
      ),
      traveler_type: toNullableString(matchOne(block, /data-info-type="group-name"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
      room_type: toNullableString(matchOne(block, /data-info-type="room-type"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
      stay_detail: toNullableString(matchOne(block, /data-info-type="stay-detail"[\s\S]*?<span>([\s\S]*?)<\/span>/i)),
    },
  })).filter((review) => isValidReviewCandidate(String(review.review_text ?? "")));
}

async function collectPlatformReviews(
  source: Record<string, unknown>,
  serperKey: string | null,
  scraperKey: string | null,
  serviceClient: ReturnType<typeof createClient>,
): Promise<{ method: string; reviews: Array<Record<string, unknown>> }> {
  const platform = String(source.platform ?? "");
  
  // Calculate since date for incremental collection (last 7 days or since last success)
  let sinceDate: string | undefined;
  if (source.last_success_at) {
    const lastSuccess = new Date(String(source.last_success_at));
    sinceDate = lastSuccess.toISOString().slice(0, 10);
  } else {
    // Default to 7 days ago for initial collection
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sinceDate = weekAgo.toISOString().slice(0, 10);
  }

  if (platform === "google") {
    if (!serperKey) throw new Error("SERPER_API_KEY not configured for Google source");
    return {
      method: "serper",
      reviews: await fetchSerperReviews(source, serperKey, serviceClient),
    };
  }

  if (platform === "booking") {
    if (!scraperKey) throw new Error("SCRAPER_API_KEY not configured for Booking source");
    const html = await fetchWithScraperApi(String(source.source_url ?? ""), scraperKey, platform, sinceDate);
    return { method: "scraperapi+booking-html", reviews: parseBookingReviews(html) };
  }

  if (platform === "agoda") {
    if (!scraperKey) throw new Error("SCRAPER_API_KEY not configured for Agoda source");
    const html = await fetchWithScraperApi(String(source.source_url ?? ""), scraperKey, platform, sinceDate);
    return { method: "scraperapi+agoda-html", reviews: parseAgodaReviews(html) };
  }

  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error(`Unsupported platform on current reliable collector: ${platform}`);
  }

  throw new Error(`Unhandled platform: ${platform}`);
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
    const defaultYesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const targetDate = typeof body.target_date === "string" ? body.target_date : defaultYesterday;
    const batchOffset = typeof body.batch_offset === "number" ? Number(body.batch_offset) : 0;
    const maxSources = typeof body.max_sources === "number" ? Number(body.max_sources) : MAX_SOURCES_PER_RUN;

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
      const ctx = await getManualContext(supabaseUrl, anonKey, authHeader, serviceClient);
      if (!ctx) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const serperKey = await getVaultSecret(serviceClient, "SERPER_API_KEY");
    const scraperKey = await getVaultSecret(serviceClient, "SCRAPER_API_KEY");

    const now = new Date();
    const { data: allSources, error: sourceErr } = await serviceClient
      .from("guest_review_sources")
      .select("*")
      .eq("is_active", true)
      .eq("polling_enabled", true)
      .order("updated_at", { ascending: true });
    if (sourceErr) throw sourceErr;

    const allDue = (allSources ?? []).filter((source) => {
      if (sourceId && String(source.id) !== sourceId) return false;
      if (!source.next_poll_at) return true;
      return new Date(String(source.next_poll_at)).getTime() <= now.getTime();
    });

    const dueSources = allDue.slice(batchOffset, batchOffset + maxSources);
    const hasMore = batchOffset + maxSources < allDue.length;
    const results: Array<Record<string, unknown>> = [];

    for (const source of dueSources) {
      const { data: runRow, error: runErr } = await serviceClient
        .from("guest_review_collection_runs")
        .insert({ source_id: source.id, run_mode: runMode, status: "running" })
        .select("id")
        .single();
      if (runErr) throw runErr;

      let reviewsCollected = 0;
      let reviewsNew = 0;
      let reviewsUpdated = 0;
      let collectionMethod = "unknown";

      try {
        const { method, reviews } = await collectPlatformReviews(source, serperKey, scraperKey, serviceClient);
        collectionMethod = method;
        reviewsCollected = reviews.length;

        if (reviewsCollected === 0) {
          throw new Error("No reviews returned from collection step");
        }

        for (const row of reviews) {
          const reviewText = sanitizeReviewText(row.review_text ?? row.text ?? row.content ?? row.comment);
          if (!isValidReviewCandidate(reviewText)) continue;

          const sourceReviewId = toNullableString(row.source_review_id ?? row.review_id ?? row.id);
          const reviewerName = toNullableString(row.reviewer_name ?? row.reviewer ?? row.author);
          
          // Parse the review date
          let publishedAt = parseDate(row.published_at ?? row.date ?? row.created_at);
          
          // FIXED: Skip reviews from before 2026 - only collect current year reviews
          if (publishedAt) {
            const reviewDate = new Date(publishedAt);
            const reviewYear = reviewDate.getFullYear();
            if (reviewYear < 2026) {
              console.log(`[guest-review-collector] Skipping old review from ${reviewYear}: ${reviewerName || 'Unknown'}`);
              continue; // Skip this review - too old
            }
          }
          
          // FIXED: Ensure published_at is always set with proper fallback chain
          if (!publishedAt) {
            publishedAt = new Date().toISOString();
            console.warn(`[guest-review-collector] Date parsing failed for review, using current timestamp as fallback. Source: ${source.source_name}`);
          }
          
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
            review_language: toNullableString(row.review_language ?? row.language) ?? "en",
            original_rating: rating.r5,
            rating_normalized_5: rating.r5,
            rating_normalized_10: rating.r10,
            published_at: publishedAt,
            dedupe_hash: dedupeHash,
            status: "collected",
            ai_analysis_status: "pending",
            metadata: row.metadata ?? row,
            collected_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp,
          };

          let reviewId: string;
          let changed = true;

          if (existingId) {
            const { data: old } = await serviceClient
              .from("guest_reviews")
              .select("review_text")
              .eq("id", existingId)
              .maybeSingle();
            changed = cleanText(old?.review_text) !== reviewText;
            const { created_at: _createdAt, ...updatePayload } = reviewPayload;
            const { error: updateErr } = await serviceClient
              .from("guest_reviews")
              .update(updatePayload)
              .eq("id", existingId);
            if (updateErr) {
              console.error("UPDATE error:", updateErr.message, updateErr.code);
              continue;
            }
            reviewId = existingId;
            if (changed) reviewsUpdated += 1;
          } else {
            const { data, error: insertErr } = await serviceClient
              .from("guest_reviews")
              .insert(reviewPayload)
              .select("id")
              .single();
            if (insertErr || !data?.id) {
              console.error("INSERT error:", insertErr?.message, insertErr?.code);
              continue;
            }
            reviewId = String(data.id);
            reviewsNew += 1;
          }

          await serviceClient.from("guest_review_raw_snapshots").insert({
            review_id: reviewId,
            source_id: source.id,
            source_url: source.source_url,
            firecrawl_method: collectionMethod,
            request_payload: {
              url: source.source_url,
              platform: source.platform,
              method: collectionMethod,
              target_date: targetDate,
            },
            response_payload: row,
            extraction_metadata: { source_name: source.source_name, platform: source.platform },
            checksum: await sha256(JSON.stringify(row)),
          }).then(({ error }) => {
            if (error) console.error("snapshot insert error:", error.message);
          });

          if (changed && !dryRun) {
            fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
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
          result_summary: {
            source_name: source.source_name,
            platform: source.platform,
            method: collectionMethod,
            target_date: targetDate,
            dry_run: dryRun,
          },
        }).eq("id", runRow.id);

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "completed",
          method: collectionMethod,
          reviews_collected: reviewsCollected,
          reviews_new: reviewsNew,
          reviews_updated: reviewsUpdated,
        });

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
          event_payload: {
            source_id: source.id,
            source_name: source.source_name,
            error: message,
            consecutive_failures: failures,
          },
        });

        results.push({
          source_id: source.id,
          source_name: source.source_name,
          status: "failed",
          error: message,
        });
      }
    }

    const succeeded = results.filter((result) => result.status === "completed").length;
    const failed = results.filter((result) => result.status === "failed").length;
    const totalNew = results.reduce((sum, result) => sum + Number(result.reviews_new ?? 0), 0);

    return new Response(JSON.stringify({
      success: true,
      processed_sources: dueSources.length,
      total_due: allDue.length,
      batch_offset: batchOffset,
      has_more: hasMore,
      next_batch_offset: hasMore ? batchOffset + maxSources : null,
      succeeded,
      failed,
      total_new_reviews: totalNew,
      target_date: targetDate,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("guest-review-collector fatal:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
