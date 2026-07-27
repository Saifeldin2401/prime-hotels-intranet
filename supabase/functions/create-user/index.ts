import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.phg-connect.com",
  "https://www.phg-connect.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
] as const;
const CANONICAL_APP_URL = "https://www.phg-connect.com";

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
  return allowed[0] || "https://www.phg-connect.com";
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

const TEMP_PASSWORD_LENGTH = 20;
const TEMP_PASSWORD_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}<>?",
} as const;

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0)
    throw new Error("randomInt maxExclusive must be positive");
  const upper = 0xffffffff;
  const limit = Math.floor(upper / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);

  let value = upper;
  while (value >= limit) {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  }

  return value % maxExclusive;
}

function pickRandomChar(charset: string): string {
  return charset[randomInt(charset.length)];
}

function generateSecureTemporaryPassword(
  length = TEMP_PASSWORD_LENGTH,
): string {
  const minLength = 12;
  const targetLength = Math.max(length, minLength);
  const requiredChars = [
    pickRandomChar(TEMP_PASSWORD_SETS.lower),
    pickRandomChar(TEMP_PASSWORD_SETS.upper),
    pickRandomChar(TEMP_PASSWORD_SETS.digits),
    pickRandomChar(TEMP_PASSWORD_SETS.symbols),
  ];

  const allChars = `${TEMP_PASSWORD_SETS.lower}${TEMP_PASSWORD_SETS.upper}${TEMP_PASSWORD_SETS.digits}${TEMP_PASSWORD_SETS.symbols}`;
  const passwordChars = [...requiredChars];

  while (passwordChars.length < targetLength) {
    passwordChars.push(pickRandomChar(allChars));
  }

  // Fisher-Yates shuffle with CSPRNG-backed randomInt.
  for (let i = passwordChars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Accept full ISO strings and take the date portion.
  const datePart = trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;
  return datePart;
}

type ProvisioningMethod = "temporary_password" | "invite";

function isProvisioningMethod(value: unknown): value is ProvisioningMethod {
  return value === "temporary_password" || value === "invite";
}

type AppRole =
  | "corporate_admin"
  | "regional_admin"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "department_head"
  | "manager"
  | "staff";

const APP_ROLE_PRIORITY: Record<AppRole, number> = {
  corporate_admin: 1,
  regional_admin: 2,
  regional_hr: 3,
  property_manager: 4,
  property_hr: 5,
  department_head: 6,
  manager: 7,
  staff: 8,
};

const CREATOR_ROLES = new Set<AppRole>([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
]);

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && value in APP_ROLE_PRIORITY;
}

function getMostPrivilegedRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  return roles.reduce((best, current) =>
    APP_ROLE_PRIORITY[current] < APP_ROLE_PRIORITY[best] ? current : best,
  );
}

function resolveAppUrl(req: Request, appUrlFromBody: unknown): string | null {
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
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      // Ignore invalid candidate URL and try next.
    }
  }

  return null;
}

function buildInviteCompletionUrl(baseUrl: string, tokenHash: string): string {
  const inviteUrl = new URL(baseUrl);
  inviteUrl.searchParams.set("token_hash", tokenHash);
  inviteUrl.searchParams.set("type", "invite");
  return inviteUrl.toString();
}

type GenerateInviteResult = {
  userId: string | null;
  error: unknown;
  tokenHash: string | null;
  actionLink: string | null;
};

