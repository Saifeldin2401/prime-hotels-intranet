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
  return allowed[0] || "https://phg-connect.com";
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

      const [
        { data: jobTitleRows, error: jobTitleError },
        { data: propertyRows, error: propertyError },
      ] = await Promise.all([
        adminClient
          .from("job_titles")
          .select("title")
          .order("title", { ascending: true }),
        adminClient
          .from("properties")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (jobTitleError) {
        return new Response(
          JSON.stringify({
            error: `Failed to load job titles: ${jobTitleError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

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

      const normalizedJobTitles = (jobTitleRows || [])
        .map((row) => row.title)
        .filter(
          (title): title is string =>
            typeof title === "string" && title.trim().length > 0,
        );

      const allPropertyOptions = (propertyRows || [])
        .map((row) => ({ id: row.id, name: row.name }))
        .filter(
          (property): property is { id: string; name: string } =>
            typeof property.id === "string" &&
            property.id.length > 0 &&
            typeof property.name === "string" &&
            property.name.length > 0,
        );

      const { data: assignedProperties, error: assignedPropertiesError } =
        await adminClient
          .from("user_properties")
          .select("property_id, properties(id, name)")
          .eq("user_id", user.id);

      if (assignedPropertiesError) {
        return new Response(
          JSON.stringify({
            error: `Failed to load assigned properties: ${assignedPropertiesError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const assignedPropertyOptions = (assignedProperties || [])
        .map((row) => {
          const relatedProperty = row.properties as
            | { id?: string; name?: string }
            | { id?: string; name?: string }[]
            | null;
          const normalizedProperty = Array.isArray(relatedProperty)
            ? relatedProperty[0]
            : relatedProperty;
          if (!normalizedProperty?.id || !normalizedProperty?.name) return null;
          return { id: normalizedProperty.id, name: normalizedProperty.name };
        })
        .filter(
          (property): property is { id: string; name: string } => !!property,
        );

      const availableProperties =
        assignedPropertyOptions.length > 0
          ? assignedPropertyOptions
          : allPropertyOptions;

      const assignedPropertyIds = (assignedProperties || [])
        .map((row) => row.property_id)
        .filter((value): value is string => typeof value === "string");

      return new Response(
        JSON.stringify({
          jobTitles: Array.from(new Set(normalizedJobTitles)),
          properties: Array.from(
            new Map(
              availableProperties.map((property) => [property.id, property]),
            ).values(),
          ),
          assignedPropertyIds: Array.from(new Set(assignedPropertyIds)),
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

    const { data: propertyRow, error: propertyLookupError } = await adminClient
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("is_active", true)
      .maybeSingle();

    if (propertyLookupError || !propertyRow) {
      return new Response(
        JSON.stringify({ error: "Selected property is not valid." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let normalizedJobTitle: string | null = null;
    if (jobTitleInput) {
      const { data: jobTitleRow, error: jobTitleError } = await adminClient
        .from("job_titles")
        .select("title")
        .ilike("title", jobTitleInput)
        .limit(1)
        .maybeSingle();

      if (jobTitleError || !jobTitleRow?.title) {
        return new Response(
          JSON.stringify({ error: "Selected job title is not valid." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      normalizedJobTitle = jobTitleRow.title;
    }

    const { data: existingProperties, error: existingPropertiesError } =
      await adminClient
        .from("user_properties")
        .select("property_id")
        .eq("user_id", user.id);

    if (existingPropertiesError) {
      return new Response(
        JSON.stringify({
          error: `Failed to check property assignment: ${existingPropertiesError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const existingPropertyIds = (existingProperties || []).map(
      (row) => row.property_id,
    );
    if (
      existingPropertyIds.length > 0 &&
      !existingPropertyIds.includes(propertyId)
    ) {
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

    const { error: propertyAssignError } = await adminClient
      .from("user_properties")
      .upsert(
        { user_id: user.id, property_id: propertyId },
        { onConflict: "user_id,property_id", ignoreDuplicates: true },
      );

    if (propertyAssignError) {
      return new Response(
        JSON.stringify({
          error: `Failed to assign property: ${propertyAssignError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
