import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://phg-connect.com",
  "https://www.phg-connect.com",
  "http://localhost:5173",
  "http://localhost:3000",
] as const;

type AppRole =
  | "corporate_admin"
  | "regional_admin"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "department_head"
  | "manager"
  | "staff";

const CREATOR_ROLES = new Set<AppRole>([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
]);

function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];
  const parsed = raw.split(",").map((origin) => origin.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

function resolveCorsOrigin(req: Request): string {
  const origin = (req.headers.get("origin") || "").trim();
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] || "https://phg-connect.com";
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && [
    "corporate_admin",
    "regional_admin",
    "regional_hr",
    "property_manager",
    "property_hr",
    "department_head",
    "manager",
    "staff",
  ].includes(value);
}

function resolveAppUrl(req: Request, appUrlFromBody: unknown): string {
  const rawCandidates = [
    typeof appUrlFromBody === "string" ? appUrlFromBody.trim() : "",
    (Deno.env.get("APP_URL") || "").trim(),
    (Deno.env.get("SITE_URL") || "").trim(),
    (req.headers.get("origin") || "").trim(),
  ];

  for (const candidate of rawCandidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname === "www.phg-connect.com") {
        parsed.hostname = "phg-connect.com";
      }
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      // Ignore invalid candidate URL and try next.
    }
  }

  return "https://phg-connect.com";
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = typeof body.invitationId === "string"
      ? body.invitationId.trim()
      : "";
    const appUrl = resolveAppUrl(req, body.appUrl);

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Missing invitationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: roleRows, error: rolesError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify inviter permissions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const inviterRoles = (roleRows || []).map((row) => row.role).filter(isAppRole);
    if (!inviterRoles.some((role) => CREATOR_ROLES.has(role))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Insufficient privileges" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: invitation, error: invitationError } = await adminClient
      .from("user_invitations")
      .select("id, auth_user_id, email, role, metadata")
      .eq("id", invitationId)
      .maybeSingle();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!invitation.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Invitation cannot be resent because no auth user is linked." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const metadata = typeof invitation.metadata === "object" && invitation.metadata
      ? invitation.metadata as Record<string, unknown>
      : {};

    const redirectTo = `${appUrl}/complete-invite`;
    const generatedInvite = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: invitation.email,
      data: {
        full_name: typeof metadata.full_name === "string" ? metadata.full_name : "",
      },
      options: {
        redirectTo,
      },
    });

    if (generatedInvite.error || !generatedInvite.data?.properties) {
      return new Response(
        JSON.stringify({ error: generatedInvite.error?.message || "Failed to generate invitation link." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const inviteTokenHash = generatedInvite.data.properties.hashed_token ?? null;
    const inviteUrl = inviteTokenHash
      ? `${redirectTo}?token_hash=${inviteTokenHash}&type=invite`
      : generatedInvite.data.properties.action_link || redirectTo;

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        to: invitation.email,
        subject: "You are invited to PHG Connect",
        title: "Complete your account setup",
        message:
          "You have been invited to PHG Connect. Open the link below to set your password and complete your profile.",
        actionUrl: inviteUrl,
        actionLabel: "Complete Account Setup",
        businessDomain: "user_management",
        notificationType: "system",
        variables: {
          recipient_name: typeof metadata.full_name === "string"
            ? metadata.full_name
            : invitation.email,
          invite_url: inviteUrl,
        },
      }),
    });

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send invitation email." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await adminClient
      .from("user_invitations")
      .update({
        token_hash: inviteTokenHash,
        invite_url: inviteUrl,
        invited_at: nowIso,
        expires_at: expiresAt,
        status: "pending",
        updated_at: nowIso,
      })
      .eq("id", invitation.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update invitation record." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, invitationId: invitation.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected resend invitation error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
