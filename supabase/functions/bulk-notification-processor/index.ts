import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://www.altus-advisory.com",
  "https://www.altus-advisory.com",
  "https://prime-hotels-intranet.vercel.app",
] as const;

function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (!origin) return DEFAULT_ALLOWED_ORIGINS[0];

  const cleanOrigin = origin.trim().replace(/\/$/, "");
  const isAllowed = DEFAULT_ALLOWED_ORIGINS.some(
    (allowed) => allowed.replace(/\/$/, "") === cleanOrigin,
  );

  return isAllowed ? origin : DEFAULT_ALLOWED_ORIGINS[0];
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

const ENV_RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ENV_APP_BASE_URL = (
  Deno.env.get("APP_BASE_URL") ?? "https://www.altus-advisory.com"
).replace(/\/+$/, "");
const ENV_DEFAULT_FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "Altus Hospitality";
const ENV_DEFAULT_FROM_EMAIL =
  Deno.env.get("EMAIL_FROM_ADDRESS") ?? "notifications@phg-connect.com";
const RESEND_MIN_INTERVAL_MS = 550;
const RESEND_MAX_RETRIES = 3;
const RESEND_RETRY_BASE_MS = 750;
let resendLastRequestAt = 0;

type NotificationChannel = "in_app" | "email";
type NotificationDomain =
  | "system"
  | "user_management"
  | "operations"
  | "hr"
  | "learning"
  | "finance"
  | "sales"
  | "management";

interface NotificationData {
  title?: string;
  message?: string;
  link?: string;
  moduleId?: string;
  announcement_id?: string;
  entityId?: string;
  entityType?: string;
  templateKey?: string;
  businessDomain?: string;
  send_email?: boolean;
  priority?: "low" | "normal" | "high" | "critical";
  amount?: string | number;
  stage?: string;
  period?: string;
  variables?: Record<string, unknown>;
  [key: string]: unknown;
}

interface NotificationRequest {
  action: "create_batch" | "process_batch" | "get_status";
  userIds?: string[];
  notificationType?: string;
  notificationData?: NotificationData;
  batchId?: string;
  batchSize?: number;
  channels?: NotificationChannel[];
  templateKey?: string;
  businessDomain?: NotificationDomain | string;
  sendEmail?: boolean;
  priority?: "low" | "normal" | "high" | "critical";
  scheduledFor?: string;
  all?: boolean;
  propertyId?: string;
  departmentId?: string;
  emailSubject?: string;
  emailHtml?: string;
}

interface NotificationBatchRow {
  id: string;
  job_type: string;
  total_count: number;
  processed_count: number;
  failed_count: number;
  email_sent_count?: number;
  email_failed_count?: number;
  status: "pending" | "processing" | "completed" | "failed";
}

interface NotificationQueueRow {
  id: string;
  batch_id: string;
  user_id: string;
  notification_type: string;
  notification_data: NotificationData;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  max_attempts: number;
  channels?: NotificationChannel[];
  template_key?: string | null;
  business_domain?: string | null;
  email_subject?: string | null;
  email_html_override?: string | null;
  email_payload?: Record<string, unknown>;
  send_email?: boolean;
  scheduled_for?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
  created_at: string;
}

interface NotificationTemplateRow {
  template_key: string;
  business_domain: string;
  notification_type: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  from_name: string;
  from_email: string;
}

interface RuntimeConfig {
  resendApiKey: string;
  appBaseUrl: string;
  fromName: string;
  fromEmail: string;
}

const allowedRoles = [
  "corporate_admin",
  "regional_admin",
  "property_manager",
  "department_head",
  "property_hr",
  "regional_hr",
];
const supportedDomains: NotificationDomain[] = [
  "system",
  "user_management",
  "operations",
  "hr",
  "learning",
  "finance",
  "sales",
  "management",
];

const knownNotificationTypes = new Set<string>([
  "approval_required",
  "request_approved",
  "request_rejected",
  "training_assigned",
  "training_deadline",
  "document_published",
  "document_acknowledgment_required",
  "announcement_new",
  "escalation_alert",
  "referral_status_update",
  "maintenance_assigned",
  "maintenance_resolved",
  "request_submitted",
  "comment_added",
  "request_returned",
  "request_closed",
  "training_completed",
  "training_overdue",
  "promotion_approved",
  "transfer_approved",
  "maintenance_updated",
  "message_received",
  "mention",
  "task_assigned",
  "task_due_soon",
  "task_overdue",
  "task_completed",
  "document_approved",
  "document_rejected",
  "document_review_pending",
  "trigger_notification",
  "sop_assigned",
  "sop_quiz_required",
  "sop_quiz_passed",
  "sop_quiz_failed",
  "system",
]);

