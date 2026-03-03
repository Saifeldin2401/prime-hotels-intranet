import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENV_RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ENV_APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://phg-connect.com").replace(/\/+$/, "");
const ENV_DEFAULT_FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "PHG Connect";
const ENV_DEFAULT_FROM_EMAIL = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "notifications@phg-connect.com";
const RESEND_MAX_RETRIES = 3;
const RESEND_RETRY_BASE_MS = 750;
const RESEND_MIN_INTERVAL_MS = 550;
let resendLastRequestAt = 0;

interface SendEmailBody {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  templateKey?: string;
  businessDomain?: string;
  notificationType?: string;
  variables?: Record<string, unknown>;
  fromName?: string;
  fromEmail?: string;
  actionLabel?: string;
  userId?: string;
  batchId?: string;
  queueId?: string;
}

interface TemplateRow {
  template_key: string;
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

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, 500, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401, corsHeaders);
    }

    const body = (await req.json()) as SendEmailBody;
    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    const cleanedRecipients = recipients.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

    if (cleanedRecipients.length === 0) {
      return jsonResponse({ error: "Missing required field: to" }, 400, corsHeaders);
    }

    const isServiceRoleCall = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

    let user: { id: string; email?: string | null } | null = null;
    if (!isServiceRoleCall) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user: authUser },
        error: userError,
      } = await userClient.auth.getUser();

      if (userError || !authUser) {
        return jsonResponse({ error: "Unauthorized", details: userError?.message }, 401, corsHeaders);
      }
      user = authUser;
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const runtimeConfig = await loadRuntimeConfig(serviceClient);
    if (!runtimeConfig.resendApiKey) {
      return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500, corsHeaders);
    }

    if (!isServiceRoleCall && user) {
      const adminRoles = ["corporate_admin", "regional_admin", "regional_hr", "property_manager", "property_hr"];
      const { data: roleRows, error: roleError } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", adminRoles);

      if (roleError) {
        return jsonResponse({ error: "Failed to validate permissions" }, 500, corsHeaders);
      }

      const isAdmin = Boolean(roleRows && roleRows.length > 0);
      const normalizedUserEmail = (user.email || "").trim().toLowerCase();
      const isSelfCertificateEmail =
        body.templateKey === "certificate_earned" &&
        normalizedUserEmail.length > 0 &&
        cleanedRecipients.every((recipient) => recipient.toLowerCase() === normalizedUserEmail) &&
        (!body.userId || body.userId === user.id);

      if (!isAdmin && !isSelfCertificateEmail) {
        return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      }
    }

    // Fetch profile for more context
    let profileData: { full_name?: string | null; language?: string | null } | null = null;
    const targetUserId = body.userId || (isServiceRoleCall ? null : user?.id);

    if (targetUserId) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("full_name, language")
        .eq("id", targetUserId)
        .maybeSingle();
      profileData = profile;
    }

    const template = await resolveTemplate(serviceClient, body.templateKey);
    const sanitizedTemplate = template
      ? {
          ...template,
          html_template: sanitizeHtmlTemplate(template.html_template),
        }
      : null;
    const context = buildContext(
      body,
      profileData?.full_name ?? user?.email ?? cleanedRecipients[0] ?? "team@phg-connect.com",
      runtimeConfig.appBaseUrl,
      profileData?.language || "en"
    );

    const subject = body.subject || renderTemplate(sanitizedTemplate?.subject_template || "PHG Connect Notification - {{title}}", context);
    const html = body.html || renderTemplate(sanitizedTemplate?.html_template || defaultHtmlTemplate(), context);
    const text = body.text || renderTemplate(sanitizedTemplate?.text_template || defaultTextTemplate(), context);
    const fromName = body.fromName || sanitizedTemplate?.from_name || runtimeConfig.fromName;
    const fromEmail = body.fromEmail || sanitizedTemplate?.from_email || runtimeConfig.fromEmail;

    const resendResult = await sendWithResendWithRetry({
      apiKey: runtimeConfig.resendApiKey,
      fromName,
      fromEmail,
      to: cleanedRecipients,
      subject,
      html,
      text,
      tags: [
        { name: "domain", value: normalizeDomain(body.businessDomain) },
        { name: "type", value: (body.notificationType || "system").toLowerCase() },
        { name: "source", value: "send-email-function" },
      ],
    });

    if (!resendResult.ok) {
      return jsonResponse({ error: "Failed to send email via Resend", details: resendResult.payload }, 500, corsHeaders);
    }

    const data = resendResult.payload;

    try {
      await trackDelivery(serviceClient, {
        userId: body.userId || (isServiceRoleCall ? null : user?.id) || undefined,
        recipientEmail: cleanedRecipients[0],
        templateKey: body.templateKey || template?.template_key || "system_generic_alert",
        businessDomain: normalizeDomain(body.businessDomain),
        notificationType: (body.notificationType || "system").toLowerCase(),
        queueId: body.queueId,
        batchId: body.batchId,
        requestPayload: { subject, templateKey: body.templateKey, variables: body.variables ?? {} },
        responsePayload: data as Record<string, unknown>,
      });
    } catch (trackError) {
      console.error("Delivery tracking failed:", trackError);
    }

    return jsonResponse({ success: true, data }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});

