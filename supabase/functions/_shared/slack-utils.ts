/**
 * Shared Slack utilities for PHG Connect Edge Functions
 *
 * Provides:
 * - Slack request signature verification
 * - Block Kit builders
 * - User mapping helpers
 * - Message sending utilities
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getVaultSecret } from "./vault.ts";

// ============================================================================
// Types
// ============================================================================

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface SlackUserMapping {
  id: string;
  user_id: string;
  slack_user_id: string;
  slack_team_id: string;
  slack_email?: string;
  slack_username?: string;
  is_active: boolean;
}

export interface SlackCommandRequest {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  team_id: string;
  channel_id: string;
  channel_name: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackEventRequest {
  type: string;
  token?: string;
  challenge?: string;
  team_id?: string;
  api_app_id?: string;
  event?: Record<string, unknown>;
  event_id?: string;
  event_time?: number;
}

export interface PHGUserContext {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  properties: string[];
  departments: string[];
}

// ============================================================================
// Request Verification
// ============================================================================

/**
 * Verify Slack request signature using timing-safe comparison
 * @param req - The incoming request
 * @param signingSecret - The Slack signing secret
 * @param rawBody - The raw request body string (read from req.text())
 * @returns boolean indicating if the request is valid
 */
export async function verifySlackRequest(
  req: Request,
  signingSecret: string,
  rawBody: string,
): Promise<boolean> {
  const timestamp = req.headers.get("X-Slack-Request-Timestamp");
  const signature = req.headers.get("X-Slack-Signature");

  if (!timestamp || !signature) return false;

  // Reject if timestamp is more than 5 minutes old
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(now - reqTime) > 300) return false;

  // Create signature base string
  const sigBaseString = `v0:${timestamp}:${rawBody}`;

  // Calculate HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sigBaseString),
  );

  const computedSignature = "v0=" + arrayBufferToHex(signatureBytes);

  // Timing-safe comparison
  return timingSafeEqual(computedSignature, signature);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// User Mapping Helpers
// ============================================================================

/**
 * Find PHG user by Slack user ID
 */
export async function getUserBySlackId(
  supabase: SupabaseClient,
  slackUserId: string,
  slackTeamId: string,
): Promise<SlackUserMapping | null> {
  const { data, error } = await supabase
    .from("slack_user_mappings")
    .select("*")
    .eq("slack_user_id", slackUserId)
    .eq("slack_team_id", slackTeamId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching Slack user mapping:", error);
    return null;
  }

  return data as SlackUserMapping | null;
}

/**
 * Get full PHG user context including roles and properties
 */
export async function getPHGUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<PHGUserContext | null> {
  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError);
    return null;
  }

  // Get roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  // Get properties
  const { data: properties } = await supabase
    .from("user_properties")
    .select("property_id")
    .eq("user_id", userId);

  // Get departments
  const { data: departments } = await supabase
    .from("user_departments")
    .select("department_id")
    .eq("user_id", userId);

  return {
    userId: profile.id,
    email: profile.email || "",
    fullName: profile.full_name || "",
    roles: (roles || []).map((r) => r.role),
    properties: (properties || []).map((p) => p.property_id),
    departments: (departments || []).map((d) => d.department_id),
  };
}

/**
 * Create or update Slack user mapping
 */
