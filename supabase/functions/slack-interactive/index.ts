/**
 * Slack Interactive Handler
 *
 * Handles button clicks, modal submissions, select menus:
 * - training_start_[module_id] - Launch training
 * - training_remind_[user_id] - Send reminder
 * - training_complete_[assignment_id] - Mark complete
 * - review_ack_[review_id] - Acknowledge review alert
 * - review_escalate_[review_id] - Escalate to manager
 * - review_assign_[review_id] - Assign owner
 * - ops_ack_[alert_id] - Acknowledge ops alert
 * - ops_status_[ticket_id] - Update ticket status
 *
 * Endpoint: POST /functions/v1/slack-interactive
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  verifySlackRequest,
  getUserBySlackId,
  getPHGUserContext,
  hasRequiredRole,
  PHGUserContext,
  buildHeader,
  buildSection,
  buildDivider,
  buildContext,
  buildButton,
  buildActions,
  buildCommandResponse,
  buildErrorResponse,
  sendSlackBotMessage,
  openSlackModal,
} from "../_shared/slack-utils.ts";
import { getVaultSecret } from "../_shared/vault.ts";

// ============================================================================
// Types
// ============================================================================

interface SlackInteractionPayload {
  type: string;
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  message?: {
    ts: string;
    thread_ts?: string;
  };
  actions?: Array<{
    action_id: string;
    block_id: string;
    value?: string;
    selected_option?: { value: string };
  }>;
  view?: Record<string, unknown>;
  trigger_id?: string;
  response_url?: string;
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

    // Read body once for both verification and parsing
    const rawBody = await req.text();

    // Verify Slack signature
    const signingSecret = await getVaultSecret(
      supabase,
      "SLACK_SIGNING_SECRET",
    );
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
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse payload (Slack sends form data with "payload" field)
    const params = new URLSearchParams(rawBody);
    const payloadJson = params.get("payload");

    if (!payloadJson) {
      return new Response(JSON.stringify({ error: "Missing payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(payloadJson) as SlackInteractionPayload;

    // Handle test mode
    if (payload.type === "test") {
      return handleTestMode(corsHeaders);
    }

    // Get user mapping
    let mapping = await getUserBySlackId(
      supabase,
      payload.user.id,
      payload.user.team_id,
    );

    // Attempt seamless auto-linking if mapping not found (FDW usage)
    if (!mapping) {
      console.log(`No mapping found. Attempting auto-link for ${payload.user.id}`);
      try {
        const { data: slackInfoArray } = await supabase
          .from("slack_users")
          .select("*")
          .eq("id", payload.user.id);

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
                slack_user_id: payload.user.id,
                slack_team_id: payload.user.team_id,
                slack_email: slackData.email,
                slack_username: slackData.name,
                is_active: true,
              })
              .select()
              .single();

            if (newMapping) {
              console.log(`Auto-linked ${payload.user.id} to profile ${profile.id} via FDW bit`);
              mapping = newMapping as any;
            }
          }
        }
      } catch (err) {
        console.error("Auto-link in interactive failed:", err);
      }
    }

    if (!mapping) {
      return new Response(
        JSON.stringify({
          replace_original: false,
          text: "⚠️ Your Slack account is not linked to PHG Connect. Please ensure your Slack email matches your PHG profile.",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const phgUser = await getPHGUserContext(supabase, mapping.user_id);
    if (!phgUser) {
      return buildErrorResponse(
        "Could not load your PHG profile. Please contact support.",
      );
    }

    if (!phgUser) {
      return new Response(
        JSON.stringify({
          text: "Could not load your PHG profile.",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Log interaction
    await logInteraction(supabase, payload, phgUser.userId);

    // Route based on interaction type
    switch (payload.type) {
      case "block_actions":
        return await handleBlockActions(
          payload,
          supabase,
          phgUser,
          corsHeaders,
        );

      case "view_submission":
        return await handleViewSubmission(
          payload,
          supabase,
          phgUser,
          corsHeaders,
        );

      default:
        return new Response(
          JSON.stringify({ error: "Unknown interaction type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (error) {
    console.error("slack-interactive error:", error);
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
// Block Actions Handler
// ============================================================================

async function handleBlockActions(
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const action = payload.actions?.[0];

  if (!action) {
    return new Response(JSON.stringify({ error: "No action found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const actionId = action.action_id;

  // Training actions
  if (actionId.startsWith("training_")) {
    return await handleTrainingAction(
      actionId,
      payload,
      supabase,
      phgUser,
      corsHeaders,
    );
  }

  // Review actions
  if (actionId.startsWith("review_")) {
    return await handleReviewAction(
      actionId,
      payload,
      supabase,
      phgUser,
      corsHeaders,
    );
  }

  // Ops actions
  if (actionId.startsWith("ops_")) {
    return await handleOpsAction(
      actionId,
      payload,
      supabase,
      phgUser,
      corsHeaders,
    );
  }

  // Welcome/home actions
  if (actionId.startsWith("welcome_") || actionId.startsWith("dm_")) {
    return await handleWelcomeAction(
      actionId,
      payload,
      supabase,
      phgUser,
      corsHeaders,
    );
  }

  // Default response
  return new Response(
    JSON.stringify({ text: "Action received", response_type: "ephemeral" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleTrainingAction(
  actionId: string,
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const parts = actionId.split("_");
  const action = parts[1]; // start, view, remind
  const id = parts[2];

  switch (action) {
    case "start":
      // Update progress to in_progress
      await supabase.from("learning_progress").upsert(
        {
          user_id: phgUser.userId,
          content_type: "module",
          content_id: id,
          status: "in_progress",
          progress_percentage: 0,
          last_accessed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,content_type,content_id",
        },
      );

      return new Response(
        JSON.stringify({
          text: "✅ Training started! Opening PHG Connect...",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    case "view":
      return new Response(
        JSON.stringify({
          text: "Opening training details in PHG Connect...",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    case "remind":
      // Check permissions
      if (
        !hasRequiredRole(phgUser, [
          "department_head",
          "property_manager",
          "regional_admin",
          "corporate_admin",
        ])
      ) {
        return new Response(
          JSON.stringify({
            text: "❌ You don't have permission to send reminders.",
            response_type: "ephemeral",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: id,
        type: "training_deadline",
        title: "Training Reminder",
        message: "Your manager sent you a training reminder.",
        link: "/learning/my-learning",
      });

      return new Response(
        JSON.stringify({
          text: "✅ Reminder sent successfully!",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    default:
      return new Response(
        JSON.stringify({
          text: "Unknown training action",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
  }
}

async function handleReviewAction(
  actionId: string,
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const parts = actionId.split("_");
  const action = parts[1]; // ack, escalate, view, assign
  const reviewId = parts[2];

  // Check permissions
  if (
    !hasRequiredRole(phgUser, [
      "property_manager",
      "regional_admin",
      "corporate_admin",
    ])
  ) {
    return new Response(
      JSON.stringify({
        text: "❌ You don't have permission to manage reviews.",
        response_type: "ephemeral",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  switch (action) {
    case "ack":
      // Check if review is already acknowledged
      const { data: existingReview } = await supabase
        .from("guest_reviews")
        .select("status, acknowledged_at")
        .eq("id", reviewId)
        .single();

      if (existingReview?.status === "acknowledged") {
        return new Response(
          JSON.stringify({
            replace_original: false,
            text: "✅ This review has already been acknowledged.",
            response_type: "ephemeral",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update review status
      await supabase
        .from("guest_reviews")
        .update({
          status: "acknowledged",
          acknowledged_by: phgUser.userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      // Log activity
      await supabase.from("guest_review_activity").insert({
        review_id: reviewId,
        user_id: phgUser.userId,
        activity_type: "acknowledged",
        description: "Review acknowledged via Slack notification button"
      });

      return new Response(
        JSON.stringify({
          replace_original: false, // Don't replace original alert so others can see it
          text: `✅ Review acknowledged by ${phgUser.fullName}`,
          response_type: "in_channel",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    case "escalate":
      // Update review status
      await supabase
        .from("guest_reviews")
        .update({
          status: "escalated",
          escalation_level: 2,
          escalated_by: phgUser.userId,
          escalated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      // Log activity
      await supabase.from("guest_review_activity").insert({
        review_id: reviewId,
        user_id: phgUser.userId,
        activity_type: "escalated",
        description: "Review escalated via Slack notification button"
      });

      return new Response(
        JSON.stringify({
          replace_original: false,
          text: `🚨 Review escalated to high priority by ${phgUser.fullName}`,
          response_type: "in_channel",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    case "view":
      return new Response(
        JSON.stringify({
          text: "Opening review in PHG Connect...",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    default:
      return new Response(
        JSON.stringify({
          text: "Unknown review action",
          response_type: "ephemeral",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
  }
}

async function handleOpsAction(
  actionId: string,
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Simple acknowledgment for now
  return new Response(
    JSON.stringify({
      text: "✅ Action processed!",
      response_type: "ephemeral",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleWelcomeAction(
  actionId: string,
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const botToken = await getVaultSecret(supabase, "SLACK_BOT_TOKEN");
  const channelId = payload.channel?.id;

  if (actionId === "welcome_training" || actionId === "dm_training") {
    // Get user's training
    const { data: assignments } = await supabase
      .from("learning_assignments")
      .select("content_id, due_date")
      .or(`target_type.eq.user,target_type.eq.everyone`)
      .or(`target_id.eq.${phgUser.userId},target_type.eq.everyone`)
      .limit(3);

    const blocks = [
      buildHeader("📚 Your Training"),
      ...(assignments && assignments.length > 0
        ? assignments.map((a) => ({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `• Module due ${a.due_date ? new Date(a.due_date).toLocaleDateString() : "soon"}`,
            },
          }))
        : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "No active training assignments! 🎉",
              },
            },
          ]),
      buildActions([
        buildButton("Go to Learning", "training_phg", {
          url: "https://www.altus-advisory.com/learning/my-learning",
        }),
      ]),
    ];

    if (botToken && channelId) {
      await sendSlackBotMessage(botToken, channelId, { blocks });
    }

    return new Response(
      JSON.stringify({
        text: "Training info sent!",
        response_type: "ephemeral",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ text: "Action processed", response_type: "ephemeral" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// View Submission Handler (Modals)
// ============================================================================

async function handleViewSubmission(
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const view = payload.view;
  const callbackId = view?.callback_id as string;

  // Handle different modal submissions
  switch (callbackId) {
    case "training_assignment_modal":
      return await handleTrainingAssignmentModal(
        payload,
        supabase,
        phgUser,
        corsHeaders,
      );

    case "review_response_modal":
      return await handleReviewResponseModal(
        payload,
        supabase,
        phgUser,
        corsHeaders,
      );

    default:
      return new Response(JSON.stringify({ response_action: "clear" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
}

async function handleTrainingAssignmentModal(
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Check permissions
  if (
    !hasRequiredRole(phgUser, [
      "department_head",
      "property_manager",
      "regional_admin",
      "corporate_admin",
    ])
  ) {
    return new Response(
      JSON.stringify({
        response_action: "errors",
        errors: { "": "You don't have permission to assign training" },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Close modal
  return new Response(JSON.stringify({ response_action: "clear" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleReviewResponseModal(
  payload: SlackInteractionPayload,
  supabase: ReturnType<typeof createClient>,
  phgUser: PHGUserContext,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Close modal
  return new Response(JSON.stringify({ response_action: "clear" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// Helpers
// ============================================================================

async function logInteraction(
  supabase: ReturnType<typeof createClient>,
  payload: SlackInteractionPayload,
  phgUserId: string,
): Promise<void> {
  const action = payload.actions?.[0];

  await supabase.from("slack_interactions").insert({
    slack_user_id: payload.user.id,
    slack_team_id: payload.user.team_id,
    action_id: action?.action_id || "unknown",
    action_type: payload.type === "block_actions" ? "button" : "modal",
    channel_id: payload.channel?.id,
    message_ts: payload.message?.ts,
    payload: { actions: payload.actions, view: payload.view },
    phg_user_id: phgUserId,
    processed: true,
    processed_at: new Date().toISOString(),
  });
}

function handleTestMode(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      text: "✅ Slack interactive endpoint is working!",
      response_type: "ephemeral",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
