import fs from 'fs';

const RESEND_API_KEY = "re_eQhYG7XK_xWuoxmtwt2q3cu2XhVKnsgzn";

const users = [{"id":"768933a8-e154-4dcc-b965-ba7ffef69242","email":"badr@alfaheedgroup.com","full_name":"Badr Alhaheed","language":"en"},{"id":"446a9b0b-e61b-497b-ada5-f3a5085d4a02","email":"tiyat9922@gmail.com","full_name":"Abo Bar Tia","language":"en"},{"id":"c84eea07-c495-4ceb-b61f-3164ae10b86c","email":"fc@primehotelsgroup.com","full_name":"Salah Elkady","language":"en"},{"id":"0f4d3a81-4f05-478e-9568-5737b0d0be9f","email":"cost@primehotlesgroup.com","full_name":"Hossam Ragab","language":"en"},{"id":"3e1b0f78-cd54-4f4b-af75-7b811a1f3727","email":"mahranahmed231@gmail.com","full_name":"Ahmed Ahmed mahran","language":"en"},{"id":"942c498e-e1e2-42a4-8881-51561599f24a","email":"looa01230th@gmail.com","full_name":"AIIam Ali lbrahim","language":"en"},{"id":"01798d90-3d99-4741-9aeb-0bcd7575d335","email":"neehaal1989@gmail.com","full_name":"Nihal Abd Al Rahman Al Harbi","language":"en"},{"id":"09199c10-808d-4629-a706-aa4ec9a20150","email":"mohamedgalallld@gmail.com","full_name":"MOHAMED Galal Anwer Ahmed","language":"en"},{"id":"3ef8b369-583d-4d34-9550-4a222243c3db","email":"alatawi1213@gmail.com","full_name":"Faisal Mohamed Al Otaibi","language":"en"},{"id":"709b9b2c-f602-48d0-be54-2bcee142e299","email":"fhdalnzv209@gmail.com","full_name":"FAHAD MESHAAL AIANzi","language":"en"},{"id":"548d432c-acb6-40a3-913d-ef6c6fd77974","email":"sales4@primehotelsgroup.com","full_name":"Amr Elashaal","language":"en"},{"id":"3713c4bc-e6ad-4947-af02-61550eab56df","email":"fb.dir@primehotelsgroup.com","full_name":"Fouad Sayed","language":"en"},{"id":"0bb62ead-f8d1-412e-b680-fa41c5fefa79","email":"faisal@primehotelsgroup.com","full_name":"Faisal Alfaheed","language":"en"},{"id":"05fa81b6-d095-44ae-a381-a4f278374581","email":"nawaf@alfaheedgroup.com","full_name":"Nawaf Alfaheed","language":"en"},{"id":"d35c22a4-874c-4153-b25c-1f594fbd57c9","email":"reservation.alriyadh@primehotelsgroup.com","full_name":"Ahmed Taha","language":"en"},{"id":"0c4c99cc-e6ec-4ff5-815b-e12f2b4a8ac2","email":"sales1@primehotelsgroup.com","full_name":"Muddassir Hussain","language":"en"},{"id":"58f69976-5fb7-48e7-93d7-25a42195af43","email":"sales@primehotelsgroup.com","full_name":"Haitham Youssef","language":"en"},{"id":"21eda422-eed0-4d38-b17e-be0ecdc18b64","email":"azoooz.bk1993@gmail.com","full_name":"Abdulaziz Badr Bakili","language":"en"},{"id":"e5b924f7-adda-4b15-94fb-bbf7c9ca9d91","email":"play.com99874@gmail.com","full_name":"Nasser musa mahdey alzharani","language":"en"},{"id":"6668c87e-d541-4a24-8166-06b0fc10f768","email":"a.taha.mamoun1991@gmail.com","full_name":"Ahmed Taha Mamoun","language":"en"},{"id":"24f8e680-8615-49a1-b0e6-647fac9f7d44","email":"hmada18emam@gmail.com","full_name":"Mohammad Sami Emam","language":"en"},{"id":"2ca34826-6d7e-48f9-88ff-d1415348e058","email":"iimansoor6@gmail.com","full_name":"Mansour Mohammed Al-Mahwari","language":"en"},{"id":"83fe33c8-b247-482b-8d13-17d5badc5f79","email":"mohamedreao49@gmail.com","full_name":"MOHAMED ABDELBADEAA ISMEAL","language":"en"},{"id":"a7b98c60-6773-4713-9d40-dcd86e39d0a5","email":"naserelsady2020@gmail.com","full_name":"Naser elsady Ibrahim","language":"en"},{"id":"c6b8a8b9-1e7f-4def-aa24-ed1cdf754b05","email":"zooommm551@gmail.com","full_name":"MOHAMED HANAFY ELSAYED ABDELMAKSOUD","language":"en"},{"id":"670a58d9-dcd7-4192-8cca-6f84d395b483","email":"hassanshalaby280@gmail.com","full_name":"Hasan Abdel Raof Shalaby","language":"en"},{"id":"3a32cb29-3836-4744-8a45-04b15335856e","email":"mahmoudmo919@yahoo.com","full_name":"Mahmoud Zain Al-Abidin Hamed","language":"en"}];