export async function upsertSlackUserMapping(
  supabase: SupabaseClient,
  mapping: Omit<SlackUserMapping, "id" | "created_at" | "updated_at">,
): Promise<SlackUserMapping | null> {
  const { data, error } = await supabase
    .from("slack_user_mappings")
    .upsert(
      {
        user_id: mapping.user_id,
        slack_user_id: mapping.slack_user_id,
        slack_team_id: mapping.slack_team_id,
        slack_email: mapping.slack_email,
        slack_username: mapping.slack_username,
        is_active: mapping.is_active,
      },
      {
        onConflict: "user_id,slack_team_id",
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting Slack user mapping:", error);
    return null;
  }

  return data as SlackUserMapping;
}

// ============================================================================
// Role Checking
// ============================================================================

/**
 * Check if user has required role for command access
 */
export function hasRequiredRole(
  userContext: PHGUserContext,
  requiredRoles: string[],
): boolean {
  return userContext.roles.some((role) => requiredRoles.includes(role));
}

/**
 * Get command access level based on PHG roles
 */
export function getCommandAccessLevel(
  userContext: PHGUserContext,
): "staff" | "dept_head" | "manager" | "regional" {
  const roles = userContext.roles;

  if (
    roles.some((r) =>
      ["regional_admin", "regional_hr", "corporate_admin"].includes(r),
    )
  ) {
    return "regional";
  }
  if (roles.some((r) => ["property_manager", "property_hr"].includes(r))) {
    return "manager";
  }
  if (roles.some((r) => r === "department_head")) {
    return "dept_head";
  }
  return "staff";
}

// ============================================================================
// Block Kit Builders
// ============================================================================

/**
 * Build header block
 */
export function buildHeader(text: string): SlackBlock {
  return {
    type: "header",
    text: { type: "plain_text", text, emoji: true },
  };
}

/**
 * Build section with fields
 */
export function buildSection(
  text: string,
  fields?: Array<{ title: string; value: string }>,
): SlackBlock {
  const block: SlackBlock = {
    type: "section",
    text: { type: "mrkdwn", text },
  };

  if (fields && fields.length > 0) {
    block.fields = fields.map((f) => ({
      type: "mrkdwn",
      text: `*${f.title}:*\n${f.value}`,
    }));
  }

  return block;
}

/**
 * Build divider
 */
export function buildDivider(): SlackBlock {
  return { type: "divider" };
}

/**
 * Build context (footer text)
 */
export function buildContext(text: string): SlackBlock {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text }],
  };
}

/**
 * Build button action
 */
export function buildButton(
  text: string,
  actionId: string,
  options: {
    style?: "primary" | "danger";
    url?: string;
    value?: string;
  } = {},
): Record<string, unknown> {
  const button: Record<string, unknown> = {
    type: "button",
    text: { type: "plain_text", text, emoji: true },
    action_id: actionId,
  };

  if (options.style) button.style = options.style;
  if (options.url) button.url = options.url;
  if (options.value) button.value = options.value;

  return button;
}

/**
 * Build actions block with buttons
 */
export function buildActions(
  buttons: Array<Record<string, unknown>>,
): SlackBlock {
  return {
    type: "actions",
    elements: buttons,
  };
}

/**
 * Build training module block
 */
export function buildTrainingBlock(
  moduleTitle: string,
  dueDate: string | null,
  progressPercent: number,
  assignmentId: string,
): SlackBlock[] {
  const dueText = dueDate
    ? `*Due:* ${new Date(dueDate).toLocaleDateString()}`
    : "*Due:* No deadline";

  const progressEmoji =
    progressPercent === 100 ? "✅" : progressPercent > 50 ? "🟡" : "🔴";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${progressEmoji} *${moduleTitle}*\n${dueText} • Progress: ${progressPercent}%`,
      },
    },
    {
      type: "actions",
      elements: [
        buildButton("Start Training", `training_start_${assignmentId}`, {
          style: "primary",
        }),
        buildButton("View Details", `training_view_${assignmentId}`),
      ],
    },
  ];
}

/**
 * Build review alert block
 */
export function buildReviewAlertBlock(
  review: {
    id: string;
    property_name: string;
    platform: string;
    rating: number;
    severity: string;
    summary?: string;
  },
  actionUrl: string,
): SlackBlock[] {
  const severityEmoji =
    review.severity === "critical"
      ? "🚨"
      : review.severity === "high"
        ? "🔴"
        : review.severity === "medium"
          ? "🟠"
          : "🟢";

  const stars =
    "★".repeat(Math.floor(review.rating)) +
    "☆".repeat(5 - Math.floor(review.rating));

  return [
    buildHeader(
      `${severityEmoji} Guest Review Alert - ${review.property_name}`,
    ),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Platform:*\n${review.platform}` },
        { type: "mrkdwn", text: `*Rating:*\n${stars} (${review.rating})` },
        {
          type: "mrkdwn",
          text: `*Severity:*\n${review.severity.toUpperCase()}`,
        },
        { type: "mrkdwn", text: `*Property:*\n${review.property_name}` },
      ],
    },
    ...(review.summary
      ? [
          {
            type: "section",
            text: { type: "mrkdwn", text: `*AI Summary:*\n${review.summary}` },
          },
        ]
      : []),
    buildDivider(),
    buildActions([
      buildButton("View in PHG", `review_view_${review.id}`, {
        style: "primary",
        url: actionUrl,
      }),
      buildButton("Acknowledge", `review_ack_${review.id}`),
      buildButton("Escalate", `review_escalate_${review.id}`, {
        style: "danger",
      }),
    ]),
  ];
}

