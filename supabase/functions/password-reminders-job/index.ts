import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

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
      `Found ${users.length} users with temp passwords. Fetching template...`,
    );

    const { data: template, error: tmplError } = await supabaseClient
      .from("notification_email_templates")
      .select("html_template, text_template")
      .eq("template_key", "auth_password_reminder")
      .maybeSingle();

    if (tmplError || !template) {
      throw new Error("Template 'auth_password_reminder' not found");
    }

    // Build Batch Payload
    const batchPayload = users.map((user) => {
      const recipientName = user.full_name || "PRIME User";
      let html = template.html_template
        .replace(/{{recipient_name}}/g, recipientName)
        .replace(/{{action_url}}/g, "https://www.altus-advisory.com/login")
        .replace(
          /{{logo_url}}/g,
          "https://www.altus-advisory.com/prime-logo-white-full.png",
        )
        .replace(/{{title}}/g, "Password Update Required")
        .replace(/{{year}}/g, new Date().getFullYear().toString())
        .replace(/{{dir}}/g, "ltr")
        .replace(/{{lang}}/g, "en");

      let text = (template.text_template || "")
        .replace(/{{recipient_name}}/g, recipientName)
        .replace(/{{action_url}}/g, "https://www.altus-advisory.com/login");

      return {
        from: "PRIME Connect Security <notifications@altus-advisory.com>",
        to: [user.email],
        subject:
          "PRIME Connect | Password Update Required - مطلوب تحديث كلمة المرور",
        html: html,
        text: text,
      };
    });

    // Send using Resend Batch API
    let sentCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < batchPayload.length; i += BATCH_SIZE) {
      const chunk = batchPayload.slice(i, i + BATCH_SIZE);
      console.log(`Sending batch of ${chunk.length} emails...`);

      const resendRes = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(chunk),
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error("Batch send failed:", errorText);
        throw new Error(`Failed to send batch: ${errorText}`);
      }

      sentCount += chunk.length;
    }

    console.log(`Successfully sent ${sentCount} reminders.`);

    return new Response(JSON.stringify({ success: true, count: sentCount }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Error sending reminders:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