const defaultTemplates: Record<string, NotificationTemplateRow> = {
  user_management_welcome: {
    template_key: "user_management_welcome",
    business_domain: "user_management",
    notification_type: "system",
    subject_template: "Welcome to Altus Connect - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>Hello {{recipient_name}},</p><p>{{message}}</p><p><a href="{{action_url}}">Open Altus Connect</a></p><p>altus-advisory.com</p>',
    text_template: "Welcome | {{title}}\n\n{{message}}\n\n{{action_url}}",
    from_name: "Altus Team",
    from_email: "notifications@altus-advisory.com",
  },
  operations_incident_alert: {
    template_key: "operations_incident_alert",
    business_domain: "operations",
    notification_type: "escalation_alert",
    subject_template: "Operations Alert - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p>Priority: {{priority}}</p><p><a href="{{action_url}}">Review Incident</a></p>',
    text_template:
      "Operations Alert | {{title}}\n\n{{message}}\nPriority: {{priority}}\n\n{{action_url}}",
    from_name: "Altus Operations",
    from_email: "notifications@altus-advisory.com",
  },
  hr_employee_update: {
    template_key: "hr_employee_update",
    business_domain: "hr",
    notification_type: "request_approved",
    subject_template: "HR Update - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p><a href="{{action_url}}">View HR Workflow</a></p>',
    text_template: "HR Update | {{title}}\n\n{{message}}\n\n{{action_url}}",
    from_name: "Altus HR",
    from_email: "notifications@altus-advisory.com",
  },
  finance_approval_alert: {
    template_key: "finance_approval_alert",
    business_domain: "finance",
    notification_type: "approval_required",
    subject_template: "Finance Approval Required - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p>Amount: {{amount}}</p><p><a href="{{action_url}}">Review Approval</a></p>',
    text_template:
      "Finance Approval Required | {{title}}\n\n{{message}}\nAmount: {{amount}}\n\n{{action_url}}",
    from_name: "Altus Finance",
    from_email: "notifications@altus-advisory.com",
  },
  sales_pipeline_alert: {
    template_key: "sales_pipeline_alert",
    business_domain: "sales",
    notification_type: "system",
    subject_template: "Sales Alert - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p>Opportunity Stage: {{stage}}</p><p><a href="{{action_url}}">Open Sales Dashboard</a></p>',
    text_template:
      "Sales Alert | {{title}}\n\n{{message}}\nStage: {{stage}}\n\n{{action_url}}",
    from_name: "Altus Sales",
    from_email: "notifications@altus-advisory.com",
  },
  management_kpi_alert: {
    template_key: "management_kpi_alert",
    business_domain: "management",
    notification_type: "system",
    subject_template: "Management KPI Alert - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p>Reporting Window: {{period}}</p><p><a href="{{action_url}}">Open Executive Dashboard</a></p>',
    text_template:
      "Management KPI Alert | {{title}}\n\n{{message}}\nWindow: {{period}}\n\n{{action_url}}",
    from_name: "Altus Management",
    from_email: "notifications@altus-advisory.com",
  },
  system_generic_alert: {
    template_key: "system_generic_alert",
    business_domain: "system",
    notification_type: "system",
    subject_template: "Altus Connect Notification - {{title}}",
    html_template:
      '<h1>{{title}}</h1><p>{{message}}</p><p><a href="{{action_url}}">Open Altus Connect</a></p>',
    text_template:
      "Altus Connect Notification | {{title}}\n\n{{message}}\n\n{{action_url}}",
    from_name: "Altus Connect",
    from_email: "notifications@altus-advisory.com",
  },
};

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Missing Authorization header" },
        401,
        corsHeaders,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse(
        { error: "Missing required Supabase environment variables" },
        500,
        corsHeaders,
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      return jsonResponse(
        { error: "Failed to validate user role" },
        500,
        corsHeaders,
      );
    }

    const hasPermission = (userRoles ?? []).some((roleRow: { role: string }) =>
      allowedRoles.includes(roleRow.role),
    );
    if (!hasPermission) {
      return jsonResponse(
        {
          error:
            "Unauthorized: insufficient permissions for bulk notification processing",
        },
        403,
        corsHeaders,
      );
    }

    const runtimeConfig = await loadRuntimeConfig(supabase);
    if (!runtimeConfig.resendApiKey) {
      return jsonResponse(
        { error: "Missing RESEND_API_KEY" },
        500,
        corsHeaders,
      );
    }

    const body = (await req.json()) as NotificationRequest;
    const {
      action,
      userIds,
      notificationType,
      notificationData,
      batchId,
      batchSize = 50,
      emailSubject,
      emailHtml,
    } = body;

    if (action === "create_batch") {
      let targetUserIds = userIds || [];

      if (body.all) {
        // Fetch all active profile IDs
        const { data: allProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_active", true);

        if (profilesError) {
          return jsonResponse(
            {
              error: "Failed to fetch all profiles",
              details: profilesError.message,
            },
            500,
            corsHeaders,
          );
        }
        targetUserIds = (allProfiles || []).map((p) => p.id);
      } else if (body.propertyId) {
        // Fetch profiles assigned to this property
        const { data: propertyUsers, error: propertyError } = await supabase
          .from("user_properties")
          .select("user_id")
          .eq("property_id", body.propertyId);

        if (propertyError) {
          return jsonResponse(
            {
              error: "Failed to fetch property users",
              details: propertyError.message,
            },
            500,
            corsHeaders,
          );
        }
        targetUserIds = (propertyUsers || []).map((p) => p.user_id);
      } else if (body.departmentId) {
        // Fetch profiles assigned to this department
        const { data: deptUsers, error: deptError } = await supabase
          .from("user_departments")
          .select("user_id")
          .eq("department_id", body.departmentId);

        if (deptError) {
          return jsonResponse(
            {
              error: "Failed to fetch department users",
              details: deptError.message,
            },
            500,
            corsHeaders,
          );
        }
        targetUserIds = (deptUsers || []).map((p) => p.user_id);
      }

      if (targetUserIds.length === 0) {
        return jsonResponse(
          { error: "userIds required (or target 'all' with active users)" },
          400,
          corsHeaders,
        );
      }

      const dedupedUserIds = [...new Set(targetUserIds)];
      const normalizedDomain = normalizeDomain(
        body.businessDomain || notificationData?.businessDomain,
        notificationType,
      );
      const normalizedType = normalizeNotificationType(
        notificationType ?? "system",
      );
      const normalizedChannels = normalizeChannels(
        body.channels,
        body.sendEmail ?? notificationData?.send_email,
      );
      const resolvedTemplateKey = resolveTemplateKey(
        body.templateKey ?? notificationData?.templateKey,
        normalizedDomain,
        normalizedType,
      );
      const normalizedPriority = normalizePriority(
        body.priority ?? notificationData?.priority,
      );
      const scheduledFor = body.scheduledFor ?? null;

      const { data: batch, error: batchError } = await supabase
        .from("notification_batches")
        .insert({
          job_type: normalizedType,
          total_count: dedupedUserIds.length,
          status: "pending",
          metadata: {
            ...(notificationData ?? {}),
            businessDomain: normalizedDomain,
            templateKey: resolvedTemplateKey,
            channels: normalizedChannels,
            scheduledFor,
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (batchError || !batch) {
        return jsonResponse(
          {
            error: "Failed to create notification batch",
            details: batchError?.message,
          },
          500,
          corsHeaders,
        );
      }

      const chunkSize = 100;
      for (let i = 0; i < dedupedUserIds.length; i += chunkSize) {
        const chunk = dedupedUserIds.slice(i, i + chunkSize);
        const queueItems = chunk.map((targetUserId) => ({
          batch_id: batch.id,
          user_id: targetUserId,
          notification_type: normalizedType,
          notification_data: notificationData ?? {},
          channels: normalizedChannels,
          template_key: resolvedTemplateKey,
          business_domain: normalizedDomain,
          email_payload: notificationData ?? {},
          email_subject: emailSubject || undefined,
          email_html_override: emailHtml || undefined,
          send_email: normalizedChannels.includes("email"),
          priority: normalizedPriority,
          scheduled_for: scheduledFor,
        }));

        const { error: queueError } = await supabase
          .from("notification_queue")
          .insert(queueItems);
        if (queueError) {
          return jsonResponse(
            {
              error: "Failed to enqueue notification batch",
              details: queueError.message,
            },
            500,
            corsHeaders,
          );
        }
      }

      const processResult = await processNotifications(
        supabase,
        batch.id,
        batchSize,
        runtimeConfig,
      );
      return jsonResponse(
        {
          success: true,
          batchId: batch.id,
          totalQueued: dedupedUserIds.length,
          processed: processResult.processed,
          remaining: processResult.remaining,
          failed: processResult.failed,
          emailSent: processResult.emailSent,
          emailFailed: processResult.emailFailed,
        },
        200,
        corsHeaders,
      );
    }

    if (action === "process_batch") {
      const result = await processNotifications(
        supabase,
        batchId,
        batchSize,
        runtimeConfig,
      );
      return jsonResponse(result, 200, corsHeaders);
    }

    if (action === "get_status") {
      if (!batchId) {
        return jsonResponse({ error: "batchId required" }, 400, corsHeaders);
      }

      const { data: batch, error: batchError } = await supabase
        .from("notification_batches")
        .select("*")
        .eq("id", batchId)
        .single();

      if (batchError || !batch) {
        return jsonResponse(
          { error: "Batch not found", details: batchError?.message },
          404,
          corsHeaders,
        );
      }

      const { count: pendingCount } = await supabase
        .from("notification_queue")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batchId)
        .eq("status", "pending");

      const [
        { count: emailSentCount },
        { count: emailFailedCount },
        { count: emailQueuedCount },
      ] = await Promise.all([
        supabase
          .from("notification_delivery_events")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "sent"),
        supabase
          .from("notification_delivery_events")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "failed"),
        supabase
          .from("notification_delivery_events")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "queued"),
      ]);

      return jsonResponse(
        {
          ...(batch as NotificationBatchRow),
          pending_count: pendingCount ?? 0,
          email_sent: emailSentCount ?? 0,
          email_failed: emailFailedCount ?? 0,
          email_queued: emailQueuedCount ?? 0,
        },
        200,
        corsHeaders,
      );
    }

    return jsonResponse({ error: "Invalid action" }, 400, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});

