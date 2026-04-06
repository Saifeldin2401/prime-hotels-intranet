import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import {
  buildReviewWindow,
  filterReviewsInWindow,
  getReviewEventDate,
  getReviewEventTimestamp,
} from "../_shared/review-dates.ts";

// CORS headers helper
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

// Timing-safe comparison for auth
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

// Trend indicator with arrow
function getTrendIndicator(
  current: number,
  previous?: number,
): { arrow: string; text: string; class: string } {
  if (previous == null || previous === 0)
    return { arrow: "→", text: "Stable", class: "stable" };
  const diff = current - previous;
  if (diff >= 0.5) return { arrow: "↑", text: "Improving", class: "improving" };
  if (diff <= -0.5)
    return { arrow: "↓", text: "Declining", class: "declining" };
  return { arrow: "→", text: "Stable", class: "stable" };
}

// Generate AI recommendations based on hotel data
function generateRecommendations(
  hotel: HotelMetrics,
): Array<{
  priority: string;
  action: string;
  rationale: string;
  dept: string;
}> {
  const recs: Array<{
    priority: string;
    action: string;
    rationale: string;
    dept: string;
  }> = [];

  // Critical alerts = HIGH priority
  if (hotel.criticalCount > 0) {
    recs.push({
      priority: "HIGH",
      action: `Address ${hotel.criticalCount} critical review(s) immediately`,
      rationale:
        "Guest satisfaction scores below 5/10 require immediate attention to prevent reputation damage",
      dept: "Operations",
    });
  }

  // Negative trends
  if (hotel.negativeRate > 20) {
    recs.push({
      priority: "HIGH",
      action: "Review service standards and staff training",
      rationale: `High negative rate (${hotel.negativeRate}%) indicates systemic service issues`,
      dept: "HR/Training",
    });
  }

  // Low rating
  if (hotel.avgRating < 7) {
    recs.push({
      priority: "MEDIUM",
      action: "Implement guest satisfaction recovery protocol",
      rationale: `Average rating ${hotel.avgRating}/10 is below target of 8/10`,
      dept: "Guest Relations",
    });
  }

  // Platform gaps
  const lowPlatforms = Object.entries(hotel.platformRatings).filter(
    ([_, r]) => r < 7,
  );
  if (lowPlatforms.length > 0) {
    recs.push({
      priority: "MEDIUM",
      action: `Focus on ${lowPlatforms.map(([p, _]) => p).join(", ")} platform improvements`,
      rationale: "Platform-specific issues affecting visibility and bookings",
      dept: "Marketing/Revenue",
    });
  }

  // Positive momentum
  if (hotel.positiveTrends.length > 0) {
    recs.push({
      priority: "LOW",
      action: "Leverage positive feedback in marketing",
      rationale: `Strong guest praise: ${hotel.positiveTrends.slice(0, 2).join("; ")}`,
      dept: "Marketing",
    });
  }

  // Default if empty
  if (recs.length === 0) {
    recs.push({
      priority: "LOW",
      action: "Continue monitoring guest feedback trends",
      rationale: "Performance stable, maintain current standards",
      dept: "Operations",
    });
  }

  return recs;
}

// Extract themes from reviews
function extractThemes(reviews: any[]): {
  positive: string[];
  negative: string[];
} {
  const positive: string[] = [];
  const negative: string[] = [];

  const positiveKeywords = [
    "excellent",
    "great",
    "amazing",
    "perfect",
    "wonderful",
    "friendly",
    "clean",
    "comfortable",
    "helpful",
    "professional",
    "outstanding",
    "best",
    "love",
    "recommend",
  ];
  const negativeKeywords = [
    "poor",
    "bad",
    "terrible",
    "awful",
    "dirty",
    "rude",
    "unprofessional",
    "disappointing",
    "worst",
    "noise",
    "slow",
    "broken",
    "issue",
    "problem",
    "complaint",
  ];

  for (const r of reviews) {
    const text = (r.review_text || r.summary_en || "").toLowerCase();

    for (const kw of positiveKeywords) {
      if (text.includes(kw) && !positive.some((p) => text.includes(p))) {
        positive.push(kw);
      }
    }

    for (const kw of negativeKeywords) {
      if (text.includes(kw) && !negative.some((n) => text.includes(n))) {
        negative.push(kw);
      }
    }
  }

  return {
    positive: positive.slice(0, 5),
    negative: negative.slice(0, 5),
  };
}

