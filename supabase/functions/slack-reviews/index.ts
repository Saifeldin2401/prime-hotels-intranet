/**
 * Slack Reviews Integration
 *
 * Guest reviews integration features:
 * - Daily review summary (cron-triggered)
 * - Critical review alerts (real-time)
 * - Weekly executive digest
 *
 * Endpoint: POST /functions/v1/slack-reviews
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  buildHeader,
  buildSection,
  buildDivider,
  buildContext,
  buildButton,
  buildActions,
  sendSlackWebhook,
  sendSlackBotMessage,
  buildReviewAlertBlock,
  getSlackIntegration,
} from "../_shared/slack-utils.ts";
import { getVaultSecret } from "../_shared/vault.ts";

// ============================================================================
// Types
// ============================================================================

interface ReviewsPayload {
  action:
    | "daily_summary"
    | "critical_alert"
    | "executive_digest"
    | "process_queue";
  review_id?: string;
  test_mode?: boolean;
}

interface ReviewSummary {
  total: number;
  averageRating: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byPlatform: Record<string, { count: number; avgRating: number }>;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = verifyServiceRole(authHeader, serviceRoleKey);

    const body = (await req.json()) as ReviewsPayload;

    // Allow test mode without auth
    if (body.test_mode && !isServiceRole) {
      return handleTestMode(body, corsHeaders);
    }

    // Require auth for non-test calls
    if (!isServiceRole && !body.test_mode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Slack integration
    const integration = await getSlackIntegration(supabase);

    // Route to action handler
    switch (body.action) {
      case "daily_summary":
        return await sendDailySummary(supabase, integration, corsHeaders);

      case "critical_alert":
        if (!body.review_id) {
          return new Response(JSON.stringify({ error: "Missing review_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return await sendCriticalAlert(
          supabase,
          integration,
          body.review_id,
          corsHeaders,
        );

      case "executive_digest":
        return await sendExecutiveDigest(supabase, integration, corsHeaders);

      case "process_queue":
        return await processNotificationQueue(
          supabase,
          integration,
          corsHeaders,
        );

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("slack-reviews error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// ============================================================================
// Daily Summary
// ============================================================================

async function sendDailySummary(
  supabase: ReturnType<typeof createClient>,
  integration: Awaited<ReturnType<typeof getSlackIntegration>>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get today's reviews
  const today = new Date().toISOString().split("T")[0];
  const { data: reviews, error } = await supabase
    .from("guest_reviews")
    .select(
      `
      id,
      property_id,
      platform,
      rating,
      severity,
      title,
      reviewed_at,
      properties(name)
    `,
    )
    .gte("reviewed_at", today)
    .order("reviewed_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch reviews" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Calculate summary
  const summary = calculateReviewSummary(reviews || []);

  // Build blocks
  const blocks = [
    buildHeader(
      `📝 Daily Guest Review Summary - ${new Date().toLocaleDateString()}`,
    ),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total Reviews:*\n${summary.total}` },
        {
          type: "mrkdwn",
          text: `*Avg Rating:*\n${summary.averageRating.toFixed(1)} ⭐`,
        },
        { type: "mrkdwn", text: `*Critical:*\n${summary.critical} 🚨` },
        { type: "mrkdwn", text: `*High:*\n${summary.high} 🔴` },
      ],
    },
    buildDivider(),
  ];

  // Add platform breakdown
  if (Object.keys(summary.byPlatform).length > 0) {
    let platformText = "*By Platform:*\n";
    for (const [platform, stats] of Object.entries(summary.byPlatform)) {
      platformText += `• ${platform}: ${stats.count} reviews (avg ${stats.avgRating.toFixed(1)}⭐)\n`;
    }
    blocks.push(buildSection(platformText));
  }

  // Add critical reviews
  const criticalReviews = (reviews || []).filter(
    (r) => r.severity === "critical",
  );
  if (criticalReviews.length > 0) {
    blocks.push(buildDivider());
    blocks.push(buildSection("*🚨 Critical Reviews Requiring Attention:*"));

    for (const review of criticalReviews.slice(0, 3)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${review.properties?.name || "Unknown"}* | ${review.platform}\n` +
            `⭐ ${review.rating}/5 • ${review.title || "No title"}`,
        },
      });
    }
  }

  // Add SLA info
  const { data: slaStats } = await supabase
    .from("guest_reviews")
    .select("sla_status")
    .gte("reviewed_at", today);

  const compliant =
    slaStats?.filter((s) => s.sla_status === "compliant").length || 0;
  const breached =
    slaStats?.filter((s) => s.sla_status === "breached").length || 0;

  blocks.push(buildDivider());
  blocks.push({
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*SLA Compliance:*\n${compliant} ✅` },
      { type: "mrkdwn", text: `*SLA Breached:*\n${breached} ⚠️` },
    ],
  });

  blocks.push(
    buildActions([
      buildButton("View All Reviews", "reviews_all", {
        style: "primary",
        url: "https://phg-connect.com/guest-reviews",
      }),
    ]),
  );

  // Send to guest-reviews channel
  const webhookUrl = integration?.channelMappings?.["guest_reviews"]
    ? await getWebhookForChannel(supabase, "guest_reviews")
    : null;

  if (webhookUrl) {
    await sendSlackWebhook(webhookUrl, {
      blocks,
      text: "Daily guest review summary",
    });
  }

  // Also try bot message if available
  if (integration?.botToken && integration.channelMappings?.["guest_reviews"]) {
    await sendSlackBotMessage(
      integration.botToken,
      integration.channelMappings["guest_reviews"],
      { blocks, text: "Daily guest review summary" },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      reviews_count: reviews?.length || 0,
      summary,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Critical Alert
// ============================================================================

async function sendCriticalAlert(
  supabase: ReturnType<typeof createClient>,
  integration: Awaited<ReturnType<typeof getSlackIntegration>>,
  reviewId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get review with analysis
  const { data: review, error } = await supabase
    .from("guest_reviews")
    .select(
      `
      id,
      property_id,
      platform,
      rating,
      severity,
      title,
      author_name,
      reviewed_at,
      properties(name),
      guest_review_analyses(summary_en, manager_brief_en, issue_categories)
    `,
    )
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    return new Response(JSON.stringify({ error: "Review not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Only send for critical/high severity
  if (review.severity !== "critical" && review.severity !== "high") {
    return new Response(
      JSON.stringify({
        success: true,
        message: "Review severity not high enough for alert",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const analysis = review.guest_review_analyses?.[0] || {};

  const alertData = {
    id: review.id,
    property_name: review.properties?.name || "Unknown Property",
    platform: review.platform,
    rating: review.rating,
    severity: review.severity,
    summary: analysis.summary_en || "",
  };

  const blocks = buildReviewAlertBlock(
    alertData,
    `https://phg-connect.com/guest-reviews/${reviewId}`,
  );

  // Send to guest-reviews channel
  const webhookUrl = integration?.channelMappings?.["guest_reviews"]
    ? await getWebhookForChannel(supabase, "guest_reviews")
    : null;

  if (webhookUrl) {
    await sendSlackWebhook(webhookUrl, {
      blocks,
      text: `🚨 Critical review from ${review.properties?.name}`,
    });
  }

  // Also try bot message
  if (integration?.botToken && integration.channelMappings?.["guest_reviews"]) {
    await sendSlackBotMessage(
      integration.botToken,
      integration.channelMappings["guest_reviews"],
      { blocks, text: `🚨 Critical review from ${review.properties?.name}` },
    );
  }

  // Update notification queue
  await supabase
    .from("guest_review_notification_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("review_id", reviewId)
    .eq("channel", "slack");

  return new Response(
    JSON.stringify({
      success: true,
      review_id: reviewId,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Executive Digest
// ============================================================================

async function sendExecutiveDigest(
  supabase: ReturnType<typeof createClient>,
  integration: Awaited<ReturnType<typeof getSlackIntegration>>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get last 7 days of reviews
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: reviews, error } = await supabase
    .from("guest_reviews")
    .select(
      `
      id,
      property_id,
      platform,
      rating,
      severity,
      reviewed_at,
      response_time_hours,
      properties(name)
    `,
    )
    .gte("reviewed_at", weekAgo.toISOString())
    .order("reviewed_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews for digest:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch reviews" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Calculate weekly stats
  const summary = calculateReviewSummary(reviews || []);

  // Calculate property comparison
  const propertyStats: Record<
    string,
    { name: string; count: number; avgRating: number }
  > = {};
  for (const review of reviews || []) {
    const propId = review.property_id;
    const propName = review.properties?.name || "Unknown";

    if (!propertyStats[propId]) {
      propertyStats[propId] = { name: propName, count: 0, avgRating: 0 };
    }

    propertyStats[propId].count++;
    propertyStats[propId].avgRating =
      (propertyStats[propId].avgRating * (propertyStats[propId].count - 1) +
        (review.rating || 0)) /
      propertyStats[propId].count;
  }

  // Calculate response time
  const responseTimes = (reviews || [])
    .map((r) => r.response_time_hours)
    .filter((t): t is number => t !== null && t !== undefined);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Build digest
  const blocks = [
    buildHeader(
      `📊 Weekly Executive Review Digest - ${new Date().toLocaleDateString()}`,
    ),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total Reviews:*\n${summary.total}` },
        {
          type: "mrkdwn",
          text: `*Avg Rating:*\n${summary.averageRating.toFixed(1)} ⭐`,
        },
        { type: "mrkdwn", text: `*Critical Issues:*\n${summary.critical} 🚨` },
        {
          type: "mrkdwn",
          text: `*Avg Response:*\n${avgResponseTime.toFixed(1)} hrs`,
        },
      ],
    },
    buildDivider(),
  ];

  // Add property comparison
  const sortedProperties = Object.values(propertyStats).sort(
    (a, b) => b.avgRating - a.avgRating,
  );

  if (sortedProperties.length > 0) {
    blocks.push(buildSection("*Property Performance:*"));

    for (const prop of sortedProperties.slice(0, 5)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${prop.name}: ${prop.avgRating.toFixed(1)}⭐ (${prop.count} reviews)`,
        },
      });
    }
  }

  // Add trending issues (from analyses)
  const { data: analyses } = await supabase
    .from("guest_review_analyses")
    .select("issue_categories")
    .gte("created_at", weekAgo.toISOString())
    .not("issue_categories", "is", null);

  const issueCounts: Record<string, number> = {};
  for (const analysis of analyses || []) {
    const categories = (analysis.issue_categories as string[]) || [];
    for (const cat of categories) {
      issueCounts[cat] = (issueCounts[cat] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topIssues.length > 0) {
    blocks.push(buildDivider());
    blocks.push(buildSection("*Trending Issues:*"));

    for (const [issue, count] of topIssues) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• ${issue}: ${count} mentions`,
        },
      });
    }
  }

  blocks.push(
    buildActions([
      buildButton("View Full Report", "reviews_report", {
        style: "primary",
        url: "https://phg-connect.com/guest-reviews/reports",
      }),
    ]),
  );

  // Send to executives
  // For now, send to guest-reviews channel (in production, this could go to a specific exec channel)
  const webhookUrl = integration?.channelMappings?.["guest_reviews"]
    ? await getWebhookForChannel(supabase, "guest_reviews")
    : null;

  if (webhookUrl) {
    await sendSlackWebhook(webhookUrl, {
      blocks,
      text: "Weekly executive review digest",
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      reviews_count: reviews?.length || 0,
      summary,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Process Queue
// ============================================================================

async function processNotificationQueue(
  supabase: ReturnType<typeof createClient>,
  integration: Awaited<ReturnType<typeof getSlackIntegration>>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get pending notifications from queue
  const { data: queueItems, error } = await supabase
    .from("guest_review_notification_queue")
    .select("*")
    .eq("status", "pending")
    .eq("channel", "slack")
    .lte("scheduled_for", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error fetching queue:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch queue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const item of queueItems || []) {
    try {
      const payload = item.payload as Record<string, unknown>;

      // Get webhook URL
      const webhookUrl = await getVaultSecret(
        supabase,
        item.webhook_secret_name || "SLACK_GUEST_REVIEWS_WEBHOOK",
      );

      if (!webhookUrl) {
        throw new Error(`Webhook secret ${item.webhook_secret_name} not found`);
      }

      // Send notification
      const result = await sendSlackWebhook(webhookUrl, {
        text: (payload.text as string) || "Guest review notification",
        blocks: payload.blocks as unknown[],
      });

      // Update queue status
      await supabase
        .from("guest_review_notification_queue")
        .update({
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          last_error: result.success ? null : result.error,
          attempts: (item.attempts || 0) + 1,
        })
        .eq("id", item.id);

      results.push({
        id: item.id,
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await supabase
        .from("guest_review_notification_queue")
        .update({
          status: "failed",
          last_error: message,
          attempts: (item.attempts || 0) + 1,
        })
        .eq("id", item.id);

      results.push({ id: item.id, success: false, error: message });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: results.length,
      results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Helpers
// ============================================================================

function verifyServiceRole(
  authHeader: string | null,
  serviceRoleKey: string,
): boolean {
  if (!authHeader || !serviceRoleKey) return false;
  const expected = `Bearer ${serviceRoleKey}`;
  if (authHeader.length !== expected.length) return false;

  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function calculateReviewSummary(
  reviews: Array<{ rating?: number; severity?: string }>,
): ReviewSummary {
  const summary: ReviewSummary = {
    total: reviews.length,
    averageRating: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byPlatform: {},
  };

  let totalRating = 0;

  for (const review of reviews) {
    // Rating
    if (review.rating) {
      totalRating += review.rating;
    }

    // Severity
    switch (review.severity) {
      case "critical":
        summary.critical++;
        break;
      case "high":
        summary.high++;
        break;
      case "medium":
        summary.medium++;
        break;
      case "low":
        summary.low++;
        break;
    }

    // Platform (would need to include platform in the query)
  }

  summary.averageRating = summary.total > 0 ? totalRating / summary.total : 0;

  return summary;
}

async function getWebhookForChannel(
  supabase: ReturnType<typeof createClient>,
  channelName: string,
): Promise<string | null> {
  // Get from vault based on channel name
  const secretName = `SLACK_${channelName.toUpperCase().replace("-", "_")}_WEBHOOK`;
  return await getVaultSecret(supabase, secretName);
}

function handleTestMode(
  body: ReviewsPayload,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      test: true,
      message: "Slack reviews endpoint is reachable",
      action: body.action,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
