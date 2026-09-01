import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getCodeTemplate } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENV_RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ENV_APP_BASE_URL = (
  Deno.env.get("APP_BASE_URL") ?? "https://www.phg-connect.com"
).replace(/\/+$/, "");
const ENV_DEFAULT_FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "Altus Connect";
const ENV_DEFAULT_FROM_EMAIL =
  Deno.env.get("EMAIL_FROM_ADDRESS") ?? "notifications@phg-connect.com";
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
  replyTo?: string;
  actionLabel?: string;
  userId?: string;
  organizationId?: string;
  organization_id?: string;
  batchId?: string;
  queueId?: string;
  attachments?: Array<{ filename: string; content: string }>;
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

interface TenantEmailContext {
  org_id: string | null;
  org_name: string;
  org_name_ar: string;
  logo_url: string;
  brand_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  sender_name: string;
  from_email: string;
  reply_to: string;
  support_email: string;
  website_url: string;
  footer_text: string;
  footer_text_ar: string;
  is_custom_branded: boolean;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
        corsHeaders,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Missing Authorization header" },
        401,
        corsHeaders,
      );
    }

    const body = (await req.json()) as SendEmailBody;
    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    const cleanedRecipients = recipients
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    if (cleanedRecipients.length === 0) {
      return jsonResponse(
        { error: "Missing required field: to" },
        400,
        corsHeaders,
      );
    }

    const isServiceRoleCall =
      authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
      req.headers.get("apikey") === SUPABASE_SERVICE_ROLE_KEY;

    let user: { id: string; email?: string | null } | null = null;
    let isSelfCertificateEmail = false;
    if (!isServiceRoleCall) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user: authUser },
        error: userError,
      } = await userClient.auth.getUser();

      if (userError || !authUser) {
        console.error("SEND-EMAIL DEBUG: userError", userError?.message);
        return jsonResponse(
          { error: "Unauthorized", details: userError?.message },
          401,
          corsHeaders,
        );
      }
      user = authUser;
    }

    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const runtimeConfig = await loadRuntimeConfig(serviceClient);
    if (!runtimeConfig.resendApiKey) {
      return jsonResponse(
        { error: "Missing RESEND_API_KEY" },
        500,
        corsHeaders,
      );
    }

    // Resolve Target Organization ID
    let targetOrgId: string | null =
      body.organizationId || body.organization_id || null;

    if (!targetOrgId && body.userId) {
      const { data: memberData } = await serviceClient
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", body.userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (memberData?.organization_id) {
        targetOrgId = memberData.organization_id;
      }
    }

    if (!targetOrgId && user) {
      const { data: callerMember } = await serviceClient
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (callerMember?.organization_id) {
        targetOrgId = callerMember.organization_id;
      }
    }

    // Security Gate: Validate caller authorization for the target tenant
    if (!isServiceRoleCall && user && targetOrgId) {
      const { data: canSend, error: canSendErr } = await serviceClient.rpc(
        "can_send_tenant_email",
        {
          p_user_id: user.id,
          p_org_id: targetOrgId,
        },
      );

      if (canSendErr || canSend === false) {
        return jsonResponse(
          { error: "Forbidden: Not authorized to send email for this tenant organization" },
          403,
          corsHeaders,
        );
      }
    }

    // Resolve Authoritative Tenant Branding & Email Context
    const { data: tenantBrandingRaw } = await serviceClient.rpc(
      "get_tenant_email_context",
      { p_org_id: targetOrgId },
    );

    const tenantContext: TenantEmailContext = tenantBrandingRaw || {
      org_id: null,
      org_name: "Altus Connect",
      org_name_ar: "ألتوس كونكت",
      logo_url: `${runtimeConfig.appBaseUrl}/altus-emblem-icon.png`,
      brand_colors: {
        primary: "#0B1C3E",
        secondary: "#1a365d",
        accent: "#D4AF37",
      },
      sender_name: runtimeConfig.fromName || "Altus Connect",
      from_email: runtimeConfig.fromEmail || "notifications@phg-connect.com",
      reply_to: "support@altus-advisory.com",
      support_email: "support@altus-advisory.com",
      website_url: runtimeConfig.appBaseUrl,
      footer_text: "All rights reserved.",
      footer_text_ar: "جميع الحقوق محفوظة.",
      is_custom_branded: false,
    };

    // Role checks for non-service-role callers
    if (!isServiceRoleCall && user) {
      const adminRoles = [
        "corporate_admin",
        "regional_admin",
        "regional_hr",
        "property_manager",
        "property_hr",
        "administrator",
        "super_admin",
      ];
      const { data: roleRows, error: roleError } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", adminRoles);

      if (roleError) {
        return jsonResponse(
          { error: "Failed to validate permissions" },
          500,
          corsHeaders,
        );
      }

      const isAdmin = Boolean(roleRows && roleRows.length > 0);
      const normalizedUserEmail = (user.email || "").trim().toLowerCase();
      isSelfCertificateEmail =
        body.templateKey === "certificate_earned" &&
        normalizedUserEmail.length > 0 &&
        cleanedRecipients.every(
          (recipient) => recipient.toLowerCase() === normalizedUserEmail,
        ) &&
        (!body.userId || body.userId === user.id);

      if (!isAdmin && !isSelfCertificateEmail) {
        return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      }
    }

    // Fetch profile for language context
    let profileData: {
      full_name?: string | null;
      language?: string | null;
    } | null = null;
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

    const recipientLang = profileData?.language || "en";
    const context = buildContext(
      body,
      tenantContext,
      profileData?.full_name ??
        user?.email ??
        cleanedRecipients[0] ??
        tenantContext.support_email,
      runtimeConfig.appBaseUrl,
      recipientLang,
    );

    const defaultSubject =
      recipientLang === "ar"
        ? `إشعار ${tenantContext.org_name_ar} - {{title}}`
        : `${tenantContext.org_name} Notification - {{title}}`;

    const subject =
      body.subject ||
      renderTemplate(
        sanitizedTemplate?.subject_template || defaultSubject,
        context,
        false,
      );

    const resolvedHtmlTemplate =
      sanitizedTemplate?.html_template ||
      (body.templateKey ? getCodeTemplate(body.templateKey) : null) ||
      defaultHtmlTemplate();

    const effectiveHtml = isSelfCertificateEmail ? undefined : body.html;
    const html =
      effectiveHtml ||
      renderTemplate(resolvedHtmlTemplate, context, true);
    const text =
      body.text ||
      renderTemplate(
        sanitizedTemplate?.text_template || defaultTextTemplate(),
        context,
        false,
      );

    const fromName =
      body.fromName ||
      (tenantContext.is_custom_branded
        ? (tenantContext.sender_name || sanitizedTemplate?.from_name || runtimeConfig.fromName)
        : (sanitizedTemplate?.from_name || tenantContext.sender_name || runtimeConfig.fromName));

    const fromEmail = runtimeConfig.fromEmail;
    const replyTo = body.replyTo || tenantContext.reply_to || tenantContext.support_email;

    const resendResult = await sendWithResendWithRetry({
      apiKey: runtimeConfig.resendApiKey,
      fromName,
      fromEmail,
      replyTo,
      to: cleanedRecipients,
      subject,
      html,
      text,
      attachments: body.attachments,
      tags: [
        { name: "domain", value: normalizeDomain(body.businessDomain) },
        {
          name: "type",
          value: (body.notificationType || "system").toLowerCase(),
        },
        { name: "tenant_id", value: targetOrgId || "global" },
        { name: "source", value: "send-email-function" },
      ],
    });

    if (!resendResult.ok) {
      return jsonResponse(
        {
          error: "Failed to send email via Resend",
          details: resendResult.payload,
        },
        500,
        corsHeaders,
      );
    }

    const data = resendResult.payload;

    try {
      await trackDelivery(serviceClient, {
        organizationId: targetOrgId || undefined,
        userId:
          body.userId || (isServiceRoleCall ? null : user?.id) || undefined,
        recipientEmail: cleanedRecipients[0],
        templateKey:
          body.templateKey || template?.template_key || "system_generic_alert",
        businessDomain: normalizeDomain(body.businessDomain),
        notificationType: (body.notificationType || "system").toLowerCase(),
        queueId: body.queueId,
        batchId: body.batchId,
        requestPayload: {
          subject,
          templateKey: body.templateKey,
          organizationId: targetOrgId,
          variables: body.variables ?? {},
        },
        responsePayload: data as Record<string, unknown>,
      });
    } catch (trackError) {
      console.error("Delivery tracking failed:", trackError);
    }

    return jsonResponse({ success: true, data, tenant: tenantContext.org_name }, 200, corsHeaders);
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
    .select(
      "template_key, subject_template, html_template, text_template, from_name, from_email",
    )
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as TemplateRow;
}