async function generateInviteLink(
  email: string,
  authMetadata: Record<string, string>,
  redirectTo: string,
): Promise<GenerateInviteResult> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    data: authMetadata,
    options: {
      redirectTo,
    },
  });

  return {
    userId: data?.user?.id ?? null,
    error,
    tokenHash: data?.properties?.hashed_token ?? null,
    actionLink: data?.properties?.action_link ?? null,
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email,
      fullName,
      phone,
      jobTitle,
      role,
      propertyIds: rawPropertyIds = [],
      departmentIds: rawDepartmentIds = [],
      reportingTo,
      dateOfBirth,
      date_of_birth,
      provisioningMethod: rawProvisioningMethod = "temporary_password",
      appUrl,
    } = body;

    if (!isProvisioningMethod(rawProvisioningMethod)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid provisioningMethod. Expected 'temporary_password' or 'invite'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const provisioningMethod: ProvisioningMethod = rawProvisioningMethod;
    const temporaryPassword =
      provisioningMethod === "temporary_password"
        ? generateSecureTemporaryPassword()
        : null;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedFullName =
      typeof fullName === "string" ? fullName.trim() : "";
    const normalizedRoleInput =
      typeof role === "string" ? role.trim().toLowerCase() : "";
    const normalizedRole: AppRole | null = isAppRole(normalizedRoleInput)
      ? normalizedRoleInput
      : null;
    const propertyIds = Array.isArray(rawPropertyIds)
      ? rawPropertyIds.filter(
          (pid): pid is string =>
            typeof pid === "string" && pid.trim().length > 0,
        )
      : [];
    const departmentIds = Array.isArray(rawDepartmentIds)
      ? rawDepartmentIds.filter(
          (did): did is string =>
            typeof did === "string" && did.trim().length > 0,
        )
      : [];

    const normalizedDob = normalizeDateOnly(dateOfBirth ?? date_of_birth);
    const requiresFullProfile = provisioningMethod === "temporary_password";

    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requiresFullProfile && (!normalizedFullName || !normalizedDob)) {
      return new Response(
        JSON.stringify({ error: "Missing fullName or dateOfBirth" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (normalizedDob && !isISODate(normalizedDob)) {
      return new Response(
        JSON.stringify({
          error: "Invalid dateOfBirth format. Expected YYYY-MM-DD",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!normalizedRole) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid role" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // =================================================================
    // SECURITY CHECK: START
    // =================================================================
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid Token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check Roles (Must be Regional Admin, HR, or Corporate Admin)
    // Use adminClient to bypass RLS — the caller's identity is already verified
    // via getUser() above. Using userClient here was causing false permission
    // denials when RLS policies didn't return the caller's own role rows.
    const { data: roles, error: rolesError } = await adminClient
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

    const inviterRoles = (roles || []).map((r) => r.role).filter(isAppRole);
    const inviterBestRole = getMostPrivilegedRole(inviterRoles);
    const hasPermission = inviterRoles.some((currentRole) =>
      CREATOR_ROLES.has(currentRole),
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Insufficient privileges" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!inviterBestRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: No valid inviter role found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      APP_ROLE_PRIORITY[normalizedRole] <= APP_ROLE_PRIORITY[inviterBestRole]
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Forbidden: You cannot assign a role equal to or higher than your own.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    // =================================================================
    // SECURITY CHECK: END
    // =================================================================

    console.log(
      `Creating user: ${normalizedEmail}, mode: ${provisioningMethod}, jobTitle: ${jobTitle}, role: ${normalizedRole}, reportingTo: ${reportingTo}, by: ${user.email}`,
    );

    // Validate job title against FK target to avoid opaque profile FK errors.
    // If the provided title can't be matched, fall back to NULL instead of failing user creation.
    let normalizedJobTitle: string | null = null;
    if (typeof jobTitle === "string" && jobTitle.trim().length > 0) {
      const trimmedJobTitle = jobTitle.trim();
      const { data: titleRow, error: titleLookupError } = await adminClient
        .from("job_titles")
        .select("title")
        .ilike("title", trimmedJobTitle)
        .limit(1)
        .maybeSingle();

      if (titleLookupError) {
        console.error("Job title lookup failed:", titleLookupError);
        // Continue without job title rather than failing user creation.
      } else if (!titleRow?.title) {
        console.warn(
          `Job title not found for "${trimmedJobTitle}", continuing with null job_title`,
        );
      } else {
        normalizedJobTitle = titleRow.title;
      }
    }

    // 1. Create Auth User
    let authData: { user?: { id?: string } } | null = null;
    let authError: any = null;
    let inviteTokenHash: string | null = null;
    let inviteActionLink: string | null = null;
    const resolvedAppUrl = resolveAppUrl(req, appUrl) || CANONICAL_APP_URL;
    const inviteRedirectTo = `${resolvedAppUrl}/complete-invite`;
    const authMetadata: Record<string, string> = {};
    if (normalizedFullName) authMetadata.full_name = normalizedFullName;
    if (normalizedDob) authMetadata.date_of_birth = normalizedDob;
    try {
      if (provisioningMethod === "invite") {
        const generatedInvite = await generateInviteLink(
          normalizedEmail,
          authMetadata,
          inviteRedirectTo,
        );
        authData = generatedInvite.userId
          ? { user: { id: generatedInvite.userId } }
          : null;
        authError = generatedInvite.error;
        inviteTokenHash = generatedInvite.tokenHash;
        inviteActionLink = generatedInvite.actionLink;
      } else {
        const result = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: temporaryPassword!,
          email_confirm: true,
          user_metadata: authMetadata,
        });
        authData = result.data;
        authError = result.error;
      }
    } catch (e: any) {
      console.error("Auth creation threw error:", e);
      authError = { message: e.message || e.toString(), details: e };
    }

    if (authError) {
      console.error("Auth creation failed:", authError);
      const message = authError.message?.includes("date_of_birth")
        ? "Failed to create user: date of birth is required by profile constraints."
        : authError.message;
      return new Response(JSON.stringify({ error: message }), {
        status: 400, // Return 400 for validation/duplicate/auth errors
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User creation did not return a user id." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log(`User created: ${userId}`);

    // 2. Update Profile (Job Title, Phone, Active, Reporting To)
    // Retry logic could be added here if trigger is slow, but usually it's immediate within transaction or shortly after
    const profileUpdate: Record<string, unknown> = {
      phone: phone || null,
      job_title: normalizedJobTitle,
      is_active: true,
      is_temp_password: true,
      reporting_to: reportingTo || null,
    };

    if (normalizedFullName) {
      profileUpdate.full_name = normalizedFullName;
    }
    if (normalizedDob) {
      profileUpdate.date_of_birth = normalizedDob;
    }

    if (provisioningMethod === "invite") {
      profileUpdate.force_password_reset = true;
      profileUpdate.password_initialized = false;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update failed:", profileError);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          error: "Failed to update profile: " + profileError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Assign Role (user_roles)
    const roleToAssign = normalizedRole;
    if (roleToAssign) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role: roleToAssign });

      if (roleError) {
        console.error("Role assignment failed:", roleError);
        return new Response(
          JSON.stringify({
            error: "Failed to assign role: " + roleError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 4. Assign Properties
    if (propertyIds.length > 0) {
      const { error: propError } = await adminClient
        .from("user_properties")
        .insert(
          propertyIds.map((pid: string) => ({
            user_id: userId,
            property_id: pid,
          })),
        );

      if (propError) {
        console.error("Property assignment failed:", propError);
      }
    }

    // 5. Assign Departments
    if (departmentIds.length > 0) {
      const { error: deptError } = await adminClient
        .from("user_departments")
        .insert(
          departmentIds.map((did: string) => ({
            user_id: userId,
            department_id: did,
          })),
        );

      if (deptError) {
        console.error("Department assignment failed:", deptError);
      }
    }

    // 6. Send Welcome Email (temp password mode only).
    if (provisioningMethod === "temporary_password") {
      try {
        console.log(`Sending welcome email to ${normalizedEmail}...`);
        const welcomeMsg =
          "Welcome to PHG Connect. Your account is now active and ready for first-time access.";

        const emailResponse = await fetch(
          supabaseUrl + "/functions/v1/send-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader!,
            },
            body: JSON.stringify({
              to: normalizedEmail,
              templateKey: "user_management_welcome",
              title: "Portal Access Credentials",
              message: welcomeMsg,
              actionLabel: "Sign In to PHG Connect",
              variables: {
                recipient_name: normalizedFullName,
                credential_email: normalizedEmail,
                credential_password: temporaryPassword,
                security_note:
                  "For your security, you must change this temporary password after your first successful sign in.",
              },
              actionUrl: "/",
              businessDomain: "user_management",
              notificationType: "system",
            }),
          },
        );

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error("Failed to send welcome email:", errorData);
        } else {
          console.log("Welcome email successfully sent to " + normalizedEmail);
        }
      } catch (emailErr) {
        console.error("Error calling send-email function:", emailErr);
      }
    }

    // 7. Send invite email via Resend (all environments).
    if (provisioningMethod === "invite") {
      const inviteUrl = inviteTokenHash
        ? buildInviteCompletionUrl(inviteRedirectTo, inviteTokenHash)
        : inviteActionLink || inviteRedirectTo;

      if (!inviteTokenHash && !inviteActionLink) {
        await adminClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to generate invitation link." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        const inviteMessage =
          "You have been invited to PHG Connect. Open the link below to set your password and complete your profile.";
        const emailResponse = await fetch(
          supabaseUrl + "/functions/v1/send-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader!,
            },
            body: JSON.stringify({
              to: normalizedEmail,
              subject: "You are invited to PHG Connect",
              title: "Complete your account setup",
              message: inviteMessage,
              actionUrl: inviteUrl,
              actionLabel: "Complete Account Setup",
              businessDomain: "user_management",
              notificationType: "system",
              variables: {
                recipient_name: normalizedFullName || normalizedEmail,
                invite_url: inviteUrl,
              },
            }),
          },
        );

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error("Failed to send invite email:", errorData);
          await adminClient.auth.admin.deleteUser(userId);
          return new Response(
            JSON.stringify({ error: "Failed to send invitation email." }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (inviteEmailErr) {
        console.error("Error sending invite email:", inviteEmailErr);
        await adminClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to send invitation email." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const invitationMetadata = {
        full_name: normalizedFullName || null,
        created_via: "create-user",
      };

      const { error: invitationError } = await adminClient
        .from("user_invitations")
        .upsert({
          auth_user_id: userId,
          email: normalizedEmail,
          role: normalizedRole,
          property_id: propertyIds[0] || null,
          department_id: departmentIds[0] || null,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          token_hash: inviteTokenHash,
          invite_url: inviteUrl,
          accepted_at: null,
          metadata: invitationMetadata,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "auth_user_id",
        });

      if (invitationError) {
        console.error("Failed to store invitation record:", invitationError);
        await adminClient.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to store invitation details." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        userId: userId,
        success: true,
        provisioningMethod,
        invitationSent: provisioningMethod === "invite",
        ...(provisioningMethod === "temporary_password"
          ? { tempPassword: temporaryPassword }
          : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Edge create-user unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error while creating user." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
