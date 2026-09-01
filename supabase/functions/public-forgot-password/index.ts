import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CANONICAL_APP_URL = "https://www.phg-connect.com";

type ResolvedAppUrl = {
  appUrl: string;
  source: string;
  usedFallback: boolean;
};

function buildResponseHeaders(
  corsHeaders: Record<string, string>,
  requestId: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    ...corsHeaders,
    ...extraHeaders,
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
}

function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
  requestId: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: buildResponseHeaders(corsHeaders, requestId, extraHeaders),
  });
}

function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown>,
): void {
  const logger =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;
  logger(`[public-forgot-password] ${message}`, context);
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function resolveClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

function resolveAppUrl(req: Request): ResolvedAppUrl {
  const candidates = [
    { value: (Deno.env.get("APP_URL") || "").trim(), source: "APP_URL" },
    {
      value: (Deno.env.get("APP_BASE_URL") || "").trim(),
      source: "APP_BASE_URL",
    },
    { value: (Deno.env.get("SITE_URL") || "").trim(), source: "SITE_URL" },
    { value: (req.headers.get("origin") || "").trim(), source: "origin" },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) continue;
    try {
      const parsed = new URL(candidate.value);
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return {
        appUrl: parsed.toString().replace(/\/$/, ""),
        source: candidate.source,
        usedFallback: false,
      };
    } catch {
      // Ignore invalid candidates.
    }
  }

  return {
    appUrl: CANONICAL_APP_URL,
    source: "default_fallback",
    usedFallback: true,
  };
}

async function enforceRateLimit(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  ip: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowMinutes = 15;
  const maxPerIp = 5;
  const maxPerEmail = 5;

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count: ipCount } = await adminClient
    .from("password_reset_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", since);

  if (typeof ipCount === "number" && ipCount >= maxPerIp) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  const { count: emailCount } = await adminClient
    .from("password_reset_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if (typeof emailCount === "number" && emailCount >= maxPerEmail) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  return { allowed: true };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildResponseHeaders(corsHeaders, requestId),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" },
      405,
      corsHeaders,
      requestId,
    );
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      logEvent("error", "missing_env_configuration", {
        requestId,
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasAnonKey: Boolean(SUPABASE_ANON_KEY),
        hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      });
      return jsonResponse(
        { error: "Missing environment configuration" },
        500,
        corsHeaders,
        requestId,
      );
    }

    const body = (await req.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body?.email);

    if (!email || !email.includes("@")) {
      return jsonResponse({ success: true }, 200, corsHeaders, requestId);
    }

    const ip = resolveClientIp(req);
    const emailDomain = email.split("@")[1] || "unknown";

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rate = await enforceRateLimit(adminClient, email, ip);
    if (!rate.allowed) {
      const extraHeaders: Record<string, string> = {};
      if (rate.retryAfterSeconds) {
        extraHeaders["Retry-After"] = rate.retryAfterSeconds.toString();
      }
      logEvent("warn", "rate_limit_blocked", {
        requestId,
        ip,
        emailDomain,
        retryAfterSeconds: rate.retryAfterSeconds ?? null,
      });
      return jsonResponse(
        { error: "Too many requests" },
        429,
        corsHeaders,
        requestId,
        extraHeaders,
      );
    }

    await adminClient
      .from("password_reset_requests")
      .insert({ email, ip_address: ip })
      .then(() => undefined)
      .catch(() => undefined);

    const resolvedAppUrl = resolveAppUrl(req);
    const resetRedirectTo = `${resolvedAppUrl.appUrl}/reset-password`;

    if (resolvedAppUrl.usedFallback) {
      logEvent("warn", "app_url_fallback_used", {
        requestId,
        appUrl: resolvedAppUrl.appUrl,
        source: resolvedAppUrl.source,
        resetRedirectTo,
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .ilike("email", email)
      .maybeSingle();

    const profileUserId = profile?.id || null;
    const recipientName = (profile?.full_name || "").trim() || email;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: resetRedirectTo,
        },
      });

    if (linkError) {
      logEvent("error", "generate_link_failed", {
        requestId,
        emailDomain,
        redirectTo: resetRedirectTo,
        appUrl: resolvedAppUrl.appUrl,
        source: resolvedAppUrl.source,
        error: linkError.message,
      });
    } else {
      const hashedToken = linkData?.properties?.hashed_token || null;
      if (!hashedToken) {
        logEvent("warn", "hashed_token_missing", {
          requestId,
          emailDomain,
          redirectTo: resetRedirectTo,
        });
      }

      const resetLink = hashedToken
        ? `${resetRedirectTo}?token_hash=${hashedToken}&type=recovery`
        : resetRedirectTo;

      let emailSendSuccess = false;
      let emailSendStatus = 0;
      let emailSendResponse = "";
      let emailSendError = "";

      try {
        const emailResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({
              to: email,
              templateKey: "auth_password_reset",
              title: "Password reset",
              message: "Use the link below to reset your account password.",
              actionUrl: resetLink,
              actionLabel: "Reset Password",
              businessDomain: "user_management",
              notificationType: "system",
              userId: profileUserId || undefined,
              variables: {
                recipient_name: recipientName,
                reset_url: resetLink,
              },
            }),
          },
        );

        emailSendStatus = emailResponse.status;
        emailSendSuccess = emailResponse.ok;
        if (!emailResponse.ok) {
          emailSendResponse = await emailResponse.text().catch(() => "");
          logEvent("warn", "email_send_failed", {
            requestId,
            emailDomain,
            status: emailResponse.status,
            responseText: emailSendResponse,
            resetRedirectTo,
          });
        }
      } catch (emailError) {
        emailSendError = emailError instanceof Error ? emailError.message : String(emailError);
        logEvent("warn", "email_send_failed", {
          requestId,
          emailDomain,
          resetRedirectTo,
          error: emailSendError,
        });
      }
    }

    if (profileUserId) {
      await adminClient
        .from("audit_logs")
        .insert({
          user_id: profileUserId,
          action: "user.password_reset_requested",
          entity_type: "user",
          entity_id: profileUserId,
          details: {
            source: "public-forgot-password",
            request_id: requestId,
            email_send: {
              success: emailSendSuccess,
              status: emailSendStatus,
              response: emailSendResponse,
              error: emailSendError,
            },
          },
          ip_address: ip,
        })
        .then(() => undefined)
        .catch(() => undefined);
    }

    return jsonResponse({ success: true }, 200, corsHeaders, requestId);
  } catch (err) {
    logEvent("error", "unexpected_error", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse({ success: true }, 200, corsHeaders, requestId);
  }
});
