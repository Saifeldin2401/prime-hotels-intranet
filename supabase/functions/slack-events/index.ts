/**
 * Slack Events Handler
 *
 * Handles all incoming Slack events:
 * - url_verification: Respond with challenge for Slack verification
 * - message.channels: Route public channel messages
 * - message.im: Handle DM conversations
 * - app_mention: Respond when @mentioned
 * - member_joined_channel: Welcome new members
 * - reaction_added: Track emoji reactions
 *
 * Endpoint: POST /functions/v1/slack-events
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  verifySlackRequest,
  getUserBySlackId,
  getPHGUserContext,
  upsertSlackUserMapping,
  buildHeader,
  buildSection,
  buildDivider,
  buildContext,
  buildButton,
  buildActions,
  sendSlackBotMessage,
  getSlackIntegration,
  SlackEventRequest,
} from "../_shared/slack-utils.ts";
import { getVaultSecret } from "../_shared/vault.ts";

// ============================================================================
// Constants
// ============================================================================

const CHANNEL_ROUTES: Record<
  string,
  (
    event: Record<string, unknown>,
    context: {
      supabase: ReturnType<typeof createClient>;
      botToken: string;
      phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
    },
  ) => Promise<void>
> = {
  "training-hub": handleTrainingChannelMessage,
  "guest-reviews": handleReviewChannelMessage,
  operations: handleOpsChannelMessage,
  general: handleGeneralChannelMessage,
};

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
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

    // Get Slack signing secret for verification
    const signingSecret = await getVaultSecret(
      supabase,
      "SLACK_SIGNING_SECRET",
    );

    // Read body once for both verification and parsing
    const rawBody = await req.text();

    // Verify request signature. A missing signing secret must fail closed --
    // never process an unverified webhook (previously this fell through and
    // treated any forged payload as legitimate).
    if (!signingSecret) {
      console.error("No SLACK_SIGNING_SECRET configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Signature verification unavailable" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const isValid = await verifySlackRequest(req, signingSecret, rawBody);
    if (!isValid) {
      console.error("Invalid Slack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = JSON.parse(rawBody) as SlackEventRequest &
      Record<string, unknown>;

    // Handle test mode
    if (body.test_mode === true || body.test === true) {
      return handleTestMode(body, corsHeaders);
    }

    // Handle URL verification (Slack app installation)
    if (body.type === "url_verification") {
      return handleUrlVerification(body, corsHeaders);
    }

    // Handle event callbacks
    if (body.type === "event_callback") {
      return handleEventCallback(body, supabase, corsHeaders);
    }

    // Unknown event type
    return new Response(JSON.stringify({ error: "Unknown event type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("slack-events error:", error);
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
// Event Handlers
// ============================================================================

function handleTestMode(
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      test: true,
      message: "Slack events endpoint is reachable",
      received: body,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function handleUrlVerification(
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  const challenge = body.challenge as string;

  if (!challenge) {
    return new Response(JSON.stringify({ error: "Missing challenge" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ challenge }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleEventCallback(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const event = body.event as Record<string, unknown>;
  const eventType = event?.type as string;

  // Acknowledge receipt immediately (Slack requires 3-second response)
  // Process event asynchronously
  (async () => {
    try {
      await processEvent(event, supabase);
    } catch (error) {
      console.error("Error processing event:", error);
    }
  })();

  // Return immediate acknowledgment
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function processEvent(
  event: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const eventType = event.type as string;

  // Get bot token
  const integration = await getSlackIntegration(supabase);
  const botToken = integration?.botToken;

  if (!botToken) {
    console.error("No Slack bot token configured");
    return;
  }

  // Get or create user mapping
  const slackUserId = event.user as string;
  const slackTeamId = event.team as string;

  let phgUser = null;

  if (slackUserId && slackTeamId) {
    const mapping = await getUserBySlackId(supabase, slackUserId, slackTeamId);
    if (mapping) {
      phgUser = await getPHGUserContext(supabase, mapping.user_id);
    } else {
      // Attempt seamless auto-linking using Postgres FDW!
      try {
        console.log(`No mapping found. Searching slack_users FDW for ${slackUserId}`);
        const { data: slackInfoArray } = await supabase
          .from("slack_users")
          .select("*")
          .eq("id", slackUserId);
          
        const slackData = slackInfoArray?.[0];
        
        if (slackData && slackData.email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("email", slackData.email)
            .maybeSingle();
            
          if (profile?.id) {
            const { data: newMapping } = await supabase
              .from("slack_user_mappings")
              .insert({
                user_id: profile.id,
                slack_user_id: slackUserId,
                slack_team_id: slackTeamId,
                slack_email: slackData.email,
                slack_username: slackData.name,
                is_active: true,
              })
              .select("*")
              .single();
              
            if (newMapping) {
              console.log(`Auto-linked ${slackUserId} to profile ${profile.id} via FDW`);
              phgUser = await getPHGUserContext(supabase, profile.id);
            }
          }
        }
      } catch (err) {
        console.error("Auto-link in events failed:", err);
      }
    }
  }

  const context = { supabase, botToken, phgUser };

  // Route to appropriate handler
  switch (eventType) {
    case "message":
      await handleMessageEvent(event, context);
      break;

    case "app_mention":
      await handleAppMention(event, context);
      break;

    case "member_joined_channel":
      await handleMemberJoined(event, context);
      break;

    case "reaction_added":
      await handleReactionAdded(event, context);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

// ============================================================================
// Message Event Handler
// ============================================================================

async function handleMessageEvent(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const { supabase, botToken, phgUser } = context;

  // Skip bot messages
  if (event.bot_id || event.subtype === "bot_message") {
    return;
  }

  const channelId = event.channel as string;
  const channelType = event.channel_type as string;
  const text = (event.text as string) || "";

  // Get channel info to determine routing
  const { data: channelInfo } = await supabase
    .from("slack_integrations")
    .select("channel_mappings")
    .maybeSingle();

  const mappings =
    (channelInfo?.channel_mappings as Record<string, string>) || {};

  // Find channel name from mappings
  let channelName = "";
  for (const [name, id] of Object.entries(mappings)) {
    if (id === channelId) {
      channelName = name;
      break;
    }
  }

  // Route to appropriate handler
  if (channelName && CHANNEL_ROUTES[channelName]) {
    await CHANNEL_ROUTES[channelName](event, context);
  } else if (channelType === "im") {
    await handleDirectMessage(event, context);
  }
}

async function handleDirectMessage(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const { botToken, phgUser } = context;
  const channelId = event.channel as string;
  const text = (event.text as string) || "";

  // Simple command parsing for DMs
  const command = text.toLowerCase().trim();

  let responseBlocks = [];

  if (command.includes("help")) {
    responseBlocks = [
      buildHeader("PHG Connect Bot Help"),
      buildSection(
        "Here are the available commands:\n\n" +
          "• `/training` - View your training assignments\n" +
          "• `/reviews` - View guest reviews (managers only)\n" +
          "• `/ops` - Operations dashboard\n" +
          "• `/whoami` - Show your PHG profile\n" +
          "• `help` - Show this help message",
      ),
      buildDivider(),
      buildContext("Type a command to get started"),
    ];
  } else if (command.includes("hello") || command.includes("hi")) {
    const name = phgUser?.fullName || "there";
    responseBlocks = [
      buildSection(
        `Hello ${name}! 👋\n\nI'm the PHG Connect bot. How can I help you today?`,
      ),
      buildActions([
        buildButton("View Training", "dm_training", { style: "primary" }),
      ]),
    ];
  } else {
    // Default response
    responseBlocks = [
      buildSection(
        "I'm not sure what you mean. Type *help* to see available commands.",
      ),
    ];
  }

  await sendSlackBotMessage(botToken, channelId, { blocks: responseBlocks });
}

// ============================================================================
// Channel-specific Handlers
// ============================================================================

async function handleTrainingChannelMessage(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const text = (event.text as string) || "";

  // Look for training-related keywords
  if (text.includes("?") || text.toLowerCase().includes("help")) {
    // Could trigger AI response or route to training team
    console.log("Training question detected:", text);
  }
}

async function handleReviewChannelMessage(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  console.log("Review channel message received");
}

async function handleOpsChannelMessage(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  console.log("Ops channel message received");
}

async function handleGeneralChannelMessage(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  console.log("General channel message received");
}

// ============================================================================
// App Mention Handler
// ============================================================================

async function handleAppMention(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const { botToken } = context;
  const channelId = event.channel as string;
  const text = (event.text as string) || "";

  // Simple response when bot is mentioned
  const responseBlocks = [
    buildSection(
      "Hello! I'm the PHG Connect bot. 🏨\n\nI can help you with:\n• Training assignments\n• Guest reviews\n• Operations alerts\n\nType `/phg-help` for more commands.",
    ),
  ];

  await sendSlackBotMessage(botToken, channelId, { blocks: responseBlocks });
}

// ============================================================================
// Member Joined Handler
// ============================================================================

async function handleMemberJoined(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const { supabase, botToken } = context;
  const channelId = event.channel as string;
  const slackUserId = event.user as string;

  // Welcome message with training info
  const welcomeBlocks = [
    buildHeader("👋 Welcome to PHG Connect on Slack!"),
    buildSection(
      "I'm here to help you stay on top of your training and important notifications.\n\n" +
        "*Getting Started:*\n" +
        "• Use `/training` to see your current assignments\n" +
        "• Use `/phg-help` for all available commands\n" +
        "• I'll send you reminders for upcoming deadlines",
    ),
    buildDivider(),
    buildActions([
      buildButton("View My Training", "welcome_training", { style: "primary" }),
      buildButton("Open PHG Connect", "welcome_phg", {
        url: "https://www.altus-advisory.com",
      }),
    ]),
    buildContext("You can DM me anytime for quick updates!"),
  ];

  await sendSlackBotMessage(botToken, channelId, { blocks: welcomeBlocks });

  // Try to link Slack user to PHG user
  // This could be enhanced with a Slack auth flow
  console.log(`New member joined: ${slackUserId}`);
}

// ============================================================================
// Reaction Added Handler
// ============================================================================

async function handleReactionAdded(
  event: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    botToken: string;
    phgUser: Awaited<ReturnType<typeof getPHGUserContext>>;
  },
): Promise<void> {
  const { supabase, botToken, phgUser } = context;
  const reaction = event.reaction as string;
  const item = event.item as Record<string, string>;
  const slackUserId = event.user as string;

  // Log the reaction
  await supabase.from("slack_interactions").insert({
    slack_user_id: slackUserId,
    slack_team_id: event.team || "",
    action_id: `reaction_${reaction}`,
    action_type: "reaction",
    channel_id: item?.channel,
    message_ts: item?.ts,
    payload: { reaction, item },
    phg_user_id: context.phgUser?.userId,
  });

  // Feature: "Reacji" flow for 🎫 ticket emoji
  if (reaction === "ticket" || reaction === "admission_tickets") {
    console.log(`Ticket reacji detected from ${slackUserId}`);

    // Only allow mapped users to create tasks from Slack
    if (!phgUser) {
      console.warn("User not linked to PHG profile. Cannot create ticket.");
      return;
    }

    try {
      // 1. Fetch original message from Slack
      const historyUrl = new URL("https://slack.com/api/conversations.history");
      historyUrl.searchParams.append("channel", item.channel);
      historyUrl.searchParams.append("latest", item.ts);
      historyUrl.searchParams.append("limit", "1");
      historyUrl.searchParams.append("inclusive", "true");

      const historyRes = await fetch(historyUrl.toString(), {
        headers: { Authorization: `Bearer ${botToken}` },
      });
      const historyData = await historyRes.json();

      if (
        !historyData.ok ||
        !historyData.messages ||
        historyData.messages.length === 0
      ) {
        console.error(
          "Could not fetch original message for ticket:",
          historyData.error,
        );
        return;
      }

      const messageText =
        historyData.messages[0].text || "No text provided in Slack message";
      const title =
        messageText.length > 50
          ? messageText.substring(0, 47) + "..."
          : messageText;

      // 2. Create the task in Supabase Database
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: `[Slack Ticket] ${title}`,
          description: `Created automatically from Slack via 🎫 emoji reaction.\n\nOriginal Message:\n${messageText}`,
          created_by_id: phgUser.userId,
          status: "pending",
          priority: "medium",
        })
        .select("id")
        .single();

      if (taskError) {
        console.error("Failed to create task in Supabase:", taskError);
        return;
      }

      // 3. Confirm to Slack Thread
      await sendSlackBotMessage(botToken, item.channel, {
        thread_ts: item.ts,
        blocks: [
          buildHeader("🎫 Ticket Created!"),
          buildSection(
            `Successfully converted this message into a tracking ticket.`,
          ),
          buildActions([
            buildButton("View in PHG Connect", `view_task_${task.id}`, {
              url: `https://www.altus-advisory.com/tasks/${task.id}`,
            }),
          ]),
        ],
      });
    } catch (err) {
      console.error("Error executing ticket reacji flow", err);
    }
  }

  // Handle specific acknowledgments
  if (reaction === "white_check_mark" || reaction === "heavy_check_mark") {
    console.log(`Acknowledgment reaction from ${slackUserId}`);
  }
}
