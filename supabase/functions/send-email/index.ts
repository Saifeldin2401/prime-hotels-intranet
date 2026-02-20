import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const body = (await req.json()) as SendEmailBody;
    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    const cleanedRecipients = recipients.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

    if (cleanedRecipients.length === 0) {
      return jsonResponse({ error: "Missing required field: to" }, 400);
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
        return jsonResponse({ error: "Unauthorized", details: userError?.message }, 401);
      }
      user = authUser;
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const runtimeConfig = await loadRuntimeConfig(serviceClient);
    if (!runtimeConfig.resendApiKey) {
      return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
    }

    if (!isServiceRoleCall && user) {
      const adminRoles = ["corporate_admin", "regional_admin", "regional_hr", "property_manager", "property_hr"];
      const { data: roleRows, error: roleError } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", adminRoles);

      if (roleError) {
        return jsonResponse({ error: "Failed to validate permissions" }, 500);
      }

      const isAdmin = Boolean(roleRows && roleRows.length > 0);
      const normalizedUserEmail = (user.email || "").trim().toLowerCase();
      const isSelfCertificateEmail =
        body.templateKey === "certificate_earned" &&
        normalizedUserEmail.length > 0 &&
        cleanedRecipients.every((recipient) => recipient.toLowerCase() === normalizedUserEmail) &&
        (!body.userId || body.userId === user.id);

      if (!isAdmin && !isSelfCertificateEmail) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    const template = await resolveTemplate(serviceClient, body.templateKey);
    const context = buildContext(
      body,
      user?.email ?? cleanedRecipients[0] ?? "team@phg-connect.com",
      runtimeConfig.appBaseUrl,
    );

    const subject = body.subject || renderTemplate(template?.subject_template || "PHG Connect Notification - {{title}}", context);
    const html = body.html || renderTemplate(template?.html_template || defaultHtmlTemplate(), context);
    const text = body.text || renderTemplate(template?.text_template || defaultTextTemplate(), context);
    const fromName = body.fromName || template?.from_name || runtimeConfig.fromName;
    const fromEmail = body.fromEmail || template?.from_email || runtimeConfig.fromEmail;

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
      return jsonResponse({ error: "Failed to send email via Resend", details: resendResult.payload }, 500);
    }

    const data = resendResult.payload;

    try {
      await trackDelivery(serviceClient, {
        userId: body.userId,
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

    return jsonResponse({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
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

function buildContext(body: SendEmailBody, fallbackRecipient: string, appBaseUrl: string): Record<string, string> {
  const actionUrl = resolveAbsoluteUrl(body.actionUrl || "/notifications", appBaseUrl);
  const baseContext: Record<string, string> = {
    title: asText(body.title, body.subject || "Notification"),
    message: asText(body.message, "You have a new update in PHG Connect."),
    action_url: actionUrl,
    app_url: appBaseUrl,
    logo_url: `${appBaseUrl}/prime-logo-white-full.png`,
    recipient_name: fallbackRecipient,
  };

  for (const [key, value] of Object.entries(body.variables || {})) {
    baseContext[key] = asText(value, "");
  }

  return baseContext;
}

function defaultHtmlTemplate(): string {
  return "<h1><img src=\"{{logo_url}}\" alt=\"PRIME\" height=\"32\"></h1><p>{{message}}</p><p><a href=\"{{action_url}}\">Open PHG Connect</a></p><p>phg-connect.com</p>";
}

function defaultTextTemplate(): string {
  return "PHG Connect | {{title}}\n\n{{message}}\n\n{{action_url}}";
}

function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    return context[key] ?? "";
  });
}

function resolveAbsoluteUrl(pathOrUrl: string, appBaseUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${appBaseUrl.replace(/\/+$/, "")}${path}`;
}

function normalizeDomain(domain?: string): string {
  const value = (domain || "system").toLowerCase();
  const allowed = ["system", "user_management", "operations", "hr", "finance", "sales", "management"];
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

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