interface HotelMetrics {
  propertyId: string;
  name: string;
  city: string;
  count: number;
  avgRating: number;
  previousAvgRating?: number;
  negativeCount: number;
  negativeRate: number;
  criticalCount: number;
  platformBreakdown: Record<string, { count: number; avg: number }>;
  platformRatings: Record<string, number>;
  reviews: any[];
  positiveTrends: string[];
  negativeTrends: string[];
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth check
    const { data: vaultServiceSecret } = await supabase
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .filter("name", "eq", "service_role_key")
      .limit(1)
      .maybeSingle();

    const isInternal =
      timingSafeBearerMatch(authHeader, serviceRoleKey) ||
      isServiceRoleJwt(authHeader) ||
      (typeof vaultServiceSecret?.decrypted_secret === "string" &&
        timingSafeBearerMatch(
          authHeader,
          vaultServiceSecret.decrypted_secret,
        )) ||
      (authHeader &&
        serviceRoleKey &&
        authHeader.includes(serviceRoleKey.substring(0, 10)));

    if (!isInternal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body =
      req.method === "POST"
        ? await req.json().catch(() => ({}) as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const reportDate =
      typeof body.report_date === "string" ? body.report_date : undefined;
    const specificHotelId =
      typeof body.hotel_id === "string" ? body.hotel_id : undefined;

    const window = buildReviewWindow(reportDate);
    const { start, end } = window;
    const reportDateValue = reportDate || end.toISOString().slice(0, 10);
    const generatedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Cairo",
    });

