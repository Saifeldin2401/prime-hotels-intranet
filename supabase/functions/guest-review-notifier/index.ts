import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TEST_ALLOWED_ROLES = new Set([
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

function isServiceRoleJwt(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const envValue = Deno.env.get(name);
  if (envValue && envValue.trim()) return envValue.trim();

  const { data, error } = await supabase
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", name)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
}

function buildSlackBlocks(payload: Record<string, unknown>) {
  const propertyName = payload.propertyName || "PHG Property";
  const platform = payload.platform || "Unknown";
  const ratingDisplay = payload.ratingDisplay || "Unrated";
  const severity = String(payload.severity || "medium");
  const assigneeName = payload.assigneeName || "Unassigned";
  const summaryEn = payload.summaryEn || "No summary available.";
  const managerBriefEn = payload.managerBriefEn ? `\n*Manager Brief:* ${payload.managerBriefEn}` : "";
  const reviewText = payload.reviewText || "No review text provided.";
  const authorName = payload.authorName || "Anonymous";
  const reviewedAt = payload.reviewedAt ? new Date(String(payload.reviewedAt)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Unknown date";
  const reviewUrl = payload.reviewUrl ? String(payload.reviewUrl) : null;
  const actionUrl = payload.actionUrl ? String(payload.actionUrl) : null;

  const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "🔴" : severity === "medium" ? "🟠" : "🟢";

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: { type: "plain_text", text: `${severityEmoji} ${propertyName} | Guest Review Alert`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Platform:*\n${platform}` },
        { type: "mrkdwn", text: `*Rating:*\n${ratingDisplay}` },
        { type: "mrkdwn", text: `*Author:*\n${authorName}` },
        { type: "mrkdwn", text: `*Date:*\n${reviewedAt}` },
      ],
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Severity:*\n${severity.toUpperCase()}` },
        { type: "mrkdwn", text: `*Assigned Owner:*\n${assigneeName}` },
      ]
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*AI Analysis*\n*Summary:* ${summaryEn}${managerBriefEn}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Original Review*\n> ${String(reviewText).replace(/\n/g, '\n> ')}` },
    },
  ];

  const buttons: Array<Record<string, unknown>> = [];
  
  if (actionUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "View Details in Platform", emoji: true },
      style: "primary",
      url: actionUrl,
    });
  }

  if (reviewUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "Open Original Review", emoji: true },
      url: reviewUrl,
    });
  }

  if (buttons.length > 0) {
    blocks.push({
      type: "actions",
      elements: buttons,
    });
  }

  return blocks;
}

async function sendSlackWebhook(webhookUrl: string, body: Record<string, unknown>) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Slack webhook failed with HTTP ${response.status}`);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = { ...buildCorsHeaders(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    }

    const body = req.method === "POST"
      ? await req.json().catch(() => ({} as Record<string, unknown>))
      : ({} as Record<string, unknown>);
    const isTestMode = body.test_mode === true || body.test === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const vaultServiceRoleKey = await getVaultSecret(serviceClient, "service_role_key");
    const isServiceRole = timingSafeBearerMatch(authHeader, serviceRoleKey);
    const isVaultServiceRole = vaultServiceRoleKey ? timingSafeBearerMatch(authHeader, vaultServiceRoleKey) : false;
    const isInternalService = isServiceRole || isVaultServiceRole || isServiceRoleJwt(authHeader);

    if (!isInternalService && !isTestMode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (!isServiceRole && isTestMode) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const { data: roleRows } = await serviceClient.from("user_roles").select("role").eq("user_id", authData.user.id);
      const roles = (roleRows ?? []).map((r: any) => r.role);
      if (!roles.some((r: any) => TEST_ALLOWED_ROLES.has(r))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    if (isTestMode) {
      const secretName = typeof body.secret_name === "string" && body.secret_name.trim()
        ? body.secret_name.trim()
        : "SLACK_GUEST_REVIEWS_WEBHOOK";
      const webhookUrl = await getVaultSecret(serviceClient, secretName);
      if (!webhookUrl) {
        return new Response(JSON.stringify({ success: false, error: `Vault secret "${secretName}" is not configured` }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      await sendSlackWebhook(webhookUrl, {
        text: "PHG Connect Guest Review Notifier Test",
        blocks: [{ type: "section", text: { type: "mrkdwn", text: "*PHG Connect*: Guest review notifier is reachable." } }],
      });
      return new Response(JSON.stringify({ success: true, message: "Slack test message sent successfully." }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const batchSize = Math.max(1, Math.min(100, Number(body.batch_size || 25)));
    const reviewId = typeof body.review_id === "string" ? body.review_id : null;

    let queueQuery = serviceClient
      .from("guest_review_notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(batchSize);
    if (reviewId) queueQuery = queueQuery.eq("review_id", reviewId);

    const { data: queueRows, error: queueErr } = await queueQuery;
    if (queueErr) throw queueErr;

    const results: Array<Record<string, unknown>> = [];
    for (const row of queueRows ?? []) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const nextAttempt = Number(row.attempts || 0) + 1;
      await serviceClient.from("guest_review_notification_queue").update({ status: "processing", attempts: nextAttempt }).eq(
        "id",
        row.id,
      );

      try {
        if (row.channel === "slack") {
          const secretName = typeof payload.secretName === "string" ? payload.secretName : "SLACK_GUEST_REVIEWS_WEBHOOK";
          const webhookUrl = await getVaultSecret(serviceClient, secretName);
          if (!webhookUrl) throw new Error(`Slack webhook secret "${secretName}" was not found`);
          await sendSlackWebhook(webhookUrl, {
            text: `${payload.propertyName || "PHG Property"} guest review alert`,
            blocks: buildSlackBlocks(payload),
          });
        } else if (row.channel === "email") {
          const recipients = asStringArray(payload.recipientEmails);
          if (recipients.length === 0) throw new Error("Email notification missing recipients");
          const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: recipients,
              templateKey: payload.templateKey || "review_negative_alert",
              businessDomain: row.notification_kind === "daily_exec_digest" ? "management" : "operations",
              notificationType: row.notification_kind === "escalation_alert" ? "escalation_alert" : "system",
              title: `${payload.propertyName || "PHG Property"} guest review`,
              message: payload.managerBriefEn || payload.summaryEn || "A guest review requires attention.",
              actionUrl: payload.actionUrl,
              variables: {
                property_name: payload.propertyName || "PHG Property",
                platform: payload.platform || "Unknown",
                rating_display: payload.ratingDisplay || "Unrated",
                severity: payload.severity || "medium",
                issue_categories: payload.issueCategories || "General review follow-up",
                assignee_name: payload.assigneeName || "Assigned owner",
                summary_en: payload.summaryEn || "",
                manager_brief_en: payload.managerBriefEn || "",
                escalation_level: payload.escalationLevel || 0,
                report_date: payload.reportDate || "",
                total_reviews: payload.totalReviews || "",
                average_rating: payload.averageRating || "",
                negative_reviews: payload.negativeReviews || "",
                sla_compliance: payload.slaCompliance || "",
              },
            }),
          });
          const sendResult = await res.json().catch(() => null);
          if (!res.ok || !sendResult?.success) {
            throw new Error(sendResult?.error || `send-email failed HTTP ${res.status}`);
          }
        } else {
          throw new Error(`Unsupported notification channel: ${row.channel}`);
        }

        await serviceClient.from("guest_review_notification_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", row.id);

        results.push({ id: row.id, status: "sent", channel: row.channel });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failImmediately = row.channel === "email" && message === "Email notification missing recipients";
        await serviceClient.from("guest_review_notification_queue").update({
          status: failImmediately || nextAttempt >= Number(row.max_attempts || 5) ? "failed" : "pending",
          last_error: message,
        }).eq("id", row.id);

        results.push({ id: row.id, status: "failed", channel: row.channel, error: message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("guest-review-notifier failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
