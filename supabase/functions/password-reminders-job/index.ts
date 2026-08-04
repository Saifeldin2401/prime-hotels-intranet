import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Expose-Headers": "Content-Length, X-JSON",
        "Access-Control-Allow-Headers":
          "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
      },
    });
  }

  // Security Check
  const authHeader = req.headers.get("Authorization");
  const apikeyHeader = req.headers.get("apikey");

  // Check both Authorization and apikey headers for service role key
  const authValue =
    authHeader?.replace(/^Bearer\s+/i, "").trim() || apikeyHeader?.trim() || "";
  const isServiceRoleCall = authValue === serviceRoleKey.trim();

  if (!isServiceRoleCall) {
    console.error(
      "Auth failed - authHeader:",
      authHeader ? "present" : "missing",
      "apikey:",
      apikeyHeader ? "present" : "missing",
    );
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log("Fetching users with temporary passwords...");
    const { data: users, error: usersError } = await supabaseClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("is_temp_password", true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users need reminders", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Found ${users.length} users with temp passwords. Sending reminders via send-email...`,
    );

    // Route each email through the central send-email function for consistent
    // branding, delivery tracking, retry logic, and template rendering.
    let sentCount = 0;
    let failedCount = 0;
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;

    for (const user of users) {
      try {
        const recipientName = user.full_name || "Altus Team Member";

        const emailResponse = await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            to: user.email,
            templateKey: "auth_password_reminder",
            title: "Password Update Required",
            subject:
              "Altus Connect | Password Update Required - مطلوب تحديث كلمة المرور",
            message:
              "Your account is still using a temporary password. For your security, please update your password as soon as possible by signing in and following the prompts.",
            actionUrl: "/",
            actionLabel: "Sign In & Update Password",
            businessDomain: "user_management",
            notificationType: "system",
            userId: user.id,
            variables: {
              recipient_name: recipientName,
            },
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
        } else {
          failedCount++;
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error(
            `Failed to send reminder to ${user.email}:`,
            errorData,
          );
        }
      } catch (emailErr) {
        failedCount++;
        console.error(
          `Error sending reminder to ${user.email}:`,
          emailErr,
        );
      }

      // Small delay between emails to respect rate limits
      if (sentCount + failedCount < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(
      `Finished: ${sentCount} sent, ${failedCount} failed out of ${users.length} total.`,
    );

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("Error sending reminders:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

