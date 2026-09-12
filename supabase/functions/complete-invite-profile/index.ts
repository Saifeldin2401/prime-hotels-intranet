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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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
    const propertyId =
      typeof body?.propertyId === "string" ? body.propertyId.trim() : "";

    if (action === "options") {
      const { data: profileRow, error: profileReadError } = await adminClient
        .from("profiles")
        .select("id, force_password_reset, password_initialized")
        .eq("id", user.id)
        .maybeSingle();

      if (profileReadError) {
        return new Response(
          JSON.stringify({
            error: `Failed to load profile: ${profileReadError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!profileRow) {
        return new Response(
          JSON.stringify({ error: "Profile record not found." }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const canCompleteInvite =
        profileRow.force_password_reset === true ||
        profileRow.password_initialized === false;
      if (!canCompleteInvite) {
        return new Response(
          JSON.stringify({
            error: "Invite completion is no longer allowed for this account.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // job_titles no longer exists as a lookup table (profiles.job_title is
      // free text), so there's nothing to enumerate for a dropdown anymore.
      const { data: propertyRows, error: propertyError } = await adminClient
        .from("hotels")
        .select("id, name, organization_id")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("name", { ascending: true });

      if (propertyError) {
        return new Response(
          JSON.stringify({
            error: `Failed to load properties: ${propertyError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const allPropertyOptions = (propertyRows || [])
        .map((row) => ({ id: row.id, name: row.name }))
        .filter(
          (property): property is { id: string; name: string } =>
            typeof property.id === "string" &&
            property.id.length > 0 &&
            typeof property.name === "string" &&
            property.name.length > 0,
        );

      // Property assignment now lives on organization_memberships.hotel_id
      // (a single primary hotel per membership) rather than a many-to-many
      // user_properties junction table, which no longer exists.
      const { data: existingMembership, error: membershipLookupError } =
        await adminClient
          .from("organization_memberships")
          .select("hotel_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

      if (membershipLookupError) {
        return new Response(
          JSON.stringify({
            error: `Failed to load assigned property: ${membershipLookupError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const assignedHotelId = existingMembership?.hotel_id || null;
      const assignedPropertyOptions = assignedHotelId
        ? allPropertyOptions.filter((p) => p.id === assignedHotelId)
        : [];

      const availableProperties =
        assignedPropertyOptions.length > 0
          ? assignedPropertyOptions
          : allPropertyOptions;

      return new Response(
        JSON.stringify({
          jobTitles: [],
          properties: Array.from(
            new Map(
              availableProperties.map((property) => [property.id, property]),
            ).values(),
          ),
          assignedPropertyIds: assignedHotelId ? [assignedHotelId] : [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!fullName) {
      return new Response(JSON.stringify({ error: "Full name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dateOfBirth || !isISODate(dateOfBirth)) {
      return new Response(
        JSON.stringify({
          error: "Date of birth must be in YYYY-MM-DD format.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dobDate.getTime()) || dobDate > today) {
      return new Response(
        JSON.stringify({ error: "Date of birth is invalid." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!propertyId || !isUuid(propertyId)) {
      return new Response(
        JSON.stringify({ error: "A valid property is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profileRow, error: profileReadError } = await adminClient
      .from("profiles")
      .select("id, force_password_reset, password_initialized")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      return new Response(
        JSON.stringify({
          error: `Failed to load profile: ${profileReadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!profileRow) {
      return new Response(
        JSON.stringify({ error: "Profile record not found." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const canCompleteInvite =
      profileRow.force_password_reset === true ||
      profileRow.password_initialized === false;
    if (!canCompleteInvite) {
      return new Response(
        JSON.stringify({
          error: "Invite completion is no longer allowed for this account.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: hotelRow, error: hotelLookupError } = await adminClient
      .from("hotels")
      .select("id, organization_id")
      .eq("id", propertyId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle();

    if (hotelLookupError || !hotelRow) {
      return new Response(
        JSON.stringify({ error: "Selected hotel property is not valid." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (hotelRow.organization_id) {
      const { data: isOperational } = await adminClient.rpc("org_is_operational", {
        p_org_id: hotelRow.organization_id,
      });

      if (isOperational === false) {
        return new Response(
          JSON.stringify({
            error: "Cannot complete account setup: the organization is suspended or inactive.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // job_titles is free text on profiles now; no lookup table to validate against.
    const normalizedJobTitle: string | null = jobTitleInput || null;

    const { data: existingMembershipForAssign, error: existingMembershipError } =
      await adminClient
        .from("organization_memberships")
        .select("hotel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (existingMembershipError) {
      return new Response(
        JSON.stringify({
          error: `Failed to check property assignment: ${existingMembershipError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const existingHotelId = existingMembershipForAssign?.hotel_id || null;
    if (existingHotelId && existingHotelId !== propertyId) {
      return new Response(
        JSON.stringify({
          error:
            "Property assignment is already set by admin and cannot be changed here.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
      return new Response(
        JSON.stringify({
          error: `Failed to update profile: ${profileUpdateError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Property assignment now happens via organization_memberships.hotel_id
    // below (user_properties junction table no longer exists).

    // Upsert organization membership context
    if (hotelRow?.organization_id) {
      const { error: membershipAssignError } = await adminClient
        .from("organization_memberships")
        .upsert(
          {
            user_id: user.id,
            organization_id: hotelRow.organization_id,
            role: "learner",
            hotel_id: propertyId,
            is_active: true,
            is_primary: true,
          },
          { onConflict: "user_id,organization_id" },
        );

      if (membershipAssignError) {
        console.error("Failed to assign organization membership:", membershipAssignError);
      }
    }

    const inviteEmail = typeof user.email === "string"
      ? user.email.trim().toLowerCase()
      : null;
    const invitationFilters = [`auth_user_id.eq.${user.id}`];
    if (inviteEmail) {
      invitationFilters.push(`email.eq.${inviteEmail}`);
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
      return new Response(
        JSON.stringify({
          error:
            `Failed to mark invitation as accepted: ${invitationUpdateError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        jobTitle: normalizedJobTitle,
        propertyId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
