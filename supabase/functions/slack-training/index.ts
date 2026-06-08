/**
 * Slack Training Integration
 *
 * Deep training integration features:
 * - Daily training digest (cron-triggered)
 * - Quiz delivery via Slack
 * - Progress notifications to managers
 * - Training reminders
 *
 * Endpoint: POST /functions/v1/slack-training
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  verifySlackRequest,
  getUserBySlackId,
  getPHGUserContext,
  buildHeader,
  buildSection,
  buildDivider,
  buildContext,
  buildButton,
  buildActions,
  sendSlackBotMessage,
  getSlackIntegration,
  SlackBlock,
} from "../_shared/slack-utils.ts";
import { getVaultSecret } from "../_shared/vault.ts";

// ============================================================================
// Types
// ============================================================================

interface TrainingDigestPayload {
  action: "send_digest" | "send_quiz" | "notify_completion" | "weekly_summary";
  user_id?: string;
  assignment_id?: string;
  test_mode?: boolean;
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

    // Verify authorization (for cron/internal calls)
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = verifyServiceRole(authHeader, serviceRoleKey);

    const body = (await req.json()) as TrainingDigestPayload;

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

    if (!integration?.botToken) {
      return new Response(JSON.stringify({ error: "Slack not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to action handler
    switch (body.action) {
      case "send_digest":
        return await sendDailyDigest(
          supabase,
          integration.botToken,
          corsHeaders,
        );

      case "send_quiz":
        if (!body.user_id || !body.assignment_id) {
          return new Response(
            JSON.stringify({ error: "Missing user_id or assignment_id" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        return await sendQuiz(
          supabase,
          integration.botToken,
          body.user_id,
          body.assignment_id,
          corsHeaders,
        );

      case "notify_completion":
        if (!body.user_id || !body.assignment_id) {
          return new Response(
            JSON.stringify({ error: "Missing user_id or assignment_id" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        return await notifyCompletion(
          supabase,
          integration.botToken,
          body.user_id,
          body.assignment_id,
          corsHeaders,
        );

      case "weekly_summary":
        return await sendWeeklySummary(
          supabase,
          integration.botToken,
          corsHeaders,
        );

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("slack-training error:", error);
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
// Daily Digest
// ============================================================================

async function sendDailyDigest(
  supabase: ReturnType<typeof createClient>,
  botToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find all active assignments due within 3 days
  const { data: upcomingAssignments, error } = await supabase
    .from("learning_assignments")
    .select(
      `
      id,
      content_id,
      content_type,
      due_date,
      target_type,
      target_id
    `,
    )
    .lte("due_date", threeDaysFromNow.toISOString())
    .gte("due_date", now.toISOString())
    .or("is_deleted.is.null,is_deleted.eq.false");

  if (error) {
    console.error("Error fetching assignments:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch assignments" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Get module titles
  const moduleIds = [
    ...new Set(
      (upcomingAssignments || [])
        .filter((a) => a.content_type === "module")
        .map((a) => a.content_id),
    ),
  ];

  const { data: modules } = await supabase
    .from("training_modules")
    .select("id, title")
    .in("id", moduleIds);

  const moduleTitles = new Map((modules || []).map((m) => [m.id, m.title]));

  // Track results
  const results: Array<{ userId: string; success: boolean }> = [];

  // Process each assignment
  for (const assignment of upcomingAssignments || []) {
    // Resolve targets to users
    const targetUsers = await resolveAssignmentTargets(
      supabase,
      assignment.target_type,
      assignment.target_id,
    );

    for (const user of targetUsers) {
      // Check if already completed
      const { data: progress } = await supabase
        .from("learning_progress")
        .select("status")
        .eq("user_id", user.id)
        .eq("content_type", assignment.content_type)
        .eq("content_id", assignment.content_id)
        .maybeSingle();

      if (progress?.status === "completed") continue;

      // Get Slack mapping
      const { data: slackMapping } = await supabase
        .from("slack_user_mappings")
        .select("slack_user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!slackMapping) continue;

      // Calculate urgency
      const dueDate = new Date(assignment.due_date);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Build personalized digest
      const title =
        moduleTitles.get(assignment.content_id) || "Training Module";
      const blocks = buildDigestBlocks(
        title,
        daysUntilDue,
        assignment.id,
        assignment.content_id,
      );

      // Send DM
      const result = await sendSlackBotMessage(
        botToken,
        slackMapping.slack_user_id,
        {
          blocks,
          text: `Training reminder: ${title} due in ${daysUntilDue} days`,
        },
      );

      results.push({ userId: user.id, success: result.success });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return new Response(
    JSON.stringify({
      success: true,
      digest_sent: successCount,
      total_assignments: upcomingAssignments?.length || 0,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function buildDigestBlocks(
  title: string,
  daysUntilDue: number,
  assignmentId: string,
  contentId: string,
): SlackBlock[] {
  const urgencyEmoji =
    daysUntilDue <= 1 ? "🚨" : daysUntilDue <= 2 ? "⚠️" : "📚";
  const urgencyText =
    daysUntilDue === 0
      ? "*Due today!*"
      : daysUntilDue === 1
        ? "*Due tomorrow!*"
        : `Due in ${daysUntilDue} days`;

  return [
    buildHeader(`${urgencyEmoji} Training Reminder`),
    buildSection(`*${title}*\n${urgencyText}`),
    buildDivider(),
    buildActions([
      buildButton("Start Now", `training_start_${assignmentId}`, {
        style: "primary",
      }),
      buildButton("View Details", `training_view_${assignmentId}`),
    ]),
    buildContext("Complete your training to stay compliant with PHG standards"),
  ];
}

// ============================================================================
// Quiz Delivery
// ============================================================================

async function sendQuiz(
  supabase: ReturnType<typeof createClient>,
  botToken: string,
  userId: string,
  assignmentId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get assignment and quiz details
  const { data: assignment } = await supabase
    .from("learning_assignments")
    .select("content_id")
    .eq("id", assignmentId)
    .single();

  if (!assignment) {
    return new Response(JSON.stringify({ error: "Assignment not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get quiz questions
  const { data: quizQuestions } = await supabase
    .from("learning_quiz_questions")
    .select(
      `
      id,
      question:questions(
        id,
        question_text_en,
        question_text_ar,
        options,
        correct_answer_index
      )
    `,
    )
    .eq("quiz_id", assignment.content_id)
    .order("display_order")
    .limit(1);

  if (!quizQuestions || quizQuestions.length === 0) {
    return new Response(JSON.stringify({ error: "No quiz questions found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get Slack mapping
  const { data: slackMapping } = await supabase
    .from("slack_user_mappings")
    .select("slack_user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!slackMapping) {
    return new Response(JSON.stringify({ error: "User not linked to Slack" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build quiz question blocks
  const question = quizQuestions[0].question as Record<string, unknown>;
  const options = (question.options as string[]) || [];

  const blocks: SlackBlock[] = [
    buildHeader("📝 Quiz Question"),
    buildSection(question.question_text_en as string),
    buildDivider(),
  ];

  // Add options as buttons
  const optionButtons = options.map((opt, idx) =>
    buildButton(opt, `quiz_answer_${quizQuestions[0].id}_${idx}`, {
      value: String(idx),
    }),
  );

  blocks.push(buildActions(optionButtons));

  // Send quiz
  const result = await sendSlackBotMessage(
    botToken,
    slackMapping.slack_user_id,
    {
      blocks,
      text: "Quiz question from PHG Connect",
    },
  );

  return new Response(
    JSON.stringify({
      success: result.success,
      error: result.error,
    }),
    {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Completion Notification
// ============================================================================

async function notifyCompletion(
  supabase: ReturnType<typeof createClient>,
  botToken: string,
  userId: string,
  assignmentId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get user details
  const { data: user } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  // Get assignment details
  const { data: assignment } = await supabase
    .from("learning_assignments")
    .select("content_id, content_type")
    .eq("id", assignmentId)
    .single();

  let contentTitle = "Training Module";
  if (assignment?.content_type === "module") {
    const { data: module } = await supabase
      .from("training_modules")
      .select("title")
      .eq("id", assignment.content_id)
      .single();
    if (module) contentTitle = module.title;
  }

  // Find user's manager (dept head or property manager)
  const { data: userDepts } = await supabase
    .from("user_departments")
    .select("department_id")
    .eq("user_id", userId);

  const departmentIds = userDepts?.map((d) => d.department_id) || [];

  // Get department heads
  const { data: managers } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["department_head", "property_manager"])
    .limit(5);

  const notificationsSent = [];

  for (const manager of managers || []) {
    // Get Slack mapping for manager
    const { data: managerSlack } = await supabase
      .from("slack_user_mappings")
      .select("slack_user_id")
      .eq("user_id", manager.user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!managerSlack) continue;

    // Send notification
    const blocks = [
      buildHeader("✅ Training Completed"),
      buildSection(
        `*${user?.full_name || "A team member"}* has completed *${contentTitle}*.`,
      ),
      buildActions([
        buildButton("View Progress", `training_progress_${userId}`),
      ]),
    ];

    const result = await sendSlackBotMessage(
      botToken,
      managerSlack.slack_user_id,
      {
        blocks,
        text: `${user?.full_name} completed ${contentTitle}`,
      },
    );

    notificationsSent.push({
      managerId: manager.user_id,
      success: result.success,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      notifications_sent: notificationsSent.filter((n) => n.success).length,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================================================
// Weekly Summary
// ============================================================================

async function sendWeeklySummary(
  supabase: ReturnType<typeof createClient>,
  botToken: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Get training-hub channel
  const { data: integration } = await supabase
    .from("slack_integrations")
    .select("channel_mappings")
    .maybeSingle();

  const channelMappings =
    (integration?.channel_mappings as Record<string, string>) || {};
  const trainingChannel = channelMappings["training-hub"];

  if (!trainingChannel) {
    return new Response(
      JSON.stringify({ error: "Training channel not configured" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Calculate stats for the week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: completions } = await supabase
    .from("learning_progress")
    .select("id", { count: "exact" })
    .eq("status", "completed")
    .gte("completed_at", weekAgo.toISOString());

  const { data: overdue } = await supabase
    .from("learning_assignments")
    .select("id", { count: "exact" })
    .lt("due_date", new Date().toISOString())
    .or("is_deleted.is.null,is_deleted.eq.false");

  // Build summary
  const blocks = [
    buildHeader("📊 Weekly Training Summary"),
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Completions:*\n${completions?.length || 0} ✅`,
        },
        { type: "mrkdwn", text: `*Overdue:*\n${overdue?.length || 0} 🔴` },
      ],
    },
    buildDivider(),
    buildActions([
      buildButton("View Dashboard", "training_dashboard", {
        url: "https://phg-connect.com/learning/dashboard",
      }),
    ]),
  ];

  const result = await sendSlackBotMessage(botToken, trainingChannel, {
    blocks,
    text: "Weekly training summary from PHG Connect",
  });

  return new Response(
    JSON.stringify({
      success: result.success,
      error: result.error,
    }),
    {
      status: result.success ? 200 : 500,
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

async function resolveAssignmentTargets(
  supabase: ReturnType<typeof createClient>,
  targetType: string,
  targetId: string | null,
): Promise<Array<{ id: string; email: string; full_name: string | null }>> {
  switch (targetType) {
    case "everyone": {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("is_active", true);
      return data || [];
    }

    case "user": {
      if (!targetId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", targetId)
        .maybeSingle();
      return data ? [data] : [];
    }

    case "department": {
      if (!targetId) return [];
      const { data } = await supabase
        .from("user_departments")
        .select("profiles(id, email, full_name)")
        .eq("department_id", targetId);
      return (data || []).map((d: any) => d.profiles).filter(Boolean);
    }

    case "property": {
      if (!targetId) return [];
      const { data } = await supabase
        .from("user_properties")
        .select("profiles(id, email, full_name)")
        .eq("property_id", targetId);
      return (data || []).map((d: any) => d.profiles).filter(Boolean);
    }

    case "role": {
      if (!targetId) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("profiles(id, email, full_name)")
        .eq("role", targetId);
      return (data || []).map((d: any) => d.profiles).filter(Boolean);
    }

    default:
      return [];
  }
}

function handleTestMode(
  body: TrainingDigestPayload,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      test: true,
      message: "Slack training endpoint is reachable",
      action: body.action,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