function buildContext(
  body: SendEmailBody,
  tenant: TenantEmailContext,
  fallbackRecipient: string,
  appBaseUrl: string,
  language = "en",
): Record<string, string> {
  const isAr = language === "ar";
  const actionUrl = resolveAbsoluteUrl(
    body.actionUrl || "/notifications",
    appBaseUrl,
  );
  const domain = normalizeDomain(body.businessDomain);
  const orgName = isAr ? tenant.org_name_ar : tenant.org_name;

  const baseContext: Record<string, string> = {
    title: asText(body.title, body.subject || "Notification"),
    message: asText(
      body.message,
      isAr
        ? `لديك تحديث جديد في ${orgName}.`
        : `You have a new update in ${orgName}.`,
    ),
    action_url: actionUrl,
    action_label: asText(
      body.actionLabel,
      isAr ? "فتح المنصة" : `Open ${orgName}`,
    ),
    app_url: appBaseUrl,
    org_name: orgName,
    logo_url: asText(body.variables?.logo_url, tenant.logo_url),
    recipient_name: fallbackRecipient,
    lang: language,
    dir: isAr ? "rtl" : "ltr",
    align: isAr ? "right" : "left",
    align_opposite: isAr ? "left" : "right",
    year: new Date().getFullYear().toString(),
    brand_primary: tenant.brand_colors.primary,
    brand_secondary: tenant.brand_colors.secondary,
    brand_accent: tenant.brand_colors.accent,
    header_gradient: `linear-gradient(135deg, ${tenant.brand_colors.primary} 0%, ${tenant.brand_colors.secondary} 100%)`,
    support_email: tenant.support_email,
    website_url: tenant.website_url,
    business_unit_label: isAr ? "المنصة الذكية" : orgName,
    footer_text: isAr ? tenant.footer_text_ar : tenant.footer_text,
    has_data_box: body.variables?.data_box ? "true" : "false",
    data_box_content: asText(body.variables?.data_box, ""),
    greeting_hello: isAr ? "مرحباً " : "Hello ",
    trouble_clicking: isAr
      ? "إذا واجهت مشكلة في النقر على الزر، قم بنسخ الرابط التالي ولصقه في متصفحك:"
      : "If you're having trouble clicking the button, copy and paste the URL below into your web browser:",
    dashboard_link_text: isAr ? "لوحة القيادة" : "Dashboard",
    help_link_text: isAr ? "مركز المساعدة" : "Help & Support",
    rights_reserved: isAr ? "جميع الحقوق محفوظة." : "All rights reserved.",
  };

  for (const [key, value] of Object.entries(body.variables || {})) {
    if (key !== "data_box") {
      baseContext[key] = asText(value, "");
    }
  }

  return baseContext;
}

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
  let rendered = template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, rawKey: string) => {
      const key = rawKey.trim();
      const value = context[key] ?? "";
      return escapeValues ? escapeHtml(value) : value;
    },
  );

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

