import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("SUPABASE_URL is set:", !!Deno.env.get("SUPABASE_URL"));
console.log(
  "SUPABASE_SERVICE_ROLE_KEY is set:",
  !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);
console.log("SUPABASE_ANON_KEY is set:", !!Deno.env.get("SUPABASE_ANON_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

console.log("Environment check passed");

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.altus-advisory.com",
  "https://www.altus-advisory.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
] as const;
const CANONICAL_APP_URL = "https://www.altus-advisory.com";

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

  for (let i = passwordChars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

type AccountAction =
  | "suspend"
  | "reactivate"
  | "force_password_reset"
  | "cancel_password_reset"
  | "unlock"
  | "resend_credentials";

const VALID_ACTIONS: Set<string> = new Set([
  "suspend",
  "reactivate",
  "force_password_reset",
  "cancel_password_reset",
  "unlock",
  "resend_credentials",
]);

type AppRole =
  | "administrator"
  | "super_admin"
  | "corporate_admin"
  | "regional_admin"
  | "training_manager"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "knowledge_manager"
  | "department_head"
  | "author"
  | "manager"
  | "learner"
  | "staff";

const ALLOWED_ROLES = new Set<AppRole>([
  "administrator",
  "super_admin",
  "corporate_admin",
  "regional_admin",
  "training_manager",
  "regional_hr",
  "property_manager",
  "property_hr",
]);

const APP_ROLE_PRIORITY: Record<AppRole, number> = {
  administrator: 0,
  super_admin: 0,
  corporate_admin: 1,
  training_manager: 2,
  regional_admin: 2,
  knowledge_manager: 3,
  regional_hr: 3,
  property_manager: 4,
  property_hr: 5,
  department_head: 6,
  author: 6,
  manager: 7,
  learner: 8,
  staff: 8,
};

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && value in APP_ROLE_PRIORITY;
}

function getMostPrivilegedRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  return roles.reduce((best, current) =>
    APP_ROLE_PRIORITY[current] < APP_ROLE_PRIORITY[best] ? current : best,
  );
}

function resolveAppUrl(req: Request): string {
  const candidates = [
    (Deno.env.get("APP_URL") || "").trim(),
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
      // skip invalid
    }
  }

  return CANONICAL_APP_URL;
}

