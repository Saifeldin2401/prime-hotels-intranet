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
  "https://www.altus-advisory.com",
  "https://www.altus-advisory.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
] as const;

function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

function resolveCorsOrigin(req: Request): string {
  const origin = (req.headers.get("origin") || "").trim();
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] || "https://www.altus-advisory.com";
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDateOfBirth(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (isISODate(value)) return value;

  const mmddyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = mmddyyyy[1].padStart(2, "0");
    const day = mmddyyyy[2].padStart(2, "0");
    const year = mmddyyyy[3];
    return `${year}-${month}-${day}`;
  }

  return value;
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

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const action =
      typeof body?.action === "string" ? body.action.trim().toLowerCase() : "";
    const fullName =
      typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const dateOfBirth =
      typeof body?.dateOfBirth === "string"
        ? normalizeDateOfBirth(body.dateOfBirth)
        : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const jobTitleInput =
      typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";

    // The organization a new member joins comes from their invitation (or an
    // existing membership) - never from anything the invitee chooses. Hotels
    // were removed; a propertyId sent by older clients is ignored.
    const inviteEmail = typeof user.email === "string"
      ? user.email.trim().toLowerCase()
      : null;
    const invitationFilters = [`auth_user_id.eq.${user.id}`];
    if (inviteEmail) invitationFilters.push(`email.eq.${inviteEmail}`);

    const { data: invitationRows, error: invitationReadError } = await adminClient
      .from("user_invitations")
      .select("id, organization_id, department_id, role, status, invited_at")
      .or(invitationFilters.join(","))
      .order("invited_at", { ascending: false })
      .limit(5);
    if (invitationReadError) {
      return json({ error: `Failed to load invitation: ${invitationReadError.message}` }, 500);
    }
    const invitation = (invitationRows || []).find((row) => row.organization_id) || null;

    const { data: existingMemberships, error: membershipReadError } = await adminClient
      .from("organization_memberships")
      .select("id, organization_id, department_id, role, is_active")
      .eq("user_id", user.id);
    if (membershipReadError) {
      return json({ error: `Failed to load membership: ${membershipReadError.message}` }, 500);
    }

    const organizationId: string | null =
      invitation?.organization_id ||
      (existingMemberships || []).find((m) => m.is_active)?.organization_id ||
      null;

    const { data: profileRow, error: profileReadError } = await adminClient
      .from("profiles")
      .select("id, force_password_reset, password_initialized")
      .eq("id", user.id)
      .maybeSingle();
    if (profileReadError) {
      return json({ error: `Failed to load profile: ${profileReadError.message}` }, 500);
    }
    if (!profileRow) {
      return json({ error: "Profile record not found." }, 404);
    }
    const canCompleteInvite =
      profileRow.force_password_reset === true ||
      profileRow.password_initialized === false;
    if (!canCompleteInvite) {
      return json({ error: "Invite completion is no longer allowed for this account." }, 403);
    }

    if (action === "options") {
      // Older clients still ask for a property to choose. Offer only the
      // hotels of the invitation's own organization while that table exists;
      // after the hotel-removal migration this is always empty.
      let properties: { id: string; name: string }[] = [];
      if (organizationId) {
        const { data: hotelRows, error: hotelError } = await adminClient
          .from("hotels")
          .select("id, name")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("name", { ascending: true });
        if (!hotelError && hotelRows) {
          properties = hotelRows
            .filter((row) => typeof row.id === "string" && typeof row.name === "string")
            .map((row) => ({ id: row.id, name: row.name }));
        }
      }
      return json({
        jobTitles: [],
        properties,
        assignedPropertyIds: [],
        organizationId,
        propertyRequired: false,
      });
    }

    if (!fullName) {
      return json({ error: "Full name is required." }, 400);
    }
    if (!dateOfBirth || !isISODate(dateOfBirth)) {
      return json({ error: "Date of birth must be in YYYY-MM-DD format." }, 400);
    }
    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dobDate.getTime()) || dobDate > today) {
      return json({ error: "Date of birth is invalid." }, 400);
    }
    if (!organizationId) {
      return json({ error: "No invitation was found for this account. Ask your administrator to invite you again." }, 403);
    }

    const { data: isOperational } = await adminClient.rpc("org_is_operational", {
      p_org_id: organizationId,
    });
    if (isOperational === false) {
      return json({ error: "Cannot complete account setup: the organization is suspended or inactive." }, 403);
    }

    // job_title is free text on profiles.
    const normalizedJobTitle: string | null = jobTitleInput || null;

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        date_of_birth: dateOfBirth,
        phone: phone || null,
        job_title: normalizedJobTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (profileUpdateError) {
      return json({ error: `Failed to update profile: ${profileUpdateError.message}` }, 500);
    }

    // Membership: update the one in this organization, otherwise create it.
    // (An explicit update-or-insert: no unique constraint to upsert against.)
    const existing = (existingMemberships || []).find((m) => m.organization_id === organizationId) || null;
    if (existing) {
      const { error: membershipUpdateError } = await adminClient
        .from("organization_memberships")
        .update({
          is_active: true,
          department_id: existing.department_id || invitation?.department_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (membershipUpdateError) {
        return json({ error: `Failed to activate membership: ${membershipUpdateError.message}` }, 500);
      }
    } else {
      const { error: membershipInsertError } = await adminClient
        .from("organization_memberships")
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role: invitation?.role || "learner",
          department_id: invitation?.department_id || null,
          is_active: true,
          is_primary: true,
        });
      if (membershipInsertError) {
        return json({ error: `Failed to create membership: ${membershipInsertError.message}` }, 500);
      }
    }

    const { error: invitationUpdateError } = await adminClient
      .from("user_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(invitationFilters.join(","));
    if (invitationUpdateError) {
      return json({ error: `Failed to mark invitation as accepted: ${invitationUpdateError.message}` }, 500);
    }

    return json({
      success: true,
      userId: user.id,
      jobTitle: normalizedJobTitle,
      organizationId,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error: " + (err?.message || String(err)),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