async function processNotifications(
  supabase: ReturnType<typeof createClient>,
  batchId: string | undefined,
  batchSize: number,
  runtimeConfig: RuntimeConfig,
): Promise<{
  processed: number;
  remaining: number;
  failed: number;
  emailSent: number;
  emailFailed: number;
}> {
  let processed = 0;
  let failed = 0;
  let emailSent = 0;
  let emailFailed = 0;

  let query = supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(Math.max(batchSize * 2, batchSize));

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query;
  if (error) {
    return {
      processed: 0,
      remaining: 0,
      failed: 0,
      emailSent: 0,
      emailFailed: 0,
    };
  }

  const pendingItems = (data as NotificationQueueRow[] | null) ?? [];
  const dueItems = pendingItems.filter(
    (item) => !item.scheduled_for || new Date(item.scheduled_for) <= new Date(),
  );
  const prioritized = dueItems.sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
  );
  const selectedItems = prioritized.slice(0, batchSize);

  if (selectedItems.length === 0) {
    const remaining = await getRemainingCount(supabase, batchId);
    return { processed: 0, remaining, failed: 0, emailSent: 0, emailFailed: 0 };
  }

  if (batchId) {
    await supabase
      .from("notification_batches")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString(),
      })
      .eq("id", batchId);
  }

  const templateCache = new Map<string, NotificationTemplateRow>();

  for (const item of selectedItems) {
    const attemptNumber = (item.attempts ?? 0) + 1;
    const maxAttempts = item.max_attempts ?? 3;
    const hasEmailChannel = normalizeChannels(
      item.channels,
      item.send_email,
    ).includes("email");
    let emailSentForItem = 0;

    try {
      await supabase
        .from("notification_queue")
        .update({
          status: "processing",
          attempts: attemptNumber,
          error_message: null,
        })
        .eq("id", item.id);

      const dataPayload: NotificationData = item.notification_data ?? {};
      const channels = normalizeChannels(item.channels, item.send_email);
      const shouldEmail = channels.includes("email");
      const shouldInApp = channels.includes("in_app");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, language")
        .eq("id", item.user_id)
        .single();

      if (shouldEmail) {
        const recipientEmail = profile?.email as string | undefined;
        if (!recipientEmail) {
          await logDeliveryEvent(supabase, {
            queueId: item.id,
            batchId: item.batch_id,
            userId: item.user_id,
            recipientEmail: "unknown",
            status: "failed",
            attempts: attemptNumber,
            templateKey:
              item.template_key ||
              resolveTemplateKey(
                undefined,
                item.business_domain,
                item.notification_type,
              ),
            businessDomain: normalizeDomain(
              item.business_domain,
              item.notification_type,
            ),
            notificationType: normalizeNotificationType(item.notification_type),
            errorMessage: "Recipient email not found",
            requestPayload: dataPayload,
            responsePayload: {},
          });
          throw new Error(`Recipient email not found for user ${item.user_id}`);
        }

        const emailEnabled = await isEmailEnabledForType(
          supabase,
          item.user_id,
          item.notification_type,
        );
        if (!emailEnabled) {
          await logDeliveryEvent(supabase, {
            queueId: item.id,
            batchId: item.batch_id,
            userId: item.user_id,
            recipientEmail,
            status: "suppressed",
            attempts: attemptNumber,
            templateKey:
              item.template_key ||
              resolveTemplateKey(
                undefined,
                item.business_domain,
                item.notification_type,
              ),
            businessDomain: normalizeDomain(
              item.business_domain,
              item.notification_type,
            ),
            notificationType: normalizeNotificationType(item.notification_type),
            errorMessage: "Suppressed due to user preferences",
            requestPayload: dataPayload,
            responsePayload: {},
          });
        } else {
          const template = await resolveTemplate(
            supabase,
            item,
            dataPayload,
            templateCache,
          );
          const context = buildTemplateContext(
            item,
            dataPayload,
            profile?.full_name as string | null,
            recipientEmail,
            runtimeConfig.appBaseUrl,
            (profile?.language as string | null) || "en",
          );

          const subject = renderTemplate(
            item.email_subject || template.subject_template,
            context,
            false,
          );
          const html = renderTemplate(
            item.email_html_override || template.html_template,
            context,
            true,
          );
          const text = renderTemplate(
            template.text_template || "",
            context,
            false,
          );

          const resendResult = await sendWithResend({
            to: recipientEmail,
            subject,
            html,
            text,
            fromName: template.from_name || runtimeConfig.fromName,
            fromEmail: template.from_email || runtimeConfig.fromEmail,
            apiKey: runtimeConfig.resendApiKey,
            tags: [
              {
                name: "domain",
                value: normalizeDomain(
                  item.business_domain,
                  item.notification_type,
                ),
              },
              {
                name: "type",
                value: normalizeNotificationType(item.notification_type),
              },
              { name: "batch_id", value: item.batch_id || "none" },
            ],
          });

          if (!resendResult.ok) {
            emailFailed++;
            await logDeliveryEvent(supabase, {
              queueId: item.id,
              batchId: item.batch_id,
              userId: item.user_id,
              recipientEmail,
              status: "failed",
              attempts: attemptNumber,
              templateKey: template.template_key,
              businessDomain: normalizeDomain(
                item.business_domain,
                item.notification_type,
              ),
              notificationType: normalizeNotificationType(
                item.notification_type,
              ),
              errorMessage: resendResult.errorMessage,
              requestPayload: { subject, html, text, context },
              responsePayload: resendResult.payload,
            });
            throw new Error(
              resendResult.errorMessage || "Failed to send email via Resend",
            );
          }

          emailSent++;
          emailSentForItem = 1;
          await logDeliveryEvent(supabase, {
            queueId: item.id,
            batchId: item.batch_id,
            userId: item.user_id,
            recipientEmail,
            status: "sent",
            attempts: attemptNumber,
            templateKey: template.template_key,
            businessDomain: normalizeDomain(
              item.business_domain,
              item.notification_type,
            ),
            notificationType: normalizeNotificationType(item.notification_type),
            errorMessage: null,
            requestPayload: { subject, context },
            responsePayload: resendResult.payload,
          });
        }
      }

      if (shouldInApp) {
        await createInAppNotification(
          supabase,
          item,
          dataPayload,
          (profile?.language as string | null) || "en",
        );
      }

      await supabase
        .from("notification_queue")
        .update({
          status: "sent",
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", item.id);

      if (item.batch_id) {
        await supabase.rpc("increment_batch_processed", {
          p_batch_id: item.batch_id,
        });
        if (hasEmailChannel && emailSentForItem > 0) {
          await supabase.rpc("increment_batch_email_counters", {
            p_batch_id: item.batch_id,
            p_sent: emailSentForItem,
            p_failed: 0,
          });
        }
      }

      processed++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing error";
      const finalFailure = attemptNumber >= maxAttempts;

      await supabase
        .from("notification_queue")
        .update({
          status: finalFailure ? "failed" : "pending",
          attempts: attemptNumber,
          error_message: message,
        })
        .eq("id", item.id);

      if (finalFailure) {
        failed++;
        if (item.batch_id) {
          await supabase.rpc("increment_batch_failed", {
            p_batch_id: item.batch_id,
          });
          if (hasEmailChannel) {
            await supabase.rpc("increment_batch_email_counters", {
              p_batch_id: item.batch_id,
              p_sent: 0,
              p_failed: 1,
            });
          }
        }
      }
    }
  }

  const remaining = await getRemainingCount(supabase, batchId);

  if (batchId && remaining === 0) {
    await supabase
      .from("notification_batches")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString(),
      })
      .eq("id", batchId);
  }

  return { processed, remaining, failed, emailSent, emailFailed };
}