function sanitizeHtmlTemplate(html: string): string {
  let sanitized = html;
  sanitized = sanitized.replace(/<\/media>/gi, "</style>");
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
  return `<!DOCTYPE html>
<html lang="{{lang}}" dir="{{dir}}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; color: #334155; }
        .wrapper { width: 100%; padding: 40px 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(15,23,42,.06); }
        .header { padding: 32px 40px; background: {{header_gradient}}; text-align: center; color: #ffffff; }
        .header img { max-height: 48px; width: auto; }
        .content { padding: 36px 40px; text-align: {{align}}; }
        .h1 { color: {{brand_primary}}; font-size: 22px; font-weight: 700; margin: 0 0 20px; }
        .btn-wrap { margin: 32px 0; text-align: {{align}}; }
        .btn { display: inline-block; background: {{header_gradient}}; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; }
        .footer { background: {{brand_primary}}; padding: 28px 40px; text-align: center; color: rgba(255,255,255,.8); font-size: 13px; }
        .footer a { color: {{brand_accent}}; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <img src="{{logo_url}}" alt="{{org_name}}">
            </div>
            <div class="content">
                <h1 class="h1">{{title}}</h1>
                <p>{{greeting_hello}} {{recipient_name}},</p>
                <p>{{message}}</p>
                <div class="btn-wrap">
                    <a href="{{action_url}}" class="btn">{{action_label}}</a>
                </div>
            </div>
            <div class="footer">
                <p>{{footer_text}}</p>
                <p><a href="{{website_url}}">{{dashboard_link_text}}</a> &bull; <a href="mailto:{{support_email}}">{{help_link_text}}</a></p>
                <p>&copy; {{year}} {{org_name}}. {{rights_reserved}}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function defaultTextTemplate(): string {
  return `{{title}}

{{greeting_hello}} {{recipient_name}},

{{message}}

{{action_label}}: {{action_url}}

--
{{org_name}}
{{footer_text}}`;
}

async function sendWithResendWithRetry(params: {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}): Promise<{ ok: boolean; payload: unknown }> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RESEND_MAX_RETRIES; attempt++) {
    try {
      const now = Date.now();
      const waitMs = resendLastRequestAt + RESEND_MIN_INTERVAL_MS - now;
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const payload: Record<string, unknown> = {
        from: `${params.fromName} <${params.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      };

      if (params.replyTo) {
        payload.reply_to = params.replyTo;
      }
      if (params.attachments && params.attachments.length > 0) {
        payload.attachments = params.attachments;
      }
      if (params.tags && params.tags.length > 0) {
        payload.tags = params.tags;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      resendLastRequestAt = Date.now();

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: true, payload: data };
      }

      const errorData = await response.json().catch(() => ({}));
      lastError = errorData;

      const shouldRetry =
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599);

      if (!shouldRetry || attempt === RESEND_MAX_RETRIES) {
        return { ok: false, payload: errorData };
      }

      await sleep(RESEND_RETRY_BASE_MS * attempt);
    } catch (err) {
      lastError = err;
      if (attempt === RESEND_MAX_RETRIES) {
        return {
          ok: false,
          payload: {
            error: err instanceof Error ? err.message : "Network error",
          },
        };
      }
      await sleep(RESEND_RETRY_BASE_MS * attempt);
    }
  }

  return { ok: false, payload: lastError };
}