async function resolveTemplate(
  serviceClient: ReturnType<typeof createClient>,
  templateKey?: string,
): Promise<TemplateRow | null> {
  if (!templateKey) return null;
  const { data, error } = await serviceClient
    .from("notification_email_templates")
    .select("template_key, subject_template, html_template, text_template, from_name, from_email")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as TemplateRow;
}

function buildContext(
  body: SendEmailBody,
  fallbackRecipient: string,
  appBaseUrl: string,
  language = "en"
): Record<string, string> {
  const isAr = language === "ar";
  const actionUrl = resolveAbsoluteUrl(body.actionUrl || "/notifications", appBaseUrl);
  const domain = normalizeDomain(body.businessDomain);

  // Resolution Logic for Premium Branding
  const branding = resolveBranding(domain);

  const baseContext: Record<string, string> = {
    title: asText(body.title, body.subject || "Notification"),
    message: asText(body.message, isAr ? "\u0644\u062F\u064A\u0643 \u062A\u062D\u062F\u064A\u062B \u062C\u062F\u064A\u062F \u0641\u064A PHG Connect." : "You have a new update in PHG Connect."),
    action_url: actionUrl,
    action_label: asText(body.actionLabel, isAr ? "\u0641\u062A\u062D \u0627\u0644\u0645\u0646\u0635\u0629" : "Open PHG Connect"),
    app_url: appBaseUrl,
    logo_url: `${appBaseUrl}/prime-logo-white-full.png`, // Standard premium logo
    recipient_name: fallbackRecipient,
    lang: language,
    dir: isAr ? "rtl" : "ltr",
    align: isAr ? "right" : "left",
    align_opposite: isAr ? "left" : "right",
    year: new Date().getFullYear().toString(),
    brand_color: branding.color,
    brand_gradient: branding.gradient,
    business_unit_label: isAr ? branding.labelAr : branding.labelEn,
    footer_text: isAr
      ? "\u0625\u0634\u0639\u0627\u0631 \u062A\u0644\u0642\u0627\u0626\u064A \u0645\u0646 PHG Connect. \u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0625\u062C\u0631\u0627\u0621 \u062F\u0627\u062E\u0644 \u0627\u0644\u0642\u0633\u0645 \u0623\u0648 \u0645\u0647\u0645\u0629/\u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0631\u062A\u0628\u0637 \u0628\u0643."
      : "Automated notification from PRIME Connect. Sent based on an action in your department or an assignment.",
    has_data_box: body.variables?.data_box ? "true" : "false",
    data_box_content: asText(body.variables?.data_box, "")
  };

  for (const [key, value] of Object.entries(body.variables || {})) {
    if (key !== "data_box") {
      baseContext[key] = asText(value, "");
    }
  }

  return baseContext;
}