async function resolveTemplate(
  supabase: ReturnType<typeof createClient>,
  item: NotificationQueueRow,
  payload: NotificationData,
  cache: Map<string, NotificationTemplateRow>,
): Promise<NotificationTemplateRow> {
  const businessDomain = normalizeDomain(
    item.business_domain || payload.businessDomain,
    item.notification_type,
  );
  const templateKey = resolveTemplateKey(
    item.template_key || payload.templateKey,
    businessDomain,
    item.notification_type,
  );

  if (cache.has(templateKey)) {
    return cache.get(templateKey)!;
  }

  const { data, error } = await supabase
    .from("notification_email_templates")
    .select(
      "template_key, business_domain, notification_type, subject_template, html_template, text_template, from_name, from_email",
    )
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (!error && data) {
    cache.set(templateKey, data as NotificationTemplateRow);
    return data as NotificationTemplateRow;
  }

  const fallback =
    defaultTemplates[templateKey] || defaultTemplates.system_generic_alert;
  cache.set(templateKey, fallback);
  return fallback;
}

async function createInAppNotification(
  supabase: ReturnType<typeof createClient>,
  item: NotificationQueueRow,
  dataPayload: NotificationData,
  userLanguage: string = "en",
): Promise<void> {
  const metadata = {
    ...(dataPayload ?? {}),
    queue_item_id: item.id,
    business_domain: normalizeDomain(
      item.business_domain,
      item.notification_type,
    ),
    template_key:
      item.template_key ||
      resolveTemplateKey(
        undefined,
        item.business_domain,
        item.notification_type,
      ),
  };

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", item.user_id)
    .contains("metadata", { queue_item_id: item.id })
    .limit(1);

  if (existing && existing.length > 0) {
    return;
  }

  const type = normalizeNotificationType(item.notification_type);
  const link = resolveRelativeLink(dataPayload);
  const entityType =
    typeof dataPayload.entityType === "string" ? dataPayload.entityType : null;
  const entityId =
    typeof dataPayload.entityId === "string" && isUUID(dataPayload.entityId)
      ? dataPayload.entityId
      : null;

  const title =
    userLanguage === "ar" && dataPayload.title_ar
      ? (dataPayload.title_ar as string)
      : asText(dataPayload.title, "New Notification");

  const message =
    userLanguage === "ar" && dataPayload.message_ar
      ? (dataPayload.message_ar as string)
      : asText(dataPayload.message, "You have a new notification");

  await supabase.from("notifications").insert({
    user_id: item.user_id,
    type,
    title,
    message,
    link,
    metadata: {
      ...(metadata ?? {}),
      entity_type: entityType,
      entity_id: entityId,
    },
  });
}

