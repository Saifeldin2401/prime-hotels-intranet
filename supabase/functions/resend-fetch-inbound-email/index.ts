import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedServiceRoleRequest } from "../_shared/auth.ts";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function buildResendHeaders(apiKey: string): HeadersInit {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const isServiceRoleCall = isAuthorizedServiceRoleRequest(authHeader, SUPABASE_SERVICE_ROLE_KEY)

  if (!isServiceRoleCall) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!anonKey) {
      return jsonResponse({ error: "Missing SUPABASE_ANON_KEY" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user?.id) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const allowedRoles = [
      "corporate_admin",
      "regional_admin",
      "regional_hr",
      "property_manager",
      "property_hr",
    ]

    const { data: roles, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", allowedRoles)

    if (roleError) {
      return jsonResponse({ error: "Failed to validate permissions" }, 500)
    }

    if (!roles || roles.length === 0) {
      return jsonResponse({ error: "Forbidden" }, 403)
    }
  }

  let body: { emailId?: string };
  try {
    body = (await req.json()) as { emailId?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const emailId = (body.emailId || "").trim();
  if (!emailId) {
    return jsonResponse({ error: "Missing emailId" }, 400);
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const base = "https://api.resend.com";

  // 1) Fetch the received email content.
  const emailRes = await fetch(`${base}/emails/receiving/${encodeURIComponent(emailId)}`, {
    method: "GET",
    headers: buildResendHeaders(RESEND_API_KEY),
  });

  if (!emailRes.ok) {
    const text = await emailRes.text().catch(() => "");
    await serviceClient
      .from("inbound_emails")
      .update({ content_fetch_error: `${emailRes.status} ${text}`.slice(0, 500) })
      .eq("email_id", emailId);

    return jsonResponse({ error: "Failed to fetch received email" }, 502);
  }

  const received = (await emailRes.json()) as {
    id: string;
    html: string | null;
    text: string | null;
    headers: Record<string, string> | null;
    reply_to: string[] | null;
    raw?: { download_url?: string | null; expires_at?: string | null } | null;
  };

  // 2) Fetch attachment download URLs (if any).
  const attRes = await fetch(`${base}/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    method: "GET",
    headers: buildResendHeaders(RESEND_API_KEY),
  });

  let attachmentDownloads: unknown[] = [];
  if (attRes.ok) {
    const attJson = (await attRes.json()) as { data?: unknown[] };
    attachmentDownloads = attJson.data || [];
  }

  const { error: updateError } = await serviceClient
    .from("inbound_emails")
    .update({
      html: received.html,
      text: received.text,
      headers: received.headers,
      reply_to: received.reply_to ?? [],
      raw_download_url: received.raw?.download_url ?? null,
      raw_expires_at: received.raw?.expires_at ?? null,
      attachment_downloads: attachmentDownloads,
      content_fetched_at: new Date().toISOString(),
      content_fetch_error: null,
    })
    .eq("email_id", emailId);

  if (updateError) {
    return jsonResponse({ error: "Failed to store received email content" }, 500);
  }

  return jsonResponse({ ok: true });
});
