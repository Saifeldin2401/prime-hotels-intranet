import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(payload: Record<string, unknown>, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

function resolveAppUrl(req: Request): string {
  const candidates = [
    (Deno.env.get("APP_URL") || "").trim(),
    (Deno.env.get("APP_BASE_URL") || "").trim(),
    (Deno.env.get("SITE_URL") || "").trim(),
    (req.headers.get("origin") || "").trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      // ignore
    }
  }

  return "https://phg-connect.com";
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
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing environment configuration" }, 500, corsHeaders);
    }

    const body = (await req.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body?.email);

    if (!email || !email.includes("@")) {
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    const ip = resolveClientIp(req);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rate = await enforceRateLimit(adminClient, email, ip);
    if (!rate.allowed) {
      const headers = { ...corsHeaders };
      if (rate.retryAfterSeconds) headers["Retry-After"] = rate.retryAfterSeconds.toString();
      return jsonResponse({ error: "Too many requests" }, 429, headers);
    }

    await adminClient
      .from("password_reset_requests")
      .insert({ email, ip_address: ip })
      .then(() => undefined)
      .catch(() => undefined);

    const appUrl = resolveAppUrl(req);
    const resetRedirectTo = `${appUrl}/reset-password`;

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .ilike("email", email)
      .maybeSingle();

    const profileUserId = profile?.id || null;
    const recipientName = (profile?.full_name || "").trim() || email;

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: resetRedirectTo,
      },
    });

    if (!linkError) {
      const hashedToken = linkData?.properties?.hashed_token || null;

      // ALWAYS use direct token_hash link. Do NOT use action_link because
      // it routes through Supabase's /auth/v1/verify which does a 303 redirect,
      // and that redirect fails with "access_denied" if the redirect URL is not
      // perfectly whitelisted in the Supabase dashboard. Direct links go straight
      // to our app where ResetPassword.tsx verifies the token client-side.
      const resetLink = hashedToken
        ? `${resetRedirectTo}?token_hash=${hashedToken}&type=recovery`
        : resetRedirectTo;

      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          to: email,
          templateKey: "system_generic_alert",
          title: "Password reset",
          message: "Use the link below to reset your PHG Connect password.",
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
      }).then(() => undefined).catch(() => undefined);
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
          },
          ip_address: ip,
        })
        .then(() => undefined)
        .catch(() => undefined);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error("public-forgot-password unexpected error:", err);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }
});