async function isEmailEnabledForType(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  type: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_preferences")
    .select(
      "email_enabled, approval_email, training_email, announcement_email, maintenance_email",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return true;
  if (data.email_enabled === false) return false;

  if (type.includes("approval") || type.includes("request"))
    return data.approval_email !== false;
  if (type.includes("training") || type.startsWith("sop_"))
    return data.training_email !== false;
  if (type.includes("announcement")) return data.announcement_email !== false;
  if (type.includes("maintenance")) return data.maintenance_email !== false;
  return true;
}

async function sendWithResend(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName: string;
  fromEmail: string;
  apiKey: string;
  tags: Array<{ name: string; value: string }>;
}): Promise<{
  ok: boolean;
  payload: Record<string, unknown>;
  errorMessage?: string;
}> {
  if (!params.apiKey) {
    return { ok: false, payload: {}, errorMessage: "Missing RESEND_API_KEY" };
  }

  let lastErrorMessage = "Resend send failed";
  let lastPayload: Record<string, unknown> = {};

  for (let attempt = 1; attempt <= RESEND_MAX_RETRIES; attempt++) {
    try {
      const now = Date.now();
      const waitMs = resendLastRequestAt + RESEND_MIN_INTERVAL_MS - now;
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          from: `${params.fromName} <${params.fromEmail}>`,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text || undefined,
          tags: params.tags,
        }),
      });

      resendLastRequestAt = Date.now();
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (response.ok) {
        return { ok: true, payload };
      }

      lastPayload = payload;
      lastErrorMessage =
        typeof payload?.message === "string"
          ? payload.message
          : "Resend send failed";

      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry || attempt === RESEND_MAX_RETRIES) {
        return { ok: false, payload, errorMessage: lastErrorMessage };
      }

      const retryAfterMs = parseRetryAfterMs(
        response.headers.get("retry-after"),
      );
      await sleep(retryAfterMs ?? RESEND_RETRY_BASE_MS * attempt);
    } catch (error) {
      lastErrorMessage =
        error instanceof Error ? error.message : "Resend request failed";
      if (attempt === RESEND_MAX_RETRIES) {
        return {
          ok: false,
          payload: lastPayload,
          errorMessage: lastErrorMessage,
        };
      }
      await sleep(RESEND_RETRY_BASE_MS * attempt);
    }
  }

  return { ok: false, payload: lastPayload, errorMessage: lastErrorMessage };
}