function resolveBranding(domain: string) {
  const map: Record<string, { color: string; gradient: string; labelEn: string; labelAr: string }> = {
    user_management: {
      color: "#0B1C3E",
      gradient: "linear-gradient(135deg, #0B1C3E 0%, #1E40AF 100%)",
      labelEn: "User Management",
      labelAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646",
    },
    hr: {
      color: "#0D9488",
      gradient: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
      labelEn: "HR & Workplace Excellence",
      labelAr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0627\u0644\u0648\u0638\u064A\u0641\u064A",
    },
    learning: {
      color: "#D97706",
      gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
      labelEn: "Learning & Academy",
      labelAr: "\u0627\u0644\u062A\u0639\u0644\u0645 \u0648\u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
    },
    finance: {
      color: "#2563EB",
      gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      labelEn: "Finance & Approvals",
      labelAr: "\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A",
    },
    operations: {
      color: "#DC2626",
      gradient: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
      labelEn: "Operations & Safety",
      labelAr: "\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    },
    management: {
      color: "#1E293B",
      gradient: "linear-gradient(135deg, #334155 0%, #0F172A 100%)",
      labelEn: "Corporate Management",
      labelAr: "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
    },
    sales: {
      color: "#4F46E5",
      gradient: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
      labelEn: "Sales & Pipelines",
      labelAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u062E\u0637\u0648\u0637 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A",
    },
    system: {
      color: "#0F172A",
      gradient: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
      labelEn: "System Administration",
      labelAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645",
    },
  };

  return map[domain] || map.system;
}

function renderTemplate(template: string, context: Record<string, string>): string {
  let rendered = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    return context[key] ?? "";
  });

  if (context.has_data_box === "true") {
    rendered = rendered.replace(/\{\{#if has_data_box\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
  } else {
    rendered = rendered.replace(/\{\{#if has_data_box\}\}([\s\S]*?)\{\{\/if\}\}/g, "");
  }

  return rendered;
}

function sanitizeHtmlTemplate(html: string): string {
  let sanitized = html;

  // Fix malformed closing tag seen in stored templates: </media> should be </style>
  sanitized = sanitized.replace(/<\/media>/gi, "</style>");

  // If a <style> tag exists but never closes, close it before </head>
  const hasStyleOpen = /<style\b[^>]*>/i.test(sanitized);
  const hasStyleClose = /<\/style>/i.test(sanitized);
  if (hasStyleOpen && !hasStyleClose) {
    if (/<\/head>/i.test(sanitized)) {
      sanitized = sanitized.replace(/<\/head>/i, "</style>\n</head>");
    } else {
      sanitized = `${sanitized}\n</style>`;
    }
  }

  return sanitized;
}

function defaultHtmlTemplate(): string {
  return "<h1><img src=\"{{logo_url}}\" alt=\"PRIME\" height=\"32\"></h1><p>{{message}}</p><p><a href=\"{{action_url}}\">Open PHG Connect</a></p><p>phg-connect.com</p>";
}

function defaultTextTemplate(): string {
  return "PHG Connect | {{title}}\n\n{{message}}\n\n{{action_url}}";
}

function resolveAbsoluteUrl(pathOrUrl: string, appBaseUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${appBaseUrl.replace(/\/+$/, "")}${path}`;
}

function normalizeDomain(domain?: string): string {
  const value = (domain || "system").toLowerCase();
  const allowed = ["system", "user_management", "operations", "hr", "learning", "finance", "sales", "management"];
  return allowed.includes(value) ? value : "system";
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

async function trackDelivery(
  serviceClient: ReturnType<typeof createClient>,
  payload: {
    userId?: string;
    recipientEmail: string;
    templateKey: string;
    businessDomain: string;
    notificationType: string;
    queueId?: string;
    batchId?: string;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
  },
): Promise<void> {
  if (!payload.userId) return;

  const providerMessageId = typeof payload.responsePayload?.id === "string" ? payload.responsePayload.id : null;

  await serviceClient.from("notification_delivery_events").insert({
    user_id: payload.userId,
    recipient_email: payload.recipientEmail,
    queue_id: payload.queueId || null,
    batch_id: payload.batchId || null,
    template_key: payload.templateKey,
    business_domain: payload.businessDomain,
    notification_type: payload.notificationType,
    provider: "resend",
    provider_message_id: providerMessageId,
    status: "sent",
    attempts: 1,
    request_payload: payload.requestPayload,
    response_payload: payload.responsePayload,
    sent_at: new Date().toISOString(),
  });
}

async function loadRuntimeConfig(serviceClient: ReturnType<typeof createClient>): Promise<RuntimeConfig> {
  const { data } = await serviceClient.rpc("get_email_runtime_config");
  const config = (data && typeof data === "object") ? (data as Record<string, unknown>) : {};
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

async function sendWithResendWithRetry(params: {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  tags: Array<{ name: string; value: string }>;
}): Promise<{ ok: boolean; payload: Record<string, unknown> }> {
  let lastPayload: Record<string, unknown> = {};

  for (let attempt = 1; attempt <= RESEND_MAX_RETRIES; attempt++) {
    try {
      const now = Date.now();
      const waitMs = resendLastRequestAt + RESEND_MIN_INTERVAL_MS - now;
      if (waitMs > 0) await sleep(waitMs);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          from: `${params.fromName} <${params.fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          tags: params.tags,
        }),
      });

      resendLastRequestAt = Date.now();
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.ok) {
        return { ok: true, payload };
      }

      lastPayload = payload;
      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry || attempt === RESEND_MAX_RETRIES) {
        return { ok: false, payload };
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? RESEND_RETRY_BASE_MS * attempt);
    } catch (error) {
      lastPayload = { message: error instanceof Error ? error.message : "Resend request failed" };
      if (attempt === RESEND_MAX_RETRIES) {
        return { ok: false, payload: lastPayload };
      }
      await sleep(RESEND_RETRY_BASE_MS * attempt);
    }
  }

  return { ok: false, payload: lastPayload };
}

function readSecretString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function jsonResponse(payload: Record<string, unknown>, status = 200, corsHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}



