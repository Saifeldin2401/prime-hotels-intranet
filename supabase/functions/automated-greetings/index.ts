import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface RequestBody {
  test_email?: string;
  eventCode?: string; // Optional manual override ("RAMADAN", "EID_FITR", "EID_ADHA", "SAUDI_NATIONAL", "SAUDI_FOUNDING")
  send_all?: boolean; // Required to actually dispatch if not testing
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Missing Supabase env vars" },
        500,
        corsHeaders,
      );
    }

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("X-Cron-Secret");

    const isServiceRoleCall =
      authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    const isInternalCronCall = cronSecret === "PRIME_HOLIDAY_CRON_2026";

    if (!isServiceRoleCall && !isInternalCronCall && authHeader) {
      // User authentication flow...
      const userClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY") || "",
        {
          global: { headers: { Authorization: authHeader || "" } },
        },
      );

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();
      if (!userError && user) {
        // Must be admin
        const serviceClientAdmin = createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
        );
        const { data: roleRows } = await serviceClientAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["corporate_admin", "regional_admin", "super_admin"]);

        if (!roleRows || roleRows.length === 0) {
          return jsonResponse(
            { error: "Forbidden: Only admins can trigger greetings." },
            403,
            corsHeaders,
          );
        }
      } else {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      }
    } else if (!isServiceRoleCall) {
      return jsonResponse(
        { error: "Missing authentication" },
        401,
        corsHeaders,
      );
    }

    const body: RequestBody = await req.json().catch(() => ({}));

    // 1. Determine what event today is
    let eventCode = body.eventCode;

    if (!eventCode) {
      // Get current date
      const d = new Date();
      // Adjust server time to KSA (UTC+3)
      const ksaTime = new Date(d.getTime() + 3 * 60 * 60 * 1000);
      const gregorianDay = ksaTime.getUTCDate();
      const gregorianMonth = ksaTime.getUTCMonth() + 1;
      const gregorianYear = ksaTime.getUTCFullYear();

      const dateStr = `${gregorianDay.toString().padStart(2, "0")}-${gregorianMonth.toString().padStart(2, "0")}-${gregorianYear}`;

      try {
        const hijriRes = await fetch(
          `http://api.aladhan.com/v1/gToH?date=${dateStr}&adjustment=0`,
        );
        const hijriData = await hijriRes.json();
        const hijri = hijriData.data?.hijri;

        if (hijri) {
          const hijriDay = parseInt(hijri.day, 10);
          const hijriMonth = hijri.month.number; // 1 to 12

          if (hijriMonth === 9 && hijriDay === 1) eventCode = "RAMADAN";
          else if (hijriMonth === 10 && hijriDay === 1) eventCode = "EID_FITR";
          else if (hijriMonth === 12 && hijriDay === 10) eventCode = "EID_ADHA";
          else if (gregorianMonth === 9 && gregorianDay === 23)
            eventCode = "SAUDI_NATIONAL";
          else if (gregorianMonth === 2 && gregorianDay === 22)
            eventCode = "SAUDI_FOUNDING";
        }
      } catch (err) {
        console.error("Failed to fetch Hijri date", err);
      }
    }

    if (!eventCode) {
      return jsonResponse(
        {
          message: "No special event scheduled for today.",
          date_checked: new Date().toISOString(),
        },
        200,
        corsHeaders,
      );
    }

    // Must confirm send or use test email to prevent accidental mass emails
    if (!body.test_email && !body.send_all && isServiceRoleCall) {
      // If this was invoked via automated Cron, we will trust it if no body is passed or send_all is omitted
      // But to be safe, we will assume true if it was a cron job (often empty body or specific secret).
      // Let's force cron jobs to send `{"send_all": true}` in the webhook body.
      return jsonResponse(
        {
          error:
            'Dry run: To send to everyone, send { "send_all": true }. For test, use { "test_email": "your@email.com" }',
          eventCode,
        },
        400,
        corsHeaders,
      );
    }

    // 2. Fetch Config
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
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
      "https://www.phg-connect.com"
    ).replace(/\/+$/, "");
    const fromName = readSecret(config.email_from_name) || "PHG Connect";
    const fromEmail =
      readSecret(config.email_from_address) || "notifications@phg-connect.com";

    if (!resendApiKey) {
      return jsonResponse(
        { error: "Missing RESEND_API_KEY from database config" },
        500,
        corsHeaders,
      );
    }

    // 3. Build Template
    const templateData = getTemplateForEvent(eventCode, appBaseUrl);
    if (!templateData) {
      return jsonResponse(
        { error: `Unknown event code: ${eventCode}` },
        400,
        corsHeaders,
      );
    }

    // 4. Collect Emails
    let emailsToSend: string[] = [];
    if (body.test_email) {
      emailsToSend.push(body.test_email);
    } else if (body.send_all) {
      const { data: profiles, error: profilesError } = await serviceClient
        .from("profiles")
        .select("email")
        .eq("is_active", true)
        .not("email", "is", null);

      if (profilesError)
        return jsonResponse(
          { error: "DB Error", details: profilesError.message },
          500,
          corsHeaders,
        );
      emailsToSend = profiles
        .map((p) => p.email?.trim())
        .filter((e) => e && e.includes("@")) as string[];
    }
    emailsToSend = [...new Set(emailsToSend)];

    if (emailsToSend.length === 0) {
      return jsonResponse(
        { message: "No recipients found." },
        200,
        corsHeaders,
      );
    }

    // 5. Fire via Resend Batch API
    const BATCH_SIZE = 100;
    const allResults = [];

    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      const batchRecipients = emailsToSend.slice(i, i + BATCH_SIZE);
      const payload = batchRecipients.map((email) => ({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: templateData.subject,
        html: templateData.html,
        tags: [
          { name: "campaign", value: `automated_${eventCode.toLowerCase()}` },
        ],
      }));

      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      allResults.push({ status: response.status, data: result });
      if (i + BATCH_SIZE < emailsToSend.length)
        await new Promise((r) => setTimeout(r, 500));
    }

    return jsonResponse(
      {
        success: true,
        event: eventCode,
        sent_count: emailsToSend.length,
        runs: allResults,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
      corsHeaders,
    );
  }
});