function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse body
    const body = await req.json();
    const { action, user_id, reason } = body as {
      action: string;
      user_id: string;
      reason?: string;
    };

    if (!action || !VALID_ACTIONS.has(action)) {
      return jsonResponse(
        { error: "Invalid or missing action" },
        400,
        corsHeaders,
      );
    }

    if (!user_id || typeof user_id !== "string") {
      return jsonResponse({ error: "Missing user_id" }, 400, corsHeaders);
    }

    // 2. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Unauthorized: Missing Authorization header" },
        401,
        corsHeaders,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse(
        { error: "Unauthorized: Invalid token" },
        401,
        corsHeaders,
      );
    }

    // 3. Verify caller has admin/management role
    const { data: callerRoles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    if (rolesError) {
      return jsonResponse(
        { error: "Failed to verify permissions" },
        500,
        corsHeaders,
      );
    }

    const callerAppRoles = (callerRoles || [])
      .map((r: { role: string }) => r.role)
      .filter(isAppRole);
    const hasPermission = callerAppRoles.some((role: AppRole) =>
      ALLOWED_ROLES.has(role),
    );

    if (!hasPermission) {
      return jsonResponse(
        { error: "Forbidden: Insufficient privileges" },
        403,
        corsHeaders,
      );
    }

    const callerBestRole = getMostPrivilegedRole(callerAppRoles);

    // 4. Prevent self-action
    if (caller.id === user_id) {
      return jsonResponse(
        { error: "Cannot perform this action on your own account" },
        400,
        corsHeaders,
      );
    }

    // 5. Get the target user's profile and email
    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select(
        "id, email, full_name, account_status, is_active, is_temp_password, password_initialized, force_password_reset",
      )
      .eq("id", user_id)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return jsonResponse({ error: "Target user not found" }, 404, corsHeaders);
    }

    const { data: targetRoleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id);

    const targetRoles = (targetRoleRows || [])
      .map((r: { role: string }) => r.role)
      .filter(isAppRole);
    const targetBestRole = getMostPrivilegedRole(targetRoles);

    if (
      callerBestRole &&
      targetBestRole &&
      APP_ROLE_PRIORITY[targetBestRole] <= APP_ROLE_PRIORITY[callerBestRole]
    ) {
      return jsonResponse(
        {
          error:
            "Forbidden: cannot act on users with equal or higher privileges",
        },
        403,
        corsHeaders,
      );
    }

    // Check if caller is a platform operator
    const { data: isOp } = await adminClient.rpc("is_platform_operator", {
      p_user_id: caller.id,
    });

    let sharesActiveOrgWithAuth = !!isOp;

    if (!sharesActiveOrgWithAuth) {
      // Query caller's active admin organizations
      const { data: callerMemberships } = await adminClient
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", caller.id)
        .eq("is_active", true);

      const adminOrgIds = (callerMemberships || [])
        .filter((m) =>
          [
            "organization_owner",
            "organization_admin",
            "brand_admin",
            "hotel_admin",
            "training_manager",
          ].includes(m.role),
        )
        .map((m) => m.organization_id);

      if (adminOrgIds.length > 0) {
        const { data: targetInOrg } = await adminClient
          .from("organization_memberships")
          .select("id")
          .eq("user_id", user_id)
          .eq("is_active", true)
          .in("organization_id", adminOrgIds)
          .limit(1)
          .maybeSingle();

        if (targetInOrg) {
          sharesActiveOrgWithAuth = true;
        }
      }
    }

    if (!sharesActiveOrgWithAuth) {
      return jsonResponse(
        {
          error:
            "Forbidden: Target user does not belong to an active organization where you have administrative authority.",
        },
        403,
        corsHeaders,
      );
    }

    const accountAction = action as AccountAction;
    const appUrl = resolveAppUrl(req);

    // 6. Execute the action
    switch (accountAction) {
      case "suspend": {
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({
            account_status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          return jsonResponse(
            { error: "Failed to suspend account: " + updateError.message },
            500,
            corsHeaders,
          );
        }

        // Flipping account_status alone is cosmetic: nothing in RLS or the
        // client's pre-login check enforces it, and an already-issued
        // session/refresh token keeps working indefinitely. Ban the actual
        // Supabase Auth user so the account genuinely cannot authenticate or
        // refresh a session while suspended.
        const { error: banError } = await adminClient.auth.admin
          .updateUserById(user_id, { ban_duration: "876000h" });

        if (banError) {
          console.error("Failed to ban auth user on suspend:", banError);
          return jsonResponse(
            {
              error:
                "Account flagged as suspended, but the underlying login was NOT blocked: " +
                banError.message,
            },
            500,
            corsHeaders,
          );
        }

        console.log(
          `Account ${user_id} suspended by ${caller.email}. Reason: ${reason || "N/A"}`,
        );
        break;
      }

      case "reactivate": {
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({
            account_status: "active",
            suspended_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          return jsonResponse(
            { error: "Failed to reactivate account: " + updateError.message },
            500,
            corsHeaders,
          );
        }

        const { error: unbanError } = await adminClient.auth.admin
          .updateUserById(user_id, { ban_duration: "none" });

        if (unbanError) {
          console.error("Failed to lift auth ban on reactivate:", unbanError);
          return jsonResponse(
            {
              error:
                "Account flagged as active, but the login block could NOT be lifted: " +
                unbanError.message,
            },
            500,
            corsHeaders,
          );
        }

        console.log(`Account ${user_id} reactivated by ${caller.email}`);
        break;
      }

      case "force_password_reset": {
        // a) Set the force_password_reset flag on the profile
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({
            force_password_reset: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          return jsonResponse(
            {
              error:
                "Failed to set password reset flag: " + updateError.message,
            },
            500,
            corsHeaders,
          );
        }

        // b) Generate a password recovery link via Supabase Auth Admin API
        const targetEmail = targetProfile.email;
        if (!targetEmail) {
          return jsonResponse(
            { error: "Target user has no email on file" },
            400,
            corsHeaders,
          );
        }

        const resetRedirectTo = `${appUrl}/reset-password`;

        const { data: linkData, error: linkError } =
          await adminClient.auth.admin.generateLink({
            type: "recovery",
            email: targetEmail,
            options: {
              redirectTo: resetRedirectTo,
            },
          });

        if (linkError) {
          console.error("Failed to generate recovery link:", linkError);
          return jsonResponse(
            { error: "Failed to generate password reset link" },
            500,
            corsHeaders,
          );
        }

        const hashedToken = linkData?.properties?.hashed_token || null;
        const actionLink = linkData?.properties?.action_link || null;
        const resetLink = hashedToken
          ? `${resetRedirectTo}?token_hash=${hashedToken}&type=recovery`
          : actionLink || resetRedirectTo;

        console.log(`Recovery link generated for ${targetEmail}`);

        // Send via branded email system (Resend) for a consistent experience
        try {
          const emailResponse = await fetch(
            supabaseUrl + "/functions/v1/send-email",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
              },
              body: JSON.stringify({
                to: targetEmail,
                templateKey: "auth_password_reset",
                title: "Password reset",
                message:
                  "Use the link below to reset your password and secure your account.",
                actionUrl: resetLink,
                actionLabel: "Reset Password",
                businessDomain: "user_management",
                notificationType: "system",
                userId: user_id,
                variables: {
                  recipient_name: targetProfile.full_name || targetEmail,
                  reset_url: resetLink,
                },
              }),
            },
          );

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json().catch(() => ({}));
            console.error("Password reset email send failed:", errorData);
          } else {
            console.log(`Password reset email sent to ${targetEmail}`);
          }
        } catch (emailErr) {
          console.error("Error sending password reset email:", emailErr);
        }

        console.log(`Password reset forced for ${user_id} by ${caller.email}`);
        break;
      }

      case "cancel_password_reset": {
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({
            force_password_reset: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          return jsonResponse(
            {
              error: "Failed to cancel password reset: " + updateError.message,
            },
            500,
            corsHeaders,
          );
        }

        console.log(
          `Password reset cancelled for ${user_id} by ${caller.email}`,
        );
        break;
      }

      case "resend_credentials": {
        const targetEmail = targetProfile.email;
        if (!targetEmail) {
          return jsonResponse(
            { error: "Target user has no email on file" },
            400,
            corsHeaders,
          );
        }

        const isTempPassword = targetProfile.is_temp_password === true;
        const passwordInitialized = targetProfile.password_initialized === true;
        const recoveryRedirectPath = passwordInitialized
          ? "/reset-password"
          : "/complete-invite";
        const recoveryRedirectTo = `${appUrl}${recoveryRedirectPath}`;

        if (isTempPassword) {
          const tempPassword = generateSecureTemporaryPassword();
          const { error: updateAuthError } =
            await adminClient.auth.admin.updateUserById(user_id, {
              password: tempPassword,
            });

          if (updateAuthError) {
            return jsonResponse(
              {
                error:
                  "Failed to reset temporary password: " +
                  updateAuthError.message,
              },
              500,
              corsHeaders,
            );
          }

          const { error: profileUpdateError } = await adminClient
            .from("profiles")
            .update({
              is_temp_password: true,
              password_initialized: false,
              force_password_reset: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user_id);

          if (profileUpdateError) {
            return jsonResponse(
              {
                error:
                  "Failed to update password flags: " +
                  profileUpdateError.message,
              },
              500,
              corsHeaders,
            );
          }

          try {
            const emailResponse = await fetch(
              supabaseUrl + "/functions/v1/send-email",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                  apikey: serviceRoleKey,
                },
                body: JSON.stringify({
                  to: targetEmail,
                  templateKey: "user_management_welcome",
                  title: "Portal Access Credentials",
                  message:
                    "Your access credentials have been reissued. Use the temporary password below to sign in and you will be prompted to change it.",
                  actionLabel: "Sign In to Portal",
                  actionUrl: "/",
                  businessDomain: "user_management",
                  notificationType: "system",
                  userId: user_id,
                  variables: {
                    recipient_name: targetProfile.full_name || targetEmail,
                    credential_email: targetEmail,
                    credential_password: tempPassword,
                    security_note:
                      "For your security, you must change this temporary password after your first successful sign in.",
                  },
                }),
              },
            );

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json().catch(() => ({}));
              console.error("Resend credentials email failed:", errorData);
              return jsonResponse(
                { error: "Failed to send credential email" },
                500,
                corsHeaders,
              );
            }
          } catch (emailErr) {
            console.error("Error sending credential email:", emailErr);
            return jsonResponse(
              { error: "Failed to send credential email" },
              500,
              corsHeaders,
            );
          }
        } else {
          const { data: linkData, error: linkError } =
            await adminClient.auth.admin.generateLink({
              type: "recovery",
              email: targetEmail,
            });

          if (linkError) {
            console.error("Failed to generate recovery link:", linkError);
            return jsonResponse(
              { error: "Failed to generate reset link" },
              500,
              corsHeaders,
            );
          }

          const hashedToken = linkData?.properties?.hashed_token || null;
          const actionLink = linkData?.properties?.action_link || null;
          const recoveryLink = hashedToken
            ? `${recoveryRedirectTo}?token_hash=${hashedToken}&type=recovery`
            : actionLink || recoveryRedirectTo;

          const subject = passwordInitialized
            ? "Reset your password"
            : "Complete your account setup";
          const title = passwordInitialized
            ? "Password reset"
            : "Complete your account setup";
          const message = passwordInitialized
            ? "Use the link below to reset your password and secure your account."
            : "Use the link below to finish your account setup and set your password.";
          const actionLabel = passwordInitialized
            ? "Reset Password"
            : "Complete Account Setup";

          try {
            const emailResponse = await fetch(
              supabaseUrl + "/functions/v1/send-email",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                  apikey: serviceRoleKey,
                },
                body: JSON.stringify({
                  to: targetEmail,
                  templateKey: "auth_password_reset",
                  subject,
                  title,
                  message,
                  actionUrl: recoveryLink,
                  actionLabel,
                  businessDomain: "user_management",
                  notificationType: "system",
                  userId: user_id,
                  variables: {
                    recipient_name: targetProfile.full_name || targetEmail,
                    reset_url: recoveryLink,
                  },
                }),
              },
            );

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json().catch(() => ({}));
              console.error("Resend reset email failed:", errorData);
              return jsonResponse(
                { error: "Failed to send reset email" },
                500,
                corsHeaders,
              );
            }
          } catch (emailErr) {
            console.error("Error sending reset email:", emailErr);
            return jsonResponse(
              { error: "Failed to send reset email" },
              500,
              corsHeaders,
            );
          }
        }

        console.log(`Credentials resent to ${targetEmail} by ${caller.email}`);
        break;
      }

      case "unlock": {
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({
            account_status: "active",
            failed_login_attempts: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          return jsonResponse(
            { error: "Failed to unlock account: " + updateError.message },
            500,
            corsHeaders,
          );
        }

        // account_status is shared between the failed-login lockout and the
        // deliberate-suspend states; if this account was also banned via a
        // prior suspend, unlocking it should not leave a stale ban behind.
        const { error: unbanError } = await adminClient.auth.admin
          .updateUserById(user_id, { ban_duration: "none" });

        if (unbanError) {
          console.error("Failed to lift auth ban on unlock:", unbanError);
        }

        console.log(`Account ${user_id} unlocked by ${caller.email}`);
        break;
      }
    }

    // 7. Create audit log entry
    try {
      await adminClient.from("system_events").insert({
        event_type: "audit",
        actor_id: caller.id,
        entity_type: "user",
        entity_id: user_id,
        metadata: {
          action: `account_action:${accountAction}`,
          details: {
            action: accountAction,
            reason: reason || null,
            target_email: targetProfile.email,
            target_name: targetProfile.full_name,
          },
        },
      });
    } catch (auditErr) {
      console.error("Audit log insert failed:", auditErr);
      // Non-fatal: don't fail the whole operation for audit logging
    }

    return jsonResponse(
      {
        success: true,
        action: accountAction,
        user_id,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("admin-account-actions unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});