    // Get all active properties or specific hotel
    let propertyQuery = supabase
      .from("properties")
      .select("id,name,city,country")
      .eq("is_active", true);
    if (specificHotelId) {
      propertyQuery = propertyQuery.eq("id", specificHotelId);
    }
    const { data: properties } = await propertyQuery;

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No hotels found." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch reviews for all hotels
    const propertyIds = properties.map((p) => p.id);
    const { data: reviews } = await supabase
      .from("guest_reviews")
      .select(
        "id,property_id,platform,sentiment,rating_normalized_10,summary_en,review_text,review_title,reviewer_name,reviewer_location,critical_flag,created_at,collected_at,published_at",
      )
      .in("property_id", propertyIds)
      .or(
        `published_at.gte.${start.toISOString()},and(published_at.is.null,collected_at.gte.${start.toISOString()}),and(published_at.is.null,collected_at.is.null,created_at.gte.${start.toISOString()})`,
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("collected_at", { ascending: false })
      .order("created_at", { ascending: false });
    const currentReviews = filterReviewsInWindow(reviews ?? [], window).sort(
      (a, b) => getReviewEventTimestamp(b) - getReviewEventTimestamp(a),
    );

    // Fetch previous period for trend comparison (7 days prior)
    const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWindow = { start: prevStart, end: prevEnd };
    const { data: prevReviews } = await supabase
      .from("guest_reviews")
      .select(
        "property_id,rating_normalized_10,published_at,collected_at,created_at",
      )
      .in("property_id", propertyIds)
      .or(
        `published_at.gte.${prevStart.toISOString()},and(published_at.is.null,collected_at.gte.${prevStart.toISOString()}),and(published_at.is.null,collected_at.is.null,created_at.gte.${prevStart.toISOString()})`,
      );
    const previousReviews = filterReviewsInWindow(
      prevReviews ?? [],
      previousWindow,
    );

    // Get Resend API key
    const { data: resendKeyData } = await supabase
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "RESEND_API_KEY")
      .limit(1)
      .maybeSingle();
    const resendApiKey =
      resendKeyData?.decrypted_secret || Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not found");
    }

    // Calculate metrics per hotel
    const hotelMetrics: HotelMetrics[] = [];

    for (const prop of properties) {
      const hotelReviews = currentReviews.filter(
        (r: any) => r.property_id === prop.id,
      );
      const rated = hotelReviews.filter(
        (r: any) => r.rating_normalized_10 != null,
      );
      const critical = hotelReviews.filter(
        (r: any) =>
          r.rating_normalized_10 != null && r.rating_normalized_10 <= 5,
      );
      const negative = hotelReviews.filter(
        (r: any) =>
          r.sentiment === "negative" || (r.rating_normalized_10 ?? 10) <= 6,
      );

      const avgRating =
        rated.length > 0
          ? Number(
              (
                rated.reduce(
                  (sum: number, r: any) =>
                    sum + Number(r.rating_normalized_10 ?? 0),
                  0,
                ) / rated.length
              ).toFixed(1),
            )
          : 0;

      // Previous period rating
      const hotelPrev = previousReviews.filter(
        (r: any) => r.property_id === prop.id && r.rating_normalized_10 != null,
      );
      const prevAvg =
        hotelPrev.length > 0
          ? Number(
              (
                hotelPrev.reduce(
                  (sum: number, r: any) =>
                    sum + Number(r.rating_normalized_10 ?? 0),
                  0,
                ) / hotelPrev.length
              ).toFixed(1),
            )
          : undefined;

      // Platform breakdown
      const platformBreakdown: Record<
        string,
        { count: number; total: number; avg: number }
      > = {};
      for (const r of rated) {
        const platform = r.platform || "Unknown";
        if (!platformBreakdown[platform]) {
          platformBreakdown[platform] = { count: 0, total: 0, avg: 0 };
        }
        platformBreakdown[platform].count++;
        platformBreakdown[platform].total += Number(r.rating_normalized_10);
      }

      const platformRatings: Record<string, number> = {};
      for (const [plat, data] of Object.entries(platformBreakdown)) {
        platformRatings[plat] =
          data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0;
      }

      const themes = extractThemes(hotelReviews);

      hotelMetrics.push({
        propertyId: prop.id,
        name: prop.name,
        city: prop.city || "",
        count: hotelReviews.length,
        avgRating,
        previousAvgRating: prevAvg,
        negativeCount: negative.length,
        negativeRate:
          hotelReviews.length > 0
            ? Number(((negative.length / hotelReviews.length) * 100).toFixed(1))
            : 0,
        criticalCount: critical.length,
        platformBreakdown: Object.fromEntries(
          Object.entries(platformBreakdown).map(([k, v]) => [
            k,
            { count: v.count, avg: platformRatings[k] },
          ]),
        ),
        platformRatings,
        reviews: hotelReviews,
        positiveTrends: themes.positive,
        negativeTrends: themes.negative,
      });
    }

    // Send email for each hotel
    const results: Array<{ hotel: string; status: string; error?: string }> =
      [];

    for (const hotel of hotelMetrics) {
      if (hotel.count === 0) {
        results.push({ hotel: hotel.name, status: "skipped (no reviews)" });
        continue;
      }

      // FIXED: Only Islam receives all hotel reports
      const recipients = ["islam@primehotelsgroup.com"];

      // Generate HTML email
      const trend = getTrendIndicator(hotel.avgRating, hotel.previousAvgRating);
      const recommendations = generateRecommendations(hotel);

      // Recent reviews table
      const recentReviewsHtml = hotel.reviews
        .slice(0, 8)
        .map((r: any) => {
          const date = (getReviewEventDate(r) ?? new Date(r.created_at))
            .toISOString()
            .split("T")[0];
          const score = r.rating_normalized_10?.toFixed(1) || "N/A";
          const excerpt = (
            r.summary_en ||
            r.review_text ||
            "No content"
          ).substring(0, 100);
          return `<tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${date}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${r.platform || "Unknown"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${r.reviewer_name || "Guest"}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:bold;color:${Number(score) >= 8 ? "#38a169" : Number(score) <= 5 ? "#e53e3e" : "#d69e2e"}">${score}/10</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${excerpt}${excerpt.length >= 100 ? "..." : ""}</td>
        </tr>`;
        })
        .join("");

      // Critical alerts table
      const criticalReviews = hotel.reviews.filter(
        (r: any) =>
          r.rating_normalized_10 != null && r.rating_normalized_10 <= 5,
      );
      const criticalAlertsHtml =
        criticalReviews.length > 0
          ? criticalReviews
              .slice(0, 5)
              .map((r: any) => {
                const excerpt = (
                  r.summary_en ||
                  r.review_text ||
                  "No content"
                ).substring(0, 150);
                const isUrgent =
                  excerpt.toLowerCase().includes("safety") ||
                  excerpt.toLowerCase().includes("health") ||
                  excerpt.toLowerCase().includes("theft") ||
                  excerpt.toLowerCase().includes("fraud");
                return `<tr style="background:${isUrgent ? "#fff5f5" : "transparent"}">
              <td style="padding:10px;border-bottom:1px solid #fed7d7;font-size:12px;">${r.reviewer_name || "Guest"}</td>
              <td style="padding:10px;border-bottom:1px solid #fed7d7;font-size:12px;">${r.platform || "Unknown"}</td>
              <td style="padding:10px;border-bottom:1px solid #fed7d7;font-size:12px;color:#e53e3e;font-weight:bold;">${r.rating_normalized_10}/10</td>
              <td style="padding:10px;border-bottom:1px solid #fed7d7;font-size:12px;">${excerpt}${excerpt.length >= 150 ? "..." : ""}${isUrgent ? " <span style='color:#e53e3e;font-weight:bold'>[URGENT]</span>" : ""}</td>
            </tr>`;
              })
              .join("")
          : `<tr><td colspan="4" style="padding:15px;text-align:center;color:#718096;font-size:12px;">✅ No critical alerts for this period</td></tr>`;

      // Platform scorecard
      const platformScorecardHtml = Object.entries(hotel.platformBreakdown)
        .map(([platform, data]: [string, any]) => {
          const rating = data.avg?.toFixed(1) || "N/A";
          return `<div style="display:inline-block;margin:5px;padding:10px 15px;background:#f7fafc;border-radius:6px;border-left:3px solid ${data.avg >= 8 ? "#38a169" : data.avg >= 6 ? "#d69e2e" : "#e53e3e"}">
          <div style="font-size:11px;color:#718096;text-transform:uppercase;">${platform}</div>
          <div style="font-size:18px;font-weight:bold;color:#1a365d;">${rating}</div>
          <div style="font-size:10px;color:#718096;">${data.count} reviews</div>
        </div>`;
        })
        .join("");

      // Recommendations HTML
      const recommendationsHtml = recommendations
        .map((rec) => {
          const priorityColor =
            rec.priority === "HIGH"
              ? "#e53e3e"
              : rec.priority === "MEDIUM"
                ? "#d69e2e"
                : "#38a169";
          return `<div style="background:#f7fafc;border-left:4px solid ${priorityColor};padding:12px 15px;margin-bottom:10px;border-radius:0 6px 6px 0;">
          <div style="font-size:11px;color:${priorityColor};font-weight:bold;margin-bottom:4px;">⚠️ ${rec.priority} | ${rec.dept}</div>
          <div style="font-size:13px;color:#2d3748;font-weight:600;margin-bottom:4px;">${rec.action}</div>
          <div style="font-size:11px;color:#718096;">${rec.rationale}</div>
        </div>`;
        })
        .join("");

      // Operational priorities
      const priorities: Array<{
        title: string;
        trend: string;
        trendClass: string;
      }> = [];
      if (hotel.criticalCount > 0) {
        priorities.push({
          title: "Address critical guest feedback",
          trend: "Urgent",
          trendClass: "declining",
        });
      }
      if (hotel.negativeRate > 15) {
        priorities.push({
          title: "Improve service consistency",
          trend: "Declining",
          trendClass: "declining",
        });
      } else if (hotel.negativeRate > 5) {
        priorities.push({
          title: "Monitor service trends",
          trend: "Stable",
          trendClass: "stable",
        });
      }
      if (hotel.avgRating < 7.5) {
        priorities.push({
          title: "Enhance guest satisfaction initiatives",
          trend: "Declining",
          trendClass: "declining",
        });
      } else if (hotel.avgRating >= 8.5) {
        priorities.push({
          title: "Maintain excellence standards",
          trend: "Improving",
          trendClass: "improving",
        });
      }

      const prioritiesHtml =
        priorities.length > 0
          ? priorities
              .map(
                (
                  p,
                ) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 15px;background:#f7fafc;border-radius:6px;margin-bottom:8px;">
            <span style="font-size:12px;color:#2d3748;">${p.title}</span>
            <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${p.trend === "Improving" ? "#c6f6d5" : p.trend === "Declining" || p.trend === "Urgent" ? "#fed7d7" : "#e2e8f0"};color:${p.trend === "Improving" ? "#22543d" : p.trend === "Declining" || p.trend === "Urgent" ? "#742a2a" : "#4a5568"};font-weight:600;">${p.trend}</span>
          </div>`,
              )
              .join("")
          : `<div style="padding:10px 15px;background:#f7fafc;border-radius:6px;font-size:12px;color:#718096;text-align:center;">No specific priorities identified</div>`;

      // Build full email HTML
      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Monitoring Report - ${hotel.name}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;">
  <div style="max-width:700px;margin:0 auto;background:#ffffff;">
    
    <!-- Header Banner -->
    <div style="background:#1a365d;color:#ffffff;padding:10px 20px;text-align:center;font-size:10px;letter-spacing:3px;text-transform:uppercase;">
      AUTOMATED DAILY MONITORING REPORT
    </div>
    
    <!-- Hotel Header -->
    <div style="background:#ffffff;padding:25px 30px;text-align:center;border-bottom:3px solid #1a365d;">
      <div style="font-size:24px;font-weight:bold;color:#1a365d;margin-bottom:5px;">${hotel.name}</div>
      <div style="font-size:13px;color:#666;margin-bottom:10px;">${hotel.city ? hotel.city + " | " : ""}PRIME Hotels Group</div>
      <div style="font-size:11px;color:#666;letter-spacing:1px;">
        📅 ${reportDateValue} | 🕑 ${generatedTime} Cairo Time
      </div>
    </div>
    
    <!-- Executive Summary -->
    <div style="background:#f8f9fa;padding:20px 30px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:13px;color:#1a365d;font-weight:bold;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">📊 Executive Summary</div>
      <div style="display:table;width:100%;">
        <div style="display:table-cell;width:25%;text-align:center;padding:15px;border-right:1px solid #e2e8f0;">
          <div style="font-size:28px;font-weight:bold;color:#1a365d;">${hotel.count}</div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;">Total Reviews</div>
        </div>
        <div style="display:table-cell;width:25%;text-align:center;padding:15px;border-right:1px solid #e2e8f0;">
          <div style="font-size:28px;font-weight:bold;color:${hotel.avgRating >= 8 ? "#38a169" : hotel.avgRating >= 6 ? "#d69e2e" : "#e53e3e"};">${hotel.avgRating}/10</div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;">Average Score ${trend.arrow}</div>
        </div>
        <div style="display:table-cell;width:25%;text-align:center;padding:15px;border-right:1px solid #e2e8f0;">
          <div style="font-size:28px;font-weight:bold;color:${hotel.criticalCount > 0 ? "#e53e3e" : "#38a169"};">${hotel.criticalCount}</div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;">Critical Alerts ≤5</div>
        </div>
        <div style="display:table-cell;width:25%;text-align:center;padding:15px;">
          <div style="font-size:28px;font-weight:bold;color:${hotel.negativeRate < 10 ? "#38a169" : hotel.negativeRate < 20 ? "#d69e2e" : "#e53e3e"};">${hotel.negativeRate}%</div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;">Negative Rate</div>
        </div>
      </div>
      ${hotel.count === 0 ? `<div style="margin-top:15px;padding:10px;background:#fffbeb;border-left:3px solid #d69e2e;font-size:12px;color:#744210;">⚠️ No review data available for this date range. Showing last available data if applicable.</div>` : ""}
    </div>
    
    <!-- Hotel Scorecard -->
    <div style="padding:25px 30px;">
      <div style="font-size:14px;color:#1a365d;font-weight:bold;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #1a365d;">🏨 Hotel Scorecard</div>
      
      <div style="background:#f7fafc;padding:20px;border-radius:8px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <div>
            <div style="font-size:20px;font-weight:bold;color:#1a365d;">${hotel.name}</div>
            <div style="font-size:12px;color:#718096;">${hotel.city || "Location N/A"}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:32px;font-weight:bold;color:${hotel.avgRating >= 8 ? "#38a169" : hotel.avgRating >= 6 ? "#d69e2e" : "#e53e3e"};">${hotel.avgRating}<span style="font-size:16px;">/10</span></div>
            <div style="font-size:12px;color:#718096;">Trend: ${trend.arrow} ${trend.text}</div>
          </div>
        </div>
        
        <div style="display:flex;gap:20px;margin-bottom:15px;">
          <div style="flex:1;text-align:center;padding:10px;background:#ffffff;border-radius:6px;">
            <div style="font-size:18px;font-weight:bold;color:#2d3748;">${hotel.count}</div>
            <div style="font-size:10px;color:#718096;text-transform:uppercase;">Reviews</div>
          </div>
          <div style="flex:1;text-align:center;padding:10px;background:#ffffff;border-radius:6px;">
            <div style="font-size:18px;font-weight:bold;color:${hotel.criticalCount > 0 ? "#e53e3e" : "#38a169"};">${hotel.criticalCount}</div>
            <div style="font-size:10px;color:#718096;text-transform:uppercase;">Alerts</div>
          </div>
          <div style="flex:1;text-align:center;padding:10px;background:#ffffff;border-radius:6px;">
            <div style="font-size:18px;font-weight:bold;color:#2d3748;">${Object.keys(hotel.platformBreakdown).length}</div>
            <div style="font-size:10px;color:#718096;text-transform:uppercase;">Platforms</div>
          </div>
        </div>
        
        ${
          platformScorecardHtml
            ? `<div style="margin-top:15px;padding-top:15px;border-top:1px solid #e2e8f0;">
          <div style="font-size:11px;color:#718096;margin-bottom:10px;text-transform:uppercase;">Platform Breakdown</div>
          ${platformScorecardHtml}
        </div>`
            : ""
        }
      </div>
      
      ${
        hotel.positiveTrends.length > 0
          ? `<div style="margin-bottom:15px;">
        <div style="font-size:12px;color:#38a169;font-weight:bold;margin-bottom:8px;">✅ Positive Trends</div>
        <div style="font-size:12px;color:#4a5568;line-height:1.6;">
          Guest praise: ${hotel.positiveTrends.join(", ")}
        </div>
      </div>`
          : ""
      }
      
      ${
        hotel.negativeTrends.length > 0
          ? `<div>
        <div style="font-size:12px;color:#e53e3e;font-weight:bold;margin-bottom:8px;">⚠️ Areas for Attention</div>
        <div style="font-size:12px;color:#4a5568;line-height:1.6;">
          Concerns: ${hotel.negativeTrends.join(", ")}
        </div>
      </div>`
          : ""
      }
    </div>
    
    <!-- Recent Reviews -->
    <div style="padding:0 30px 25px;">
      <div style="font-size:14px;color:#1a365d;font-weight:bold;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #1a365d;">📝 Recent Reviews Sample</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1a365d;color:#ffffff;">
            <th style="padding:10px;text-align:left;font-weight:600;">Date</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Platform</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Reviewer</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Score</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Review Excerpt</th>
          </tr>
        </thead>
        <tbody>
          ${recentReviewsHtml}
        </tbody>
      </table>
    </div>
    
    <!-- Critical Alerts -->
    <div style="padding:0 30px 25px;">
      <div style="font-size:14px;color:#742a2a;font-weight:bold;margin-bottom:15px;padding:12px;background:#fed7d7;border-left:4px solid #f56565;border-radius:0 6px 6px 0;">
        🚨 CRITICAL ALERTS — ${hotel.criticalCount} REVIEW(S) WITH RATING ≤5
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#742a2a;color:#ffffff;">
            <th style="padding:10px;text-align:left;font-weight:600;">Reviewer</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Platform</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Rating</th>
            <th style="padding:10px;text-align:left;font-weight:600;">Excerpt</th>
          </tr>
        </thead>
        <tbody>
          ${criticalAlertsHtml}
        </tbody>
      </table>
    </div>
    
    <!-- Operational Intelligence -->
    <div style="padding:0 30px 25px;">
      <div style="font-size:14px;color:#1a365d;font-weight:bold;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #1a365d;">💡 Operational Intelligence & Priorities</div>
      ${prioritiesHtml}
    </div>
    
    <!-- AI Recommendations -->
    <div style="padding:0 30px 25px;">
      <div style="font-size:14px;color:#1a365d;font-weight:bold;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #1a365d;">🎯 AI Recommendations — ${reportDateValue}</div>
      ${recommendationsHtml}
    </div>
    
    <!-- Footer -->
    <div style="background:#1a365d;color:#ffffff;padding:20px 30px;text-align:center;font-size:11px;">
      <div style="font-weight:bold;font-size:13px;margin-bottom:5px;">PRIME Hotels Group — ${hotel.name}</div>
      <div>Auto-generated Daily Monitoring Report | Powered by AI Review System</div>
      <div style="margin-top:8px;opacity:0.8;">Generated: ${reportDateValue}, ${generatedTime} Africa/Cairo | Confidential — For Internal Use Only</div>
    </div>
    
  </div>
</body>
</html>`;

      // Send email via Resend
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "PRIME Hotels KSA <notifications@phg-connect.com>",
            to: recipients,
            subject: `Daily Monitoring Report — ${hotel.name} | ${reportDateValue} | ${hotel.avgRating}/10 Avg`,
            html: emailHtml,
            text: `PRIME HOTELS KSA - Daily Monitoring Report for ${hotel.name}\nDate: ${reportDateValue}\n\nTotal Reviews: ${hotel.count}\nAverage Rating: ${hotel.avgRating}/10\nCritical Alerts: ${hotel.criticalCount}\nNegative Rate: ${hotel.negativeRate}%\n\nPlease view the full HTML email for detailed analytics.`,
          }),
        });

        if (resendResponse.ok) {
          results.push({ hotel: hotel.name, status: "sent" });
          console.log(`Email sent for ${hotel.name} to:`, recipients);
        } else {
          const errorText = await resendResponse.text();
          results.push({
            hotel: hotel.name,
            status: "failed",
            error: errorText,
          });
          console.error(`Failed to send email for ${hotel.name}:`, errorText);
        }
      } catch (err) {
        results.push({
          hotel: hotel.name,
          status: "error",
          error: String(err),
        });
        console.error(`Error sending email for ${hotel.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_date: reportDateValue,
        hotels_processed: results.length,
        results,
        summary: {
          total_hotels: properties.length,
          hotels_with_reviews: hotelMetrics.filter((h) => h.count > 0).length,
          emails_sent: results.filter((r) => r.status === "sent").length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("guest-review-hotel-daily-report failed:", error);
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