function getTemplateForEvent(eventCode: string, appUrl: string) {
  let subject = "Greetings from PRIME Hotels";
  let englishText = "";
  let arabicText = "";
  let englishTitle = "";
  let arabicTitle = "";
  let primaryColor = "#0B1C3E";
  let accentColor = "#D4AF37";
  let topLabelArabic = "";
  let topLabelEnglish = "";

  switch (eventCode) {
    case "RAMADAN":
      subject = "Ramadan Kareem from PRIME Hotels | رمضان كريم";
      englishTitle = "Dear Team,";
      arabicTitle = "أعزائنا الموظفين،";
      topLabelEnglish = "RAMADAN KAREEM";
      topLabelArabic = "رمضان كريم";
      englishText =
        "As the holy month of Ramadan begins, we extend our warmest wishes to you and your families. May this blessed month bring you peace, reflection, and abundant blessings. Thank you for your continued dedication to PRIME Hotels Group as we continue to deliver exceptional hospitality.";
      arabicText =
        "بمناسبة حلول شهر رمضان المبارك، نتقدم إليكم ولعائلاتكم بأصدق التهاني وأطيب الأمنيات. نسأل الله أن يتقبل صيامكم وقيامكم وأن يعيده عليكم بالخير واليمن والبركات. تقبل الله طاعاتكم وشكراً لجهودكم المستمرة في مجموعة فنادق برايم.";
      primaryColor = "#0A2540";
      accentColor = "#E6C27A";
      break;
    case "EID_FITR":
      subject = "Eid Al-Fitr Mubarak from PRIME Hotels | عيد فطر مبارك";
      englishTitle = "Dear Team,";
      arabicTitle = "أعزائنا الموظفين،";
      topLabelEnglish = "EID AL-FITR MUBARAK";
      topLabelArabic = "عيد فطر مبارك";
      englishText =
        "On the joyful occasion of Eid Al-Fitr, we extend our warmest wishes to all team members across Prime Hotels Group properties. May this special time bring joy, peace, and prosperity to you and your families. We deeply appreciate your hard work and excellence.";
      arabicText =
        "بمناسبة حلول عيد الفطر المبارك، نتقدم بأصدق التهاني وأطيب التمنيات لجميع موظفي مجموعة فنادق برايم. نسأل الله أن يعيده عليكم بالخير والسعادة والازدهار. نشكر لكم التزامكم واحترافيتكم العالية التي تثري تجربة ضيوفنا.";
      primaryColor = "#0B1C3E";
      accentColor = "#D4AF37";
      break;
    case "EID_ADHA":
      subject = "Eid Al-Adha Mubarak from PRIME Hotels | عيد أضحى مبارك";
      englishTitle = "Dear Team,";
      arabicTitle = "أعزائنا الموظفين،";
      topLabelEnglish = "EID AL-ADHA MUBARAK";
      topLabelArabic = "عيد أضحى مبارك";
      englishText =
        "Wishing you a blessed and joyful Eid Al-Adha. May this season of sacrifice and celebration bring abundant happiness, health, and success to you and your loved ones. We value your commitment to PRIME Hotels Group.";
      arabicText =
        "بمناسبة حلول عيد الأضحى المبارك، نتقدم إليكم بأسمى آيات التهاني والتبريكات. أعاده الله عليكم وعلى ذويكم باليمن والبركات والصحة والعافية. كل عام وأنتم بخير، مع خالص التقدير لجهودكم المخلصة في مجموعة فنادق برايم.";
      primaryColor = "#0A1F30";
      accentColor = "#D4AF37";
      break;
    case "SAUDI_NATIONAL":
      subject = "Happy Saudi National Day | اليوم الوطني السعودي";
      englishTitle = "Dear Team,";
      arabicTitle = "أعزائنا الموظفين،";
      topLabelEnglish = "SAUDI NATIONAL DAY";
      topLabelArabic = "اليوم الوطني السعودي";
      englishText =
        "On the occasion of the Saudi National Day, we proudly celebrate the glorious heritage, visionary leadership, and unprecedented prosperity of the Kingdom. Wishing you and our beloved Kingdom continued peace, progress, and success.";
      arabicText =
        "بمناسبة اليوم الوطني للمملكة العربية السعودية، نحتفل معاً بمسيرة نماء وازدهار ورؤية طموحة لمملكتنا الحبيبة. دام عزك يا وطن، وكل عام والمملكة وقيادتها وشعبها بخير وسلام ومزيد من الرفعة.";
      primaryColor = "#006C35"; // Saudi Green
      accentColor = "#D4AF37";
      break;
    case "SAUDI_FOUNDING":
      subject = "Happy Saudi Founding Day | يوم التأسيس السعودي";
      englishTitle = "Dear Team,";
      arabicTitle = "أعزائنا الموظفين،";
      topLabelEnglish = "SAUDI FOUNDING DAY";
      topLabelArabic = "يوم التأسيس";
      englishText =
        "On Saudi Founding Day, we proudly commemorate the deep roots and rich history of the Kingdom of Saudi Arabia. We wish you a beautiful celebration marking three centuries of vibrant heritage, resilience, and a bright future.";
      arabicText =
        "في يوم التأسيس، نستذكر بفخر واعتزاز الجذور الراسخة والتاريخ العريق للمملكة العربية السعودية. نحتفل بثلاثة قرون من العز والمجد والأصالة. دامت أفراح الوطن ومسيرته الحضارية العظيمة.";
      primaryColor = "#2A1813"; // Earthy deep maroon
      accentColor = "#D0A45D";
      break;
    default:
      return null;
  }

  const logoUrl = `${appUrl}/prime-logo-white-full.png`;
  const year = new Date().getFullYear().toString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="background-color: #f8fafc; padding: 40px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            
            <!-- Header -->
            <div style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, ${primaryColor} 0%, #1a365d 100%);">
                <img src="${logoUrl}" alt="PRIME Hotels Group" style="height: 48px; width: auto; margin-bottom: 24px;">
                <br>
                <div style="display: inline-block; padding: 6px 20px; border: 1px solid ${accentColor}; border-radius: 50px; color: ${accentColor}; font-size: 14px; font-weight: 600; letter-spacing: 2px;">
                    ${topLabelEnglish} • ${topLabelArabic}
                </div>
            </div>

            <div style="padding: 40px;">
                <!-- ARABIC SECTION -->
                <div dir="rtl" style="text-align: right; margin-bottom: 40px;">
                    <h2 style="color: ${primaryColor}; font-size: 24px; font-weight: bold; margin-bottom: 16px;">${arabicTitle}</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">هذه رسالة عامة صادرة عبر نظام PHG Connect.</p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        ${arabicText}
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                        — نظام PHG Connect<br>
                        مجموعة فنادق برايم
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <div style="height: 1px; width: 100%; border-top: 1px dashed #cbd5e1;"></div>
                    <div style="display: inline-block; padding: 0 16px; background: #ffffff; position: relative; top: -11px; color: ${accentColor}; font-size: 20px;">✦</div>
                </div>

                <!-- ENGLISH SECTION -->
                <div dir="ltr" style="text-align: left; margin-bottom: 20px;">
                    <h2 style="color: ${primaryColor}; font-size: 24px; font-weight: bold; margin-bottom: 16px;">${englishTitle}</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">This is a system-wide announcement from PHG Connect.</p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        ${englishText}
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
                        — PHG Connect System<br>
                        Prime Hotels Group
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px;">Open PHG Connect</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">&copy; ${year} PRIME Hotels Group. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();

  return { subject, html };
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
