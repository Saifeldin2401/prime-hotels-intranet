import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_ALLOWED_ORIGINS = [
    "https://phg-connect.com",
    "https://www.phg-connect.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
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

type AccountAction = "suspend" | "reactivate" | "force_password_reset" | "unlock";

const VALID_ACTIONS: Set<string> = new Set(["suspend", "reactivate", "force_password_reset", "unlock"]);

type AppRole =
    | "corporate_admin"
    | "regional_admin"
    | "regional_hr"
    | "property_manager"
    | "property_hr"
    | "department_head"
    | "manager"
    | "staff";

const ALLOWED_ROLES = new Set<AppRole>([
    "corporate_admin",
    "regional_admin",
    "regional_hr",
    "property_manager",
    "property_hr",
]);

function isAppRole(value: unknown): value is AppRole {
    return typeof value === "string" && [
        "corporate_admin", "regional_admin", "regional_hr",
        "property_manager", "property_hr", "department_head",
        "manager", "staff",
    ].includes(value);
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

    return "https://phg-connect.com";
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
            return jsonResponse({ error: "Invalid or missing action" }, 400, corsHeaders);
        }

        if (!user_id || typeof user_id !== "string") {
            return jsonResponse({ error: "Missing user_id" }, 400, corsHeaders);
        }

        // 2. Authenticate the caller
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return jsonResponse({ error: "Unauthorized: Missing Authorization header" }, 401, corsHeaders);
        }

        const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
        if (callerError || !caller) {
            return jsonResponse({ error: "Unauthorized: Invalid token" }, 401, corsHeaders);
        }

        // 3. Verify caller has admin/management role
        const { data: callerRoles, error: rolesError } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id);

        if (rolesError) {
            return jsonResponse({ error: "Failed to verify permissions" }, 500, corsHeaders);
        }

        const callerAppRoles = (callerRoles || [])
            .map((r: { role: string }) => r.role)
            .filter(isAppRole);
        const hasPermission = callerAppRoles.some((role: AppRole) => ALLOWED_ROLES.has(role));

        if (!hasPermission) {
            return jsonResponse({ error: "Forbidden: Insufficient privileges" }, 403, corsHeaders);
        }

        // 4. Prevent self-action
        if (caller.id === user_id) {
            return jsonResponse({ error: "Cannot perform this action on your own account" }, 400, corsHeaders);
        }

        // 5. Get the target user's profile and email
        const { data: targetProfile, error: targetProfileError } = await adminClient
            .from("profiles")
            .select("id, email, full_name, account_status, is_active")
            .eq("id", user_id)
            .maybeSingle();

        if (targetProfileError || !targetProfile) {
            return jsonResponse({ error: "Target user not found" }, 404, corsHeaders);
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
                    return jsonResponse({ error: "Failed to suspend account: " + updateError.message }, 500, corsHeaders);
                }

                console.log(`Account ${user_id} suspended by ${caller.email}. Reason: ${reason || "N/A"}`);
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
                    return jsonResponse({ error: "Failed to reactivate account: " + updateError.message }, 500, corsHeaders);
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
                    return jsonResponse({ error: "Failed to set password reset flag: " + updateError.message }, 500, corsHeaders);
                }

                // b) Generate a password recovery link via Supabase Auth Admin API
                //    This sends the actual password reset email through Supabase's built-in email system
                const targetEmail = targetProfile.email;
                if (!targetEmail) {
                    return jsonResponse({ error: "Target user has no email on file" }, 400, corsHeaders);
                }

                const resetRedirectTo = `${appUrl}/reset-password`;

                const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                    type: "recovery",
                    email: targetEmail,
                    options: {
                        redirectTo: resetRedirectTo,
                    },
                });

                if (linkError) {
                    console.error("Failed to generate recovery link:", linkError);
                    // The flag is set but email failed — try sending via our send-email function as fallback
                    try {
                        const recoveryUrl = `${appUrl}/forgot-password`;
                        const emailResponse = await fetch(supabaseUrl + "/functions/v1/send-email", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${serviceRoleKey}`,
                            },
                            body: JSON.stringify({
                                to: targetEmail,
                                subject: "Password Reset Required - PHG Connect",
                                title: "Password Reset Required",
                                message: "An administrator has requested that you reset your password. Please use the link below to set a new password for your PHG Connect account.",
                                actionUrl: recoveryUrl,
                                actionLabel: "Reset Password",
                                businessDomain: "user_management",
                                notificationType: "system",
                                userId: user_id,
                                variables: {
                                    recipient_name: targetProfile.full_name || targetEmail,
                                },
                            }),
                        });

                        if (!emailResponse.ok) {
                            const errorData = await emailResponse.json().catch(() => ({}));
                            console.error("Fallback email also failed:", errorData);
                        } else {
                            console.log(`Fallback password reset email sent to ${targetEmail}`);
                        }
                    } catch (fallbackErr) {
                        console.error("Fallback email error:", fallbackErr);
                    }
                } else {
                    // The generateLink succeeded - Supabase sends the email automatically if SMTP is configured.
                    // If SMTP is not configured (e.g. local dev), we need to send the email ourselves.
                    const actionUrl = linkData?.properties?.action_link || `${appUrl}/reset-password`;
                    console.log(`Recovery link generated for ${targetEmail}`);

                    // Also send via our branded email system for a better user experience
                    try {
                        const emailResponse = await fetch(supabaseUrl + "/functions/v1/send-email", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${serviceRoleKey}`,
                            },
                            body: JSON.stringify({
                                to: targetEmail,
                                subject: "Password Reset Required - PHG Connect",
                                title: "Password Reset Required",
                                message: "An administrator has requested that you reset your password. Please use the link below to set a new password for your PHG Connect account.",
                                actionUrl: actionUrl,
                                actionLabel: "Reset Password",
                                businessDomain: "user_management",
                                notificationType: "system",
                                userId: user_id,
                                variables: {
                                    recipient_name: targetProfile.full_name || targetEmail,
                                },
                            }),
                        });

                        if (!emailResponse.ok) {
                            const errorData = await emailResponse.json().catch(() => ({}));
                            console.error("Branded email send failed:", errorData);
                        } else {
                            console.log(`Password reset email sent to ${targetEmail}`);
                        }
                    } catch (emailErr) {
                        console.error("Error sending password reset email:", emailErr);
                    }
                }

                console.log(`Password reset forced for ${user_id} by ${caller.email}`);
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
                    return jsonResponse({ error: "Failed to unlock account: " + updateError.message }, 500, corsHeaders);
                }

                console.log(`Account ${user_id} unlocked by ${caller.email}`);
                break;
            }
        }

        // 7. Create audit log entry
        try {
            await adminClient.from("audit_logs").insert({
                user_id: caller.id,
                action: `account_action:${accountAction}`,
                target_user_id: user_id,
                details: {
                    action: accountAction,
                    reason: reason || null,
                    target_email: targetProfile.email,
                    target_name: targetProfile.full_name,
                },
            });
        } catch (auditErr) {
            console.error("Audit log insert failed:", auditErr);
            // Non-fatal: don't fail the whole operation for audit logging
        }

        return jsonResponse({
            success: true,
            action: accountAction,
            user_id,
        }, 200, corsHeaders);

    } catch (err) {
        console.error("admin-account-actions unexpected error:", err);
        const message = err instanceof Error ? err.message : "Unexpected error";
        return jsonResponse({ error: message }, 500, corsHeaders);
    }
});