const baseHtml = `<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, #0B1C3E 0%, #1E40AF 100%);padding:32px 24px;text-align:center;">
              <img src="{{logo_url}}" alt="PHG Connect" height="40" style="display:block;height:40px;margin:0 auto 12px auto;">
              <div style="color:rgba(255,255,255,0.92);font-size:12px;letter-spacing:1.6px;font-weight:700;text-transform:uppercase;">Security Notice | إشعار أمني</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <!-- Arabic Section -->
              <div dir="rtl" style="text-align:right; margin-bottom: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 32px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#0f172a;">تذكير بتحديث كلمة المرور</h1>
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.7;color:#334155;">مرحباً {{recipient_name}}،</p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.7;color:#334155;">
                  تشير سجلاتنا إلى أنك لا تزال تستخدم كلمة مرور مؤقتة. من أجل أمان حسابك وشبكة فنادق برايم، يرجى تسجيل الدخول وتعيين كلمة مرور دائمة في أقرب وقت ممكن.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-right:0;">
                  <tr>
                    <td style="border-radius:12px;background:#1E40AF;">
                      <a href="{{action_url}}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;font-size:16px;">سجل دخولك الآن</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- English Section -->
              <div dir="ltr" style="text-align:left;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">Password Update Reminder</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hello {{recipient_name}},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#334155;">
                  Our records show that you are still using a temporary password. For the security of your account and the PRIME Hotels network, please log in and set a permanent password as soon as possible.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-left:0;">
                  <tr>
                    <td style="border-radius:12px;background:#1E40AF;">
                      <a href="{{action_url}}" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;font-size:15px;">Login Now</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#fcfdff;border-top:1px solid #eef2f7;text-align:center;">
              <div style="font-size:12px;line-height:1.6;color:#64748b;">
                Automated security notification from PRIME Connect. <br>
                إشعار أمني تلقائي من برايم كونكت.
              </div>
              <div style="margin-top:12px;font-size:11px;line-height:1.6;color:#94a3b8;">&copy; {{year}} PRIME Hotels Intranet</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const baseText = `Password Update Reminder | تذكير بتحديث كلمة المرور\n\nHello {{recipient_name}},\n\nOur records show that you are still using a temporary password. Please log in and set a permanent password: {{action_url}}\n\nتشير سجلاتنا إلى أنك لا تزال تستخدم كلمة مرور مؤقتة. يرجى تسجيل الدخول وتعيين كلمة مرور دائمة: {{action_url}}`;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("Fetching recently sent emails from Resend...");
    
    let sentEmails = [];
    try {
        const res = await fetch("https://api.resend.com/emails", {
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`
            }
        });
        const data = await res.json();
        if (data && data.data) {
            sentEmails = data.data.map(e => e.to).flat().map(e => String(e).toLowerCase());
        }
        console.log(`Found ${sentEmails.length} recent emails.`);
    } catch (e) {
        console.error("Failed to fetch sent emails from resend. Will send to all.", e);
    }
    
    let count = 0;

    for (const usr of users) {
        if (sentEmails.includes(usr.email.toLowerCase())) {
            console.log(`Skipping ${usr.email} (already sent)`);
            continue;
        }

        let html = baseHtml
            .replace(/{{recipient_name}}/g, usr.full_name)
            .replace(/{{action_url}}/g, "https://phg-connect.com/login")
            .replace(/{{logo_url}}/g, "https://phg-connect.com/prime-logo-white-full.png")
            .replace(/{{title}}/g, "Password Update Required")
            .replace(/{{year}}/g, "2026")
            .replace(/{{dir}}/g, "ltr")
            .replace(/{{lang}}/g, "en");

        let text = baseText
            .replace(/{{recipient_name}}/g, usr.full_name)
            .replace(/{{action_url}}/g, "https://phg-connect.com/login");

        try {
            const sendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: "PRIME Connect Security <notifications@phg-connect.com>",
                    to: [usr.email],
                    subject: "PRIME Connect | Password Update Required - مطلوب تحديث كلمة المرور",
                    html: html,
                    text: text
                })
            });
            const sendData = await sendRes.json();
            
            if (sendRes.ok) {
                console.log(`✅ Sent to ${usr.email}`);
                count++;
            } else {
                console.error(`❌ Failed to send to ${usr.email}: `, sendData);
            }
        } catch (err) {
            console.error(`❌ Error sending to ${usr.email}:`, err.message);
        }

        // Resend rate limit: 2 requests per second. Let's delay 600ms between requests.
        await delay(600);
    }

    console.log(`\nFinished. Successfully sent ${count} new emails.`);
}

main();
