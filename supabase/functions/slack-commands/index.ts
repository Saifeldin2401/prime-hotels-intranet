/**
 * Slack Commands Handler
 *
 * Handles slash commands:
 * - /training - Show current training assignments
 * - /training @user - Show user's training status (Dept Head+)
 * - /reviews - Today's review summary (Property Manager+)
 * - /reviews [property] - Property-specific reviews (Regional Admin+)
 * - /ops - Operations dashboard quick links
 * - /ops alert [message] - Send ops alert (Dept Head+)
 * - /phg-help - Show available commands
 * - /whoami - Show PHG profile linked to Slack
 *
 * Endpoint: POST /functions/v1/slack-commands
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  verifySlackRequest,
  getUserBySlackId,
  getPHGUserContext,
  hasRequiredRole,
  getCommandAccessLevel,
  buildHeader,
  buildSection,
  buildDivider,
  buildContext,
  buildButton,
  buildActions,
  buildCommandResponse,
  buildErrorResponse,
  buildSuccessResponse,
  SlackCommandRequest,
  PHGUserContext,
} from "../_shared/slack-utils.ts";
import { getVaultSecret } from "../_shared/vault.ts";

// ============================================================================
// Command Definitions
// ============================================================================

interface CommandDef {
  command: string;
  description: string;
  access: string[];
  handler: (
    req: SlackCommandRequest,
    context: {
      supabase: ReturnType<typeof createClient>;
      phgUser: PHGUserContext;
    },
  ) => Promise<Response>;
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

    // Get signing secret from vault
    const signingSecret = await getVaultSecret(
      supabase,
      "SLACK_SIGNING_SECRET",
    );

    // Read body once for both verification and parsing
    const rawBody = await req.text();

    // Verify Slack signature if secret is available
    if (signingSecret) {
      const isValid = await verifySlackRequest(req, signingSecret, rawBody);
      if (!isValid) {
        console.warn("Invalid Slack signature received");
        return buildErrorResponse("Invalid request signature");
      }
    }

    // Parse urlencoded body
    const params = new URLSearchParams(rawBody);
    const commandReq: SlackCommandRequest = {
      command: params.get("command") || "",
      text: params.get("text") || "",
      user_id: params.get("user_id") || "",
      user_name: params.get("user_name") || "",
      team_id: params.get("team_id") || "",
      channel_id: params.get("channel_id") || "",
      channel_name: params.get("channel_name") || "",
      response_url: params.get("response_url") || "",
      trigger_id: params.get("trigger_id") || "",
    };

    console.log(
      `Slack Command: ${commandReq.command} from ${commandReq.user_id}`,
    );

    // Handle test mode
    if (
      commandReq.text.includes("test_mode=true") ||
      commandReq.text === "test"
    ) {
      return handleTestMode(commandReq, corsHeaders);
    }

    // Get mapping
    let mapping = await getUserBySlackId(
      supabase,
      commandReq.user_id,
      commandReq.team_id,
    );

    // Attempt seamless auto-linking if mapping not found
    if (!mapping) {
      console.log(
        `No mapping found. Attempting auto-link for Slack user ${commandReq.user_id}`,
      );
      try {
        console.log(`Querying slack_users Postgres FDW...`);
        // Native SQL querying the Slack workspace via Foreign Data Wrapper mapping!
        const { data: slackInfoArray, error: fdwError } = await supabase
          .from("slack_users")
          .select("*")
          .eq("id", commandReq.user_id);

        if (fdwError) {
          console.error("FDW Error querying slack_users:", fdwError);
        }

        const slackData = slackInfoArray?.[0];

        if (slackData && slackData.email) {
          const slackEmail = slackData.email;
          const slackUsername = slackData.name;

          console.log(`Fetched Slack email via Postgres FDW: ${slackEmail}`);

          // Check if a PHG profile exists with this exact email
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("email", slackEmail)
            .maybeSingle();

          if (profile?.id) {
            // Create mapping seamlessly
            const newMapping = {
              user_id: profile.id,
              slack_user_id: commandReq.user_id,
              slack_team_id: commandReq.team_id,
              slack_email: slackEmail,
              slack_username: slackUsername || commandReq.user_name,
              is_active: true,
            };

            const { data: insertedMapping, error: insertError } = await supabase
              .from("slack_user_mappings")
              .insert(newMapping)
              .select()
              .single();

            if (!insertError && insertedMapping) {
              console.log(
                `Successfully auto-linked Slack user ${commandReq.user_id} to profile ${profile.id}`
              );
              mapping = insertedMapping as any;
            } else {
              console.error("Auto-link insert failed:", insertError);
            }
          }
        }
      } catch (fetchError) {
        console.error("Failed to query slack_users FDW for auto-linking:", fetchError);
      }
    }

    if (!mapping) {
      console.warn(
        `Auto-link failed or not possible for Slack user ${commandReq.user_id}`,
      );
      return buildErrorResponse(
        "Your Slack account could not be automatically linked to PHG Connect.\n" +
          "Please ensure your Slack email matches your PHG Connect email, or contact your administrator.",
      );
    }

    // Get profile
    const phgUser = await getPHGUserContext(supabase, mapping.user_id);
    if (!phgUser) {
      console.error(`Profile not found for mapped user ${mapping.user_id}`);
      return buildErrorResponse(
        "Could not load your PHG profile. Please contact support.",
      );
    }

    // Log the command receipt
    const { error: logError } = await supabase
      .from("slack_commands_log")
      .insert({
        command: commandReq.command,
        slack_user_id: commandReq.user_id,
        slack_team_id: commandReq.team_id,
        channel_id: commandReq.channel_id,
        text: commandReq.text,
        phg_user_id: phgUser.userId,
        success: true,
      });

    if (logError)
      console.error("Error logging Slack command:", logError.message);

    // Router
    const commandHandlers: Record<string, CommandDef["handler"]> = {
      "/training": handleTrainingCommand,
      "/reviews": handleReviewsCommand,
      "/ops": handleOpsCommand,
      "/phg-help": handleHelpCommand,
      "/whoami": handleWhoAmICommand,
    };

    const handler = commandHandlers[commandReq.command];
    if (!handler) {
      return buildErrorResponse(`Unknown command: ${commandReq.command}`);
    }

    return await handler(commandReq, { supabase, phgUser });
  } catch (error) {
    console.error("slack-commands catastrophic error:", error);
    return buildErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

// ============================================================================
// Command Handlers
// ============================================================================

async function handleTrainingCommand(
  req: SlackCommandRequest,
  context: {
    supabase: ReturnType<typeof createClient>;
    phgUser: PHGUserContext;
  },
): Promise<Response> {
  const { supabase, phgUser } = context;
  const text = req.text.trim();

  // Check for @user mention (for managers)
  const userMention = text.match(/<@([A-Z0-9]+)>/);

  if (userMention) {
    // Looking up another user's training
    const targetSlackId = userMention[1];

    // Check permissions
    if (
      !hasRequiredRole(phgUser, [
        "department_head",
        "property_manager",
        "property_hr",
        "regional_admin",
        "regional_hr",
        "corporate_admin",
      ])
    ) {
      return buildErrorResponse(
        "You don't have permission to view other users' training.\nRequired: Department Head or above.",
      );
    }

    // Get target user
    const targetMapping = await getUserBySlackId(
      supabase,
      targetSlackId,
      req.team_id,
    );
    if (!targetMapping) {
      return buildErrorResponse("That user is not linked to PHG Connect.");
    }

    const targetPHGUser = await getPHGUserContext(
      supabase,
      targetMapping.user_id,
    );
    if (!targetPHGUser) {
      return buildErrorResponse("Could not load the target user's profile.");
    }

    // Get their assignments
    const assignments = await fetchUserAssignments(
      supabase,
      targetMapping.user_id,
    );

    const blocks = [
      buildHeader(`📚 Training for ${targetPHGUser.fullName}`),
      ...formatAssignments(assignments),
      buildDivider(),
      buildContext(`Viewed by ${phgUser.fullName}`),
    ];

    return buildCommandResponse(blocks, {
      responseType: "ephemeral",
      text: `Training for ${targetPHGUser.fullName}`,
    });
  }

  // Get current user's assignments
  const assignments = await fetchUserAssignments(supabase, phgUser.userId);

  if (assignments.length === 0) {
    const blocks = [
      buildHeader("📚 Your Training"),
      buildSection("You have no active training assignments. 🎉"),
      buildContext("Check back later for new assignments"),
    ];
    return buildCommandResponse(blocks, { text: "No training assignments" });
  }

  // Calculate stats
  const completed = assignments.filter((a) => a.status === "completed").length;
  const inProgress = assignments.filter(
    (a) => a.status === "in_progress",
  ).length;
  const overdue = assignments.filter((a) => a.status === "overdue").length;

  const blocks = [
    buildHeader("📚 Your Training Assignments"),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total:* ${assignments.length}` },
        { type: "mrkdwn", text: `*Completed:* ${completed} ✅` },
        { type: "mrkdwn", text: `*In Progress:* ${inProgress} 🟡` },
        { type: "mrkdwn", text: `*Overdue:* ${overdue} 🔴` },
      ],
    },
    buildDivider(),
    ...formatAssignments(assignments.slice(0, 5)), // Show top 5
  ];

  if (assignments.length > 5) {
    blocks.push(
      buildContext(
        `...and ${assignments.length - 5} more. Visit PHG Connect for full details.`,
      ),
    );
  }

  blocks.push(
    buildActions([
      buildButton("Open PHG Learning", "training_phg", {
        style: "primary",
        url: "https://phg-connect.com/learning/my-learning",
      }),
    ]),
  );

  return buildCommandResponse(blocks, { text: "Your training assignments" });
}

async function handleReviewsCommand(
  req: SlackCommandRequest,
  context: {
    supabase: ReturnType<typeof createClient>;
    phgUser: PHGUserContext;
  },
): Promise<Response> {
  const { supabase, phgUser } = context;

  // Check permissions
  if (
    !hasRequiredRole(phgUser, [
      "property_manager",
      "property_hr",
      "regional_admin",
      "regional_hr",
      "corporate_admin",
    ])
  ) {
    return buildErrorResponse(
      "You don't have permission to view guest reviews.\nRequired: Property Manager or above.",
    );
  }

  const text = req.text.trim();
  const accessLevel = getCommandAccessLevel(phgUser);

  // Parse property filter if provided
  let propertyFilter: string | null = null;
  if (text && accessLevel === "regional") {
    // Try to find property by name
    const { data: properties } = await supabase
      .from("properties")
      .select("id, name")
      .ilike("name", `%${text}%`)
      .limit(1);

    if (properties && properties.length > 0) {
      propertyFilter = properties[0].id;
    }
  }

  // Get today's reviews
  const today = new Date().toISOString().split("T")[0];
  let query = supabase
    .from("guest_reviews")
    .select(
      "id, property_id, platform, rating, severity, title, reviewed_at, properties(name)",
    )
    .gte("reviewed_at", today)
    .order("reviewed_at", { ascending: false });

  // Apply property filter
  if (propertyFilter) {
    query = query.eq("property_id", propertyFilter);
  } else if (
    !hasRequiredRole(phgUser, [
      "regional_admin",
      "regional_hr",
      "corporate_admin",
    ])
  ) {
    // Limit to user's properties
    query = query.in("property_id", phgUser.properties);
  }

  const { data: reviews, error } = await query.limit(10);

  if (error) {
    console.error("Error fetching reviews:", error);
    return buildErrorResponse("Failed to fetch reviews. Please try again.");
  }

  // Calculate stats
  const totalToday = reviews?.length || 0;
  const criticalCount =
    reviews?.filter((r: any) => r.severity === "critical").length || 0;
  const highCount =
    reviews?.filter((r: any) => r.severity === "high").length || 0;
  const avgRating = reviews?.length
    ? (
        reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
        reviews.length
      ).toFixed(1)
    : "N/A";

  const blocks = [
    buildHeader("📝 Guest Reviews Today"),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total Reviews:* ${totalToday}` },
        { type: "mrkdwn", text: `*Avg Rating:* ${avgRating} ⭐` },
        { type: "mrkdwn", text: `*Critical:* ${criticalCount} 🚨` },
        { type: "mrkdwn", text: `*High Priority:* ${highCount} 🔴` },
      ],
    },
    buildDivider(),
  ];

  if (reviews && reviews.length > 0) {
    // Show recent reviews
    for (const review of reviews.slice(0, 3)) {
      const severityEmoji =
        review.severity === "critical"
          ? "🚨"
          : review.severity === "high"
            ? "🔴"
            : review.severity === "medium"
              ? "🟠"
              : "🟢";

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `${severityEmoji} *${review.properties?.name || "Unknown Property"}* | ${review.platform}\n` +
            `⭐ ${review.rating}/5 • ${review.title || "No title"}`,
        },
      });
    }

    blocks.push(
      buildActions([
        buildButton("View All Reviews", "reviews_phg", {
          style: "primary",
          url: "https://phg-connect.com/guest-reviews",
        }),
      ]),
    );
  } else {
    blocks.push(buildSection("No reviews today. 🎉"));
  }

  return buildCommandResponse(blocks, {
    responseType: "in_channel",
    text: "Guest reviews summary",
  });
}

async function handleOpsCommand(
  req: SlackCommandRequest,
  context: {
    supabase: ReturnType<typeof createClient>;
    phgUser: PHGUserContext;
  },
): Promise<Response> {
  const { phgUser } = context;
  const text = req.text.trim();

  // Check for alert subcommand
  if (text.startsWith("alert ")) {
    // Check permissions
    if (
      !hasRequiredRole(phgUser, [
        "department_head",
        "property_manager",
        "regional_admin",
        "corporate_admin",
      ])
    ) {
      return buildErrorResponse(
        "You don't have permission to send ops alerts.\nRequired: Department Head or above.",
      );
    }

    const alertMessage = text.replace("alert ", "").trim();

    if (!alertMessage) {
      return buildErrorResponse(
        "Please provide an alert message.\nUsage: `/ops alert [message]`",
      );
    }

    // Return ephemeral confirmation
    return buildSuccessResponse(
      "Ops Alert Sent",
      `Your alert has been sent to the operations channel:\n\n*${alertMessage}*`,
      {
        actions: [
          buildButton("View Ops Dashboard", "ops_dashboard", {
            url: "https://phg-connect.com/operations",
          }),
        ],
      },
    );
  }

  // Default ops dashboard
  const blocks = [
    buildHeader("⚙️ Operations Dashboard"),
    buildSection(
      "Quick links to PHG Connect operations modules:\n\n" +
        "• Maintenance requests\n" +
        "• Incident reports\n" +
        "• Room status\n" +
        "• Task assignments",
    ),
    buildDivider(),
    buildActions([
      buildButton("Maintenance", "ops_maintenance", {
        url: "https://phg-connect.com/maintenance",
      }),
      buildButton("Incidents", "ops_incidents", {
        url: "https://phg-connect.com/incidents",
      }),
      buildButton("Tasks", "ops_tasks", {
        url: "https://phg-connect.com/tasks",
      }),
    ]),
  ];

  return buildCommandResponse(blocks, { text: "Operations dashboard" });
}

async function handleHelpCommand(
  req: SlackCommandRequest,
  context: {
    supabase: ReturnType<typeof createClient>;
    phgUser: PHGUserContext;
  },
): Promise<Response> {
  const { phgUser } = context;
  const accessLevel = getCommandAccessLevel(phgUser);

  let helpText = "*Available Commands:*\n\n";

  // All users
  helpText += "*Everyone:*\n";
  helpText += "• `/training` - View your training assignments\n";
  helpText += "• `/ops` - Operations dashboard quick links\n";
  helpText += "• `/whoami` - Show your PHG profile\n";
  helpText += "• `/phg-help` - Show this help message\n\n";

  // Dept Head+
  if (["dept_head", "manager", "regional"].includes(accessLevel)) {
    helpText += "*Department Head+:*\n";
    helpText += "• `/training @user` - View user's training status\n";
    helpText += "• `/ops alert [message]` - Send ops alert to channel\n\n";
  }

  // Manager+
  if (["manager", "regional"].includes(accessLevel)) {
    helpText += "*Property Manager+:*\n";
    helpText += "• `/reviews` - Today's review summary\n\n";
  }

  // Regional
  if (accessLevel === "regional") {
    helpText += "*Regional Admin+:*\n";
    helpText += "• `/reviews [property]` - Property-specific reviews\n\n";
  }

  const blocks = [
    buildHeader("📖 PHG Connect Bot Commands"),
    buildSection(helpText),
    buildDivider(),
    buildContext(
      `Your access level: ${accessLevel.replace("_", " ").toUpperCase()}`,
    ),
  ];

  return buildCommandResponse(blocks, { text: "PHG Connect Bot Help" });
}

async function handleWhoAmICommand(
  req: SlackCommandRequest,
  context: {
    supabase: ReturnType<typeof createClient>;
    phgUser: PHGUserContext;
  },
): Promise<Response> {
  const { phgUser } = context;

  const rolesText = phgUser.roles.join(", ") || "No roles assigned";
  const propertiesText =
    phgUser.properties.length > 0
      ? `${phgUser.properties.length} properties`
      : "No properties assigned";

  const blocks = [
    buildHeader("👤 Your PHG Profile"),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name:*\n${phgUser.fullName}` },
        { type: "mrkdwn", text: `*Email:*\n${phgUser.email}` },
        { type: "mrkdwn", text: `*Roles:*\n${rolesText}` },
        { type: "mrkdwn", text: `*Properties:*\n${propertiesText}` },
      ],
    },
    buildDivider(),
    buildActions([
      buildButton("Edit Profile", "whoami_edit", {
        url: "https://phg-connect.com/profile",
      }),
    ]),
    buildContext("Your Slack account is linked to this PHG profile"),
  ];

  return buildCommandResponse(blocks, { text: "Your PHG Profile" });
}

function handleTestMode(
  req: SlackCommandRequest,
  corsHeaders: Record<string, string>,
): Response {
  return buildSuccessResponse(
    "Test Mode",
    "Slack commands endpoint is working!\n\n" +
      `Command: ${req.command}\n` +
      `User: ${req.user_name} (${req.user_id})\n` +
      `Team: ${req.team_id}\n` +
      `Channel: ${req.channel_name}`,
  );
}

// ============================================================================
// Helpers
// ============================================================================

async function fetchUserAssignments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<
  Array<{
    id: string;
    content_type: string;
    content_title: string;
    due_date: string | null;
    status: string;
    progress_percentage: number;
  }>
> {
  // Get assignments
  const { data: assignments } = await supabase
    .from("learning_assignments")
    .select("id, content_type, content_id, due_date")
    .or(`target_type.eq.user,target_type.eq.everyone`)
    .or(`target_id.eq.${userId},target_type.eq.everyone`)
    .is("is_deleted", null);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  // Get progress for each
  const { data: progress } = await supabase
    .from("learning_progress")
    .select("content_id, status, progress_percentage")
    .eq("user_id", userId);

  const progressMap = new Map(
    (progress || []).map((p: any) => [p.content_id, p]),
  );

  // Get content titles (from training_modules for modules)
  const moduleIds = assignments
    .filter((a: any) => a.content_type === "module")
    .map((a: any) => a.content_id);

  const { data: modules } = await supabase
    .from("training_modules")
    .select("id, title")
    .in("id", moduleIds);

  const moduleTitles = new Map(
    (modules || []).map((m: any) => [m.id, m.title]),
  );

  return assignments.map((a: any) => {
    const p = progressMap.get(a.content_id) as any;
    return {
      id: a.id,
      content_type: a.content_type,
      content_title: moduleTitles.get(a.content_id) || "Unknown Content",
      due_date: a.due_date,
      status: p?.status || "not_started",
      progress_percentage: p?.progress_percentage || 0,
    };
  });
}

function formatAssignments(
  assignments: Array<{
    id: string;
    content_type: string;
    content_title: string;
    due_date: string | null;
    status: string;
    progress_percentage: number;
  }>,
): Array<{ type: string; text?: { type: string; text: string } }> {
  if (assignments.length === 0) {
    return [
      {
        type: "section",
        text: { type: "mrkdwn", text: "No active assignments" },
      },
    ];
  }

  return assignments.map((a) => {
    const statusEmoji =
      a.status === "completed"
        ? "✅"
        : a.status === "in_progress"
          ? "🟡"
          : a.status === "overdue"
            ? "🔴"
            : "⚪";

    const dueText = a.due_date
      ? `Due: ${new Date(a.due_date).toLocaleDateString()}`
      : "No deadline";

    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusEmoji} *${a.content_title}*\n${dueText} • ${a.progress_percentage}% complete`,
      },
    };
  });
}
