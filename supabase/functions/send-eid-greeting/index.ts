import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface RequestBody {
  test_email?: string;
  send_all?: boolean;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
        corsHeaders,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Missing Authorization header" },
        401,
        corsHeaders,
      );
    }

    // Initialize service client for admin access to get all profiles and configs
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    // Verify user is an admin
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const isServiceRoleCall =
      authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
      req.headers.get("apikey") === SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceRoleCall) {
      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      }

      const adminRoles = [
        "corporate_admin",
        "regional_admin",
        "property_manager",
        "super_admin",
      ];
      const { data: roleRows, error: roleError } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", adminRoles);

      if (roleError || !roleRows || roleRows.length === 0) {
        return jsonResponse(
          {
            error: "Forbidden: Only admins can trigger system-wide greetings.",
          },
          403,
          corsHeaders,
        );
      }
    }

    const body: RequestBody = await req.json().catch(() => ({}));

    if (!body.test_email && !body.send_all) {
      return jsonResponse(
        {
          error:
            'Dry run: To send to everyone, include { "send_all": true } in request body. To test, include { "test_email": "your@email.com" }.',
        },
        400,
        corsHeaders,
      );
    }

    // Get config
    const { data: configData } = await serviceClient.rpc(
      "get_email_runtime_config",
    );
    const config = (configData as Record<string, any>) || {};
    const readSecret = (v: any) =>
      typeof v === "string" && v.trim() ? v.trim() : null;

    const resendApiKey =
      readSecret(config.resend_api_key) || Deno.env.get("RESEND_API_KEY");
    const appBaseUrl = (
      readSecret(config.app_base_url) ||
      Deno.env.get("APP_BASE_URL") ||
      "https://www.altus-advisory.com"
    ).replace(/\/+$/, "");
    const fromName = readSecret(config.email_from_name) || "Altus Hospitality";
    const fromEmail =
      readSecret(config.email_from_address) || "notifications@phg-connect.com";

    if (!resendApiKey) {
      return jsonResponse(
        { error: "Missing RESEND_API_KEY" },
        500,
        corsHeaders,
      );
    }

    // Build unique luxurious HTML template with supplied text
    const htmlTemplate = getBeautifulEidTemplate(appBaseUrl);

    // Collect recipient emails
    let emailsToSend: string[] = [];

    if (body.test_email) {
      emailsToSend.push(body.test_email);
    } else if (body.send_all) {
      // Fetch all active profiles with valid email
      const { data: profiles, error: profilesError } = await serviceClient
        .from("profiles")
        .select("email, full_name")
        .eq("is_active", true)
        .not("email", "is", null);

      if (profilesError) {
        return jsonResponse(
          { error: "Failed to fetch profiles", details: profilesError.message },
          500,
          corsHeaders,
        );
      }

      emailsToSend = profiles
        .map((p) => p.email?.trim())
        .filter((e) => e && e.includes("@")) as string[];
    }

    // Deduplicate emails just in case
    emailsToSend = [...new Set(emailsToSend)];

    if (emailsToSend.length === 0) {
      return jsonResponse(
        { success: true, message: "No actual recipients found to send." },
        200,
        corsHeaders,
      );
    }

    console.log(`Sending Eid greeting to ${emailsToSend.length} recipients...`);

    // Route through the central send-email function for delivery tracking,
    // retry logic, and consistent email infrastructure.
    const sendEmailUrl = `${SUPABASE_URL}/functions/v1/send-email`;
    let sentCount = 0;
    let failedCount = 0;

    for (const email of emailsToSend) {
      try {
        const response = await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY!,
          },
          body: JSON.stringify({
            to: email,
            subject: "Eid Mubarak from Altus Hospitality | عيد مبارك",
            html: htmlTemplate,
            businessDomain: "management",
            notificationType: "system",
          }),
        });

        if (response.ok) {
          sentCount++;
        } else {
          failedCount++;
          const errorData = await response.json().catch(() => ({}));
          console.error(`Failed to send Eid greeting to ${email}:`, errorData);
        }
      } catch (err) {
        failedCount++;
        console.error(`Error sending Eid greeting to ${email}:`, err);
      }

      // Small delay between emails to respect rate limits
      if (sentCount + failedCount < emailsToSend.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return jsonResponse(
      {
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total: emailsToSend.length,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error in send-eid-greeting";
    console.error(error);
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});

function getBeautifulEidTemplate(appUrl: string): string {
  const logoUrl = `${appUrl}/prime-logo-white-full.png`;
  const year = new Date().getFullYear().toString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eid Mubarak from PRIME Hotels</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="background-color: #f8fafc; padding: 40px 10px;">
        <!-- Card Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            
            <!-- Header (Dark Premium) -->
            <div style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #0B1C3E 0%, #1a365d 100%);">
                <img src="${logoUrl}" alt="PRIME Hotels Group" style="height: 48px; width: auto; margin-bottom: 24px;">
                <br>
                <div style="display: inline-block; padding: 6px 20px; border: 1px solid #D4AF37; border-radius: 50px; color: #D4AF37; font-size: 14px; font-weight: 600; letter-spacing: 2px;">
                    EID MUBARAK • عيد مبارك
                </div>
            </div>

            <div style="padding: 40px;">
                <!-- ARABIC SECTION -->
                <div dir="rtl" style="text-align: right; margin-bottom: 40px;">
                    <h2 style="color: #0B1528; font-size: 26px; font-weight: bold; margin-bottom: 16px;">أعزائنا الموظفين،</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">هذه رسالة عامة صادرة عبر نظام Altus Connect.</p>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        بمناسبة حلول عيد الفطر المبارك، نتقدم بأصدق التهاني وأطيب التمنيات لجميع موظفي آلتوس في كافة منشآتها. نسأل الله أن يعيده عليكم بالخير والسعادة والازدهار، وأن يكون هذا العيد مناسبة مليئة بالفرح مع عائلاتكم وأحبائكم.
                    </p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        نشكر لكم التزامكم المستمر واحترافيتكم العالية، والتي تساهم بشكل أساسي في تقديم أفضل الخدمات وتحقيق التميز في جميع فنادقنا.
                    </p>
                    <p style="color: #0B1528; font-weight: bold; font-size: 18px; margin-bottom: 12px; line-height: 1.6;">
                        عيد مبارك لكم ولعائلاتكم، مع أطيب التمنيات بقضاء أوقات سعيدة ومباركة.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                        — نظام Altus Connect<br>
                        آلتوس للضيافة
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <div style="height: 1px; width: 100%; border-top: 1px dashed #cbd5e1;"></div>
                    <div style="display: inline-block; padding: 0 16px; background: #ffffff; position: relative; top: -11px; color: #C9A54D; font-size: 20px;">✦</div>
                </div>

                <!-- ENGLISH SECTION -->
                <div dir="ltr" style="text-align: left; margin-bottom: 20px;">
                    <h2 style="color: #0B1528; font-size: 26px; font-weight: bold; margin-bottom: 16px;">Dear Team,</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">This is a system-wide announcement from Altus Connect.</p>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        On the occasion of Eid, we extend our warmest wishes to all team members across Altus Hospitality properties. May this special time bring joy, peace, and prosperity to you and your families.
                    </p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        We would like to take this opportunity to thank you for your continued dedication, professionalism, and commitment to excellence. Your efforts are highly valued and play a key role in delivering exceptional experiences across all our properties.
                    </p>
                    <p style="color: #0B1528; font-weight: bold; font-size: 18px; margin-bottom: 12px; line-height: 1.5;">
                        Eid Mubarak to you and your loved ones. We wish you a joyful and blessed celebration.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
                        — Altus Connect System<br>
                        Altus Hospitality
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: #C9A54D; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: bold; letter-spacing: 0.5px; font-size: 16px;">Open Altus Connect</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">&copy; ${year} Altus Hospitality. All rights reserved.</p>
                <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0 0;">This email was sent from the Altus Connect Intranet.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
  corsHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