async function logDeliveryEvent(
  supabase: ReturnType<typeof createClient>,
  payload: {
    queueId?: string;
    batchId?: string;
    userId: string;
    recipientEmail: string;
    status: string;
    attempts: number;
    templateKey: string;
    businessDomain: string;
    notificationType: string;
    errorMessage: string | null;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
  },
): Promise<void> {
  const providerMessageId =
    typeof payload.responsePayload?.id === "string"
      ? payload.responsePayload.id
      : null;

  await supabase.from("notification_delivery_events").insert({
    queue_id: payload.queueId ?? null,
    batch_id: payload.batchId ?? null,
    user_id: payload.userId,
    recipient_email: payload.recipientEmail,
    provider: "resend",
    provider_message_id: providerMessageId,
    template_key: payload.templateKey,
    business_domain: normalizeDomain(
      payload.businessDomain,
      payload.notificationType,
    ),
    notification_type: normalizeNotificationType(payload.notificationType),
    status: payload.status,
    attempts: payload.attempts,
    error_message: payload.errorMessage,
    request_payload: payload.requestPayload,
    response_payload: payload.responsePayload,
    sent_at: payload.status === "sent" ? new Date().toISOString() : null,
    failed_at: payload.status === "failed" ? new Date().toISOString() : null,
  });
}