// ============================================================================
// Message Sending
// ============================================================================

/**
 * Send message to Slack webhook
 */
export async function sendSlackWebhook(
  webhookUrl: string,
  payload: { text?: string; blocks?: SlackBlock[] },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send Slack message using Bot API (requires bot token)
 */
export async function sendSlackBotMessage(
  botToken: string,
  channel: string,
  payload: { text?: string; blocks?: SlackBlock[]; thread_ts?: string },
): Promise<{ success: boolean; ts?: string; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel,
        ...payload,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, ts: data.ts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Open Slack modal view
 */
export async function openSlackModal(
  botToken: string,
  triggerId: string,
  view: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        trigger_id: triggerId,
        view,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Slack Integration Lookup
// ============================================================================

/**
 * Get Slack integration for a property
 */
export async function getSlackIntegration(
  supabase: SupabaseClient,
  propertyId?: string,
): Promise<{
  id: string;
  workspaceName: string;
  botToken: string | null;
  signingSecret: string | null;
  channelMappings: Record<string, string>;
} | null> {
  let query = supabase
    .from("slack_integrations")
    .select("*")
    .eq("is_active", true);

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching Slack integration:", error);
    return null;
  }

  // Get secrets from vault
  const [botToken, signingSecret] = await Promise.all([
    getVaultSecret(supabase, "SLACK_BOT_TOKEN"),
    getVaultSecret(supabase, "SLACK_SIGNING_SECRET"),
  ]);

  return {
    id: data.id,
    workspaceName: data.workspace_name,
    botToken,
    signingSecret,
    channelMappings: data.channel_mappings || {},
  };
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Build Slack command response
 */
export function buildCommandResponse(
  blocks: SlackBlock[],
  options: {
    responseType?: "ephemeral" | "in_channel";
    text?: string;
  } = {},
): Response {
  const body = {
    response_type: options.responseType || "ephemeral",
    blocks,
    text: options.text || "PHG Connect notification",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Build error response for Slack commands
 */
export function buildErrorResponse(message: string): Response {
  return buildCommandResponse(
    [
      buildHeader("❌ Error"),
      buildSection(message),
      buildContext("PHG Connect Bot"),
    ],
    { text: "Error occurred" },
  );
}

/**
 * Build success response for Slack commands
 */
export function buildSuccessResponse(
  title: string,
  message: string,
  options: { actions?: SlackBlock[] } = {},
): Response {
  const blocks: SlackBlock[] = [
    buildHeader(`✅ ${title}`),
    buildSection(message),
  ];

  if (options.actions) {
    blocks.push(...options.actions);
  }

  blocks.push(buildContext("PHG Connect Bot"));

  return buildCommandResponse(blocks, { text: title });
}
