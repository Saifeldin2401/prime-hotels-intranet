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
  const timeoutMs = 120000; // Extended timeout to 2 minutes
  const intervalMs = 10000; // Increased polling interval to 10 seconds to avoid Firecrawl's 20 req/min limit

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

async function getFirecrawlApiKeys(client: ReturnType<typeof createClient>): Promise<string[]> {
  const keys: string[] = [];

  // 1. Env var first
  const envKey = Deno.env.get("FIRECRAWL_API_KEY") ?? Deno.env.get("firecrawl_api_key");
  if (envKey && envKey.trim()) keys.push(envKey.trim());

  // 2. Vault keys - search for all variations including backups
  const { data: vaultKeys } = await client
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .or("name.ilike.FIRECRAWL_API_KEY%,name.ilike.firecrawl_api_key%")
    .order("created_at", { ascending: false });

  if (vaultKeys) {
    for (const vk of vaultKeys) {
      if (typeof vk.decrypted_secret === "string" && vk.decrypted_secret.trim()) {
        const key = vk.decrypted_secret.trim();
        if (!keys.includes(key)) keys.push(key);
      }
    }
  }
  return keys;
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

async function fetchSerperReviews(
  apiKey: string,
  source: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const schema = source.firecrawl_extract_schema as Record<string, unknown> | null;
  
  // Try CID from schema first
  let cid = schema?.cid as string | undefined;
  
  // If no CID, try to extract from URL
  if (!cid && source.source_url) {
    const urlMatch = String(source.source_url).match(/cid=([^&]+)/);
    if (urlMatch) cid = urlMatch[1];
  }
  
  // If still no CID, use search
  let placeId: string | null = null;
  if (!cid && schema?.search_query) {
    const searchRes = await fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: schema.search_query,
        gl: "sa",
        hl: "en",
      }),
    });
    
    if (!searchRes.ok) {
      throw new Error(`Serper places search failed: ${searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    const places = searchData.places as Array<Record<string, unknown>> | undefined;
    
    if (places && places.length > 0) {
      // Find the best match (hotel, not mall)
      const hotelMatch = places.find((p) => {
        const name = String(p.title || "").toLowerCase();
        return name.includes("hotel") && name.includes("hamra");
      });
      
      const bestMatch = hotelMatch || places[0];
      placeId = bestMatch.placeId as string | undefined || null;
      cid = bestMatch.cid as string | undefined || cid;
    }
  }
  
  // Fetch reviews using Serper
  const reviewsRes = await fetch("https://google.serper.dev/reviews", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      placeId: placeId,
      cid: cid,
      gl: "sa",
      hl: "en",
    }),
  });
  
  if (!reviewsRes.ok) {
    throw new Error(`Serper reviews fetch failed: ${reviewsRes.status}`);
  }
  
  const reviewsData = await reviewsRes.json();
  const reviews = reviewsData.reviews as Array<Record<string, unknown>> | undefined;
  
  if (!reviews || !Array.isArray(reviews)) {
    return [];
  }
  
  return reviews.map((r) => ({
    review_text: r.snippet || r.text,
    reviewer_name: r.user?.name || r.reviewerName,
    rating: r.rating,
    published_at: r.date,
    source_review_id: r.reviewId || r.id,
  }));
}

async function fetchWithScraperAPI(
  apiKey: string,
  url: string,
): Promise<string> {
  try {
    // Validate inputs
    if (!apiKey || !url) {
      throw new Error("Missing apiKey or url");
    }
    
    // Try with ultra_premium first for protected domains like Booking.com
    const ultraPremiumUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&ultra_premium=true`;
    
    let ultraResponse: Response | null = null;
    try {
      ultraResponse = await fetch(ultraPremiumUrl, {
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch (e) {
      console.log("Ultra premium fetch failed:", e);
    }
    
    if (ultraResponse && ultraResponse.ok) {
      return await ultraResponse.text();
    }
    
    // Fallback to premium
    const premiumUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&premium=true`;
    let premiumResponse: Response | null = null;
    try {
      premiumResponse = await fetch(premiumUrl, {
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch (e) {
      console.log("Premium fetch failed:", e);
    }
    
    if (premiumResponse && premiumResponse.ok) {
      return await premiumResponse.text();
    }
    
    // Last resort - try basic
    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
    let response: Response | null = null;
    try {
      response = await fetch(scraperUrl, {
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch (e) {
      console.log("Basic fetch failed:", e);
    }
    
    if (response && response.ok) {
      return await response.text();
    }
    
    const statuses = `ultra_premium=${ultraResponse?.status || 'failed'}, premium=${premiumResponse?.status || 'failed'}, basic=${response?.status || 'failed'}`;
    throw new Error(`ScraperAPI failed all attempts: ${statuses}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`ScraperAPI error: ${errMsg}`);
  }
}

// ... (rest of the code remains the same)
async function getScraperApiKey(client: ReturnType<typeof createClient>): Promise<string | null> {
  // Check env first
  const envKey = Deno.env.get("SCRAPER_API_KEY") ?? Deno.env.get("scraper_api_key");
  if (envKey && envKey.trim()) return envKey.trim();
  
  // Check vault
  const { data } = await client
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", "SCRAPER_API_KEY")
    .maybeSingle();
  
  return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
}

async function fetchWithDirectHttp(url: string, scraperApiKey: string | null): Promise<Array<Record<string, unknown>>> {
  if (scraperApiKey) {
    const html = await fetchWithScraperAPI(scraperApiKey, url);
    // Return raw HTML for now - parsing would require cheerio which isn't available in edge functions
    return [{ review_text: "ScraperAPI fetch - HTML length: " + html.length }];
  } else {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Return raw HTML for now - parsing would require cheerio which isn't available in edge functions
    return [{ review_text: "Direct fetch - HTML length: " + html.length }];
  }
}

async function getSerperApiKey(client: ReturnType<typeof createClient>): Promise<string | null> {
  // Check env first
  const envKey = Deno.env.get("SERPER_API_KEY") ?? Deno.env.get("serper_api_key");
  if (envKey && envKey.trim()) return envKey.trim();
  
  // Check vault
  const { data } = await client
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", "SERPER_API_KEY")
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
    const envServiceRoleKey = await getVaultSecret(serviceClient, "SERVICE_ROLE_KEY");
    const isServiceRole = timingSafeBearerMatch(authHeader, serviceRoleKey);
    const isVaultServiceRole = vaultServiceRoleKey ? timingSafeBearerMatch(authHeader, vaultServiceRoleKey) : false;
    const isEnvServiceRole = envServiceRoleKey ? timingSafeBearerMatch(authHeader, envServiceRoleKey) : false;
    const isInternalService = isServiceRole || isVaultServiceRole || isEnvServiceRole;

    if (!isInternalService) {
      const ctx = await getManualContext(supabaseUrl, anonKey, authHeader, serviceClient);
      if (!ctx) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const serperApiKey = await getSerperApiKey(serviceClient);
    const scraperApiKey = await getScraperApiKey(serviceClient);
    if (!serperApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Vault secret SERPER_API_KEY missing" }), {
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
    let isFirstSource = true;
    for (const source of dueSources) {
      if (!isFirstSource) {
        // Stagger requests by 15 seconds to avoid sudden spikes in rate limit
        await sleep(15000);
      }
      isFirstSource = false;

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
        let candidates: Array<Record<string, unknown>> = [];
        
        // Use Serper for Google sources
        if (source.platform === "google" && serperApiKey) {
          candidates = await fetchSerperReviews(serperApiKey, source);
        } else {
          // Use ScraperAPI for other platforms
          candidates = await fetchWithDirectHttp(String(source.source_url), scraperApiKey);
        }
        
        reviewsCollected = candidates.length;
        if (candidates.length === 0) throw new Error("No review rows returned");

        for (const row of candidates) {
          try {
            const reviewText = cleanText(row.review_text ?? row.text ?? row.content ?? row.comment);
            if (!reviewText || reviewText.length < 5) {
              console.log("Skipping empty/short review");
              continue;
            }

            const sourceReviewId = toNullableString(row.source_review_id ?? row.review_id ?? row.id);
            const reviewerName = toNullableString(row.reviewer_name ?? row.reviewer ?? row.author);
            const publishedAt = toNullableString(row.published_at ?? row.date ?? row.created_at);
            const rating = normalizeRating(row.rating ?? row.score ?? row.stars);
            
            // Validate required fields
            if (!source.property_id) {
              console.error("Missing property_id for source:", source.id);
              continue;
            }
            
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
              review_language: toNullableString(row.review_language ?? row.language) ?? 'en',
              original_rating: rating.r5,
              rating_normalized_5: rating.r5,
              rating_normalized_10: rating.r10,
              published_at: publishedAt,
              dedupe_hash: dedupeHash,
              status: "collected",
              ai_analysis_status: "pending",
              metadata: row,
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            let reviewId: string;
            let changed = true;
            
            if (existingId) {
              console.log("Updating existing review:", existingId);
              const { data: old } = await serviceClient.from("guest_reviews").select("review_text").eq("id", existingId).maybeSingle();
              changed = cleanText(old?.review_text) !== reviewText;
              const { error: updateError } = await serviceClient.from("guest_reviews").update(reviewPayload).eq("id", existingId);
              if (updateError) {
                console.error("Failed to update review:", updateError);
                continue;
              }
              reviewId = existingId;
              if (changed) reviewsUpdated += 1;
            } else {
              console.log("Inserting new review for property:", source.property_id);
              console.log("Review payload:", JSON.stringify(reviewPayload, null, 2));
              const insertResult = await serviceClient.from("guest_reviews").insert(reviewPayload).select();
              if (insertResult.error) {
                console.error("Failed to insert review:", insertResult.error);
                throw new Error(`Insert failed: ${insertResult.error.message}`);
              }
              if (!insertResult.data || insertResult.data.length === 0) {
                console.error("No data returned from insert");
                throw new Error("Insert returned no data");
              }
              reviewId = String(insertResult.data[0].id);
              reviewsNew += 1;
              console.log("Successfully inserted review:", reviewId);
            }

            // Insert raw snapshot
            const { error: snapshotError } = await serviceClient.from("guest_review_raw_snapshots").insert({
              review_id: reviewId,
              source_id: source.id,
              source_url: source.source_url,
              firecrawl_method: source.platform === "google" ? "serper" : "direct",
              request_payload: {},
              response_payload: row,
              extraction_metadata: { source_name: source.source_name, platform: source.platform },
              checksum: await sha256(JSON.stringify(row)),
            });
            
            if (snapshotError) {
              console.error("Failed to insert snapshot:", snapshotError);
            }

            if (changed && !dryRun) {
              console.log("Triggering analyzer for review:", reviewId);
              await fetch(`${supabaseUrl}/functions/v1/guest-review-analyzer`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceRoleKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ review_id: reviewId, force: true }),
              }).catch((e) => console.error("Analyzer call failed:", e));
            }
          } catch (rowError) {
            console.error("Error processing review row:", rowError);
            continue;
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