async function trackDelivery(
  serviceClient: ReturnType<typeof createClient>,
  data: {
    organizationId?: string;
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
) {
  const providerMessageId =
    typeof data.responsePayload === "object" &&
    data.responsePayload &&
    "id" in data.responsePayload
      ? String(data.responsePayload.id)
      : null;

  await serviceClient.from("notification_delivery_events").insert({
    organization_id: data.organizationId || null,
    user_id: data.userId || null,
    recipient_email: data.recipientEmail,
    provider: "resend",
    provider_message_id: providerMessageId,
    template_key: data.templateKey,
    business_domain: data.businessDomain,
    notification_type: data.notificationType,
    status: "sent",
    attempts: 1,
    request_payload: data.requestPayload,
    response_payload: data.responsePayload,
    sent_at: new Date().toISOString(),
  });
}

async function loadRuntimeConfig(
  serviceClient: ReturnType<typeof createClient>,
): Promise<RuntimeConfig> {
  let resendApiKey = ENV_RESEND_API_KEY;
  let appBaseUrl = ENV_APP_BASE_URL;
  let fromName = ENV_DEFAULT_FROM_NAME;
  let fromEmail = ENV_DEFAULT_FROM_EMAIL;

  try {
    const { data: config } = await serviceClient.rpc(
      "get_email_runtime_config",
    );
    if (config) {
      if (config.resend_api_key) resendApiKey = config.resend_api_key;
      if (config.app_base_url) appBaseUrl = config.app_base_url;
      if (config.from_name) fromName = config.from_name;
      if (config.from_email) fromEmail = config.from_email;
    }
  } catch (_err) {
    // fallback to env vars
  }

  return { resendApiKey, appBaseUrl, fromName, fromEmail };
}

function resolveAbsoluteUrl(targetUrl: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(targetUrl)) return targetUrl;
  const cleanPath = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
  return `${baseUrl}${cleanPath}`;
}

function normalizeDomain(domain?: string): string {
  const d = (domain || "system").toLowerCase().trim();
  const valid = [
    "user_management",
    "hr",
    "learning",
    "finance",
    "operations",
    "management",
    "sales",
    "system",
  ];
  return valid.includes(d) ? d : "system";
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
