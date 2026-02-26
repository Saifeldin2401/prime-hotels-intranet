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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const dateOfBirth = typeof body?.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const jobTitleInput = typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
    const propertyId = typeof body?.propertyId === "string" ? body.propertyId.trim() : "";

    if (!fullName) {
      return new Response(JSON.stringify({ error: "Full name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dateOfBirth || !isISODate(dateOfBirth)) {
      return new Response(JSON.stringify({ error: "Date of birth must be in YYYY-MM-DD format." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dobDate.getTime()) || dobDate > today) {
      return new Response(JSON.stringify({ error: "Date of birth is invalid." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!propertyId || !isUuid(propertyId)) {
      return new Response(JSON.stringify({ error: "A valid property is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profileRow, error: profileReadError } = await adminClient
      .from("profiles")
      .select("id, force_password_reset, password_initialized")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      return new Response(JSON.stringify({ error: `Failed to load profile: ${profileReadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profileRow) {
      return new Response(JSON.stringify({ error: "Profile record not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const canCompleteInvite = profileRow.force_password_reset === true || profileRow.password_initialized === false;
    if (!canCompleteInvite) {
      return new Response(JSON.stringify({ error: "Invite completion is no longer allowed for this account." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: propertyRow, error: propertyLookupError } = await adminClient
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("is_active", true)
      .maybeSingle();

    if (propertyLookupError || !propertyRow) {
      return new Response(JSON.stringify({ error: "Selected property is not valid." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ error: "Selected job title is not valid." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      normalizedJobTitle = jobTitleRow.title;
    }

    const { data: existingProperties, error: existingPropertiesError } = await adminClient
      .from("user_properties")
      .select("property_id")
      .eq("user_id", user.id);

    if (existingPropertiesError) {
      return new Response(JSON.stringify({ error: `Failed to check property assignment: ${existingPropertiesError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingPropertyIds = (existingProperties || []).map((row) => row.property_id);
    if (existingPropertyIds.length > 0 && !existingPropertyIds.includes(propertyId)) {
      return new Response(JSON.stringify({ error: "Property assignment is already set by admin and cannot be changed here." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: `Failed to update profile: ${profileUpdateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: propertyAssignError } = await adminClient
      .from("user_properties")
      .upsert(
        { user_id: user.id, property_id: propertyId },
        { onConflict: "user_id,property_id", ignoreDuplicates: true },
      );

    if (propertyAssignError) {
      return new Response(JSON.stringify({ error: `Failed to assign property: ${propertyAssignError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      userId: user.id,
      jobTitle: normalizedJobTitle,
      propertyId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      error: "Unexpected error: " + (err?.message || String(err)),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