function normalizeNotificationType(type?: string): string {
  const value = (type ?? "system").trim().toLowerCase();
  return knownNotificationTypes.has(value) ? value : "system";
}

function normalizeDomain(
  domain?: string | null,
  notificationType?: string,
): NotificationDomain {
  const normalized = (domain ?? "").trim().toLowerCase();
  if (supportedDomains.includes(normalized as NotificationDomain)) {
    return normalized as NotificationDomain;
  }

  const type = (notificationType ?? "").toLowerCase();
  if (type.includes("maintenance")) return "operations";
  if (type.includes("training")) return "learning";
  if (
    type.includes("approval") ||
    type.includes("request") ||
    type.includes("promotion") ||
    type.includes("transfer")
  )
    return "hr";
  if (type.includes("announcement")) return "management";
  return "system";
}

function normalizeChannels(
  channels?: NotificationChannel[],
  sendEmail?: boolean,
): NotificationChannel[] {
  const fromRequest = (channels ?? []).filter(
    (value): value is NotificationChannel =>
      value === "in_app" || value === "email",
  );
  if (fromRequest.length > 0) {
    return [...new Set(fromRequest)];
  }
  return sendEmail ? ["in_app", "email"] : ["in_app"];
}

function normalizePriority(
  priority?: string,
): "low" | "normal" | "high" | "critical" {
  if (
    priority === "low" ||
    priority === "normal" ||
    priority === "high" ||
    priority === "critical"
  )
    return priority;
  return "normal";
}

function priorityRank(priority?: string): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 2;
  }
}

function resolveTemplateKey(
  inputTemplateKey: string | undefined,
  domain: string | null | undefined,
  type?: string,
): string {
  if (inputTemplateKey && inputTemplateKey.trim().length > 0)
    return inputTemplateKey.trim();

  const normalizedDomain = normalizeDomain(domain, type);
  switch (normalizedDomain) {
    case "user_management":
      return "user_management_welcome";
    case "operations":
      return "operations_incident_alert";
    case "hr":
      return "hr_employee_update";
    case "learning":
      return "learning_assignment_new";
    case "finance":
      return "finance_approval_alert";
    case "sales":
      return "sales_pipeline_alert";
    case "management":
      return "management_kpi_alert";
    default:
      return "system_generic_alert";
  }
}

function resolveRelativeLink(dataPayload: NotificationData): string {
  if (
    typeof dataPayload.link === "string" &&
    dataPayload.link.trim().length > 0
  ) {
    return dataPayload.link;
  }
  if (
    typeof dataPayload.moduleId === "string" &&
    dataPayload.moduleId.length > 0
  ) {
    return "/learning/training/" + dataPayload.moduleId;
  }
  if (
    typeof dataPayload.announcement_id === "string" &&
    dataPayload.announcement_id.length > 0
  ) {
    return "/announcements/" + dataPayload.announcement_id;
  }
  return "/notifications";
}

function buildTemplateContext(
  item: NotificationQueueRow,
  payload: NotificationData,
  recipientName: string | null,
  recipientEmail: string,
  appBaseUrl: string,
  language = "en",
): Record<string, string> {
  const isAr = language === "ar";
  const domain = normalizeDomain(
    item.business_domain || (payload.businessDomain as string),
    item.notification_type,
  );
  const branding = resolveBranding(domain);
  const link = resolveRelativeLink(payload);
  const actionUrl = resolveAbsoluteUrlWithBase(link, appBaseUrl);

  const baseContext: Record<string, string> = {
    title:
      isAr && payload.title_ar
        ? asText(payload.title_ar, "")
        : asText(payload.title, "Altus Connect Notification"),
    message:
      isAr && payload.message_ar
        ? asText(payload.message_ar, "")
        : asText(
            payload.message,
            isAr
              ? "لديك تحديث جديد في Altus Connect."
              : "You have a new update in Altus Connect.",
          ),
    action_url: actionUrl,
    action_label:
      isAr && payload.actionLabel_ar
        ? asText(payload.actionLabel_ar, "")
        : asText(payload.actionLabel, isAr ? "فتح المنصة" : "Open Altus Connect"),
    app_url: appBaseUrl,
    logo_url: appBaseUrl + "/altus-logo-official.png",
    recipient_name: recipientName || recipientEmail,
    lang: language,
    dir: isAr ? "rtl" : "ltr",
    align: isAr ? "right" : "left",
    align_opposite: isAr ? "left" : "right",
    year: new Date().getFullYear().toString(),
    brand_color: branding.color,
    brand_gradient: branding.gradient,
    business_unit_label: isAr ? branding.labelAr : branding.labelEn,
    footer_text: isAr
      ? "إشعار تلقائي من Altus Connect. تم الإرسال بناءً على إجراء داخل القسم أو مهمة/اعتماد مرتبط بك."
      : "Automated notification from Altus Connect. Sent based on an action in your department or an assignment.",
    has_data_box:
      payload.data_box ||
      payload.data_box_ar ||
      payload.variables?.data_box ||
      payload.variables?.data_box_ar
        ? "true"
        : "false",
    data_box_content:
      isAr && (payload.data_box_ar || payload.variables?.data_box_ar)
        ? asText(payload.data_box_ar || payload.variables?.data_box_ar, "")
        : asText(payload.data_box || payload.variables?.data_box, ""),
  };

  // Merge remaining variables
  const customVariables =
    payload.variables && typeof payload.variables === "object"
      ? payload.variables
      : payload;
  for (const [key, value] of Object.entries(customVariables)) {
    if (key !== "data_box" && key !== "variables") {
      baseContext[key] = asText(value, "");
    }
  }

  return baseContext;
}

function resolveBranding(domain: string) {
  const map: Record<
    string,
    { color: string; gradient: string; labelEn: string; labelAr: string }
  > = {
    user_management: {
      color: "#0B1C3E",
      gradient: "linear-gradient(135deg, #0B1C3E 0%, #1E40AF 100%)",
      labelEn: "User Management",
      labelAr:
        "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646",
    },
    hr: {
      color: "#0D9488",
      gradient: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
      labelEn: "HR & Workplace Excellence",
      labelAr:
        "\u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0627\u0644\u0648\u0638\u064A\u0641\u064A",
    },
    learning: {
      color: "#D97706",
      gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
      labelEn: "Learning & Academy",
      labelAr:
        "\u0627\u0644\u062A\u0639\u0644\u0645 \u0648\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
    },
    finance: {
      color: "#2563EB",
      gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      labelEn: "Finance & Approvals",
      labelAr:
        "\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A",
    },
    operations: {
      color: "#DC2626",
      gradient: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
      labelEn: "Operations & Safety",
      labelAr:
        "\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    },
    management: {
      color: "#1E293B",
      gradient: "linear-gradient(135deg, #334155 0%, #0F172A 100%)",
      labelEn: "Corporate Management",
      labelAr:
        "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
    },
    sales: {
      color: "#4F46E5",
      gradient: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
      labelEn: "Sales & Pipelines",
      labelAr:
        "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u062E\u0637\u0648\u0637 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A",
    },
    system: {
      color: "#0F172A",
      gradient: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
      labelEn: "System Administration",
      labelAr:
        "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645",
    },
  };

  return map[domain] || map.system;
}

// context values come straight from notification/template rows and item
// overrides, none of it HTML-escaped upstream - escapeValues must be true
// for the HTML render (the only real markup-injection sink) and false for
// the plain-text subject/text renders.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate(
  template: string,
  context: Record<string, string>,
  escapeValues: boolean,
): string {
  // Simple variable replacement
  let rendered = template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, rawKey: string) => {
      const key = rawKey.trim();
      const value = context[key] ?? "";
      return escapeValues ? escapeHtml(value) : value;
    },
  );

  // Handle conditional logic for Data Box
  if (context.has_data_box === "true") {
    rendered = rendered.replace(
      /\{\{#if has_data_box\}\}([\s\S]*?)\{\{\/if\}\}/g,
      "$1",
    );
  } else {
    rendered = rendered.replace(
      /\{\{#if has_data_box\}\}([\s\S]*?)\{\{\/if\}\}/g,
      "",
    );
  }

  return rendered;
}

function resolveAbsoluteUrlWithBase(
  pathOrUrl: string,
  appBaseUrl: string,
): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl;
  return appBaseUrl.replace(/\/+$/, "") + path;
}

async function loadRuntimeConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<RuntimeConfig> {
  const { data } = await supabase.rpc("get_email_runtime_config");
  const config =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rpcResend = readSecretString(config.resend_api_key);
  const rpcBaseUrl = readSecretString(config.app_base_url);
  const rpcFromName = readSecretString(config.email_from_name);
  const rpcFromEmail = readSecretString(config.email_from_address);

  return {
    resendApiKey: rpcResend || ENV_RESEND_API_KEY,
    appBaseUrl: (rpcBaseUrl || ENV_APP_BASE_URL).replace(/\/+$/, ""),
    fromName: rpcFromName || ENV_DEFAULT_FROM_NAME,
    fromEmail: rpcFromEmail || ENV_DEFAULT_FROM_EMAIL,
  };
}

async function getRemainingCount(
  supabase: ReturnType<typeof createClient>,
  batchId?: string,
): Promise<number> {
  let query = supabase
    .from("notification_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { count } = await query;
  return count ?? 0;
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return fallback;
}

function readSecretString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  const clamped = Number.isFinite(ms) && ms > 0 ? ms : 0;
  return new Promise((resolve) => setTimeout(resolve, clamped));
}
