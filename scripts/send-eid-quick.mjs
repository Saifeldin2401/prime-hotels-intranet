import fs from 'fs';

const RESEND_API_KEY = "re_eQhYG7XK_xWuoxmtwt2q3cu2XhVKnsgzn";
const APP_URL = "https://phg-connect.com";
const FROM_NAME = "PHG Connect";
const FROM_EMAIL = "notifications@phg-connect.com";

const emails = [
  "alatawi1213@gmail.com", "badr@alfaheedgroup.com", "eslam.mady.2020@gmail.com",
  "badebaksh@gmail.com", "tiyat9922@gmail.com", "guestrelation@primehotelsgroup.com",
  "gm@primehotelsgroup.com", "fo@primehotelsgroup.com", "cost@primehotlesgroup.com",
  "aawb2012@gmail.com", "cl@primehotelsgroup.com", "mahranahmed231@gmail.com",
  "moh-oo@hotmail.com", "looa01230th@gmail.com", "aymanabdelhamid091@gmail.com",
  "acctfco@gmail.com", "cl.d@primehotelsgroup.com", "fc@primehotelsgroup.com",
  "neehaal1989@gmail.com", "mohamedgalallld@gmail.com", "fhdalnzv209@gmail.com",
  "ibf672017@gmail.com", "elegantlayla88@gmail.com", "sales4@primehotelsgroup.com",
  "admin@prime.com", "fb.dir@primehotelsgroup.com", "faisal@primehotelsgroup.com",
  "nawaf@alfaheedgroup.com", "reservation.alriyadh@primehotelsgroup.com",
  "sales3@primehotelsgroup.com", "mahmoudelakabawey@gmail.com", "play.com99874@gmail.com",
  "ibneyusuf111@gmail.com", "sales1@primehotelsgroup.com", "sales@primehotelsgroup.com",
  "azoooz.bk1993@gmail.com", "a.taha.mamoun1991@gmail.com", "abdullahahmed54574@gmail.com",
  "iimansoor6@gmail.com", "hassanshalaby280@gmail.com", "hmada18emam@gmail.com",
  "moustafamarzook7200416@gmail.com", "zooommm551@gmail.com", "mohamedreao49@gmail.com",
  "naserelsady2020@gmail.com", "saifeldinislam@gmail.com", "mahmoudmo919@yahoo.com"
];

function getBeautifulEidTemplate(appUrl) {
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
                    <h2 style="color: #0B1C3E; font-size: 26px; font-weight: bold; margin-bottom: 16px;">أعزائنا الموظفين،</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">هذه رسالة عامة صادرة عبر نظام PHG Connect.</p>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        بمناسبة حلول عيد الفطر المبارك، نتقدم بأصدق التهاني وأطيب التمنيات لجميع موظفي مجموعة فنادق برايم في كافة منشآتها. نسأل الله أن يعيده عليكم بالخير والسعادة والازدهار، وأن يكون هذا العيد مناسبة مليئة بالفرح مع عائلاتكم وأحبائكم.
                    </p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
                        نشكر لكم التزامكم المستمر واحترافيتكم العالية، والتي تساهم بشكل أساسي في تقديم أفضل الخدمات وتحقيق التميز في جميع فنادقنا.
                    </p>
                    <p style="color: #0B1C3E; font-weight: bold; font-size: 18px; margin-bottom: 12px; line-height: 1.6;">
                        عيد مبارك لكم ولعائلاتكم، مع أطيب التمنيات بقضاء أوقات سعيدة ومباركة.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                        — نظام PHG Connect<br>
                        مجموعة فنادق برايم
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <div style="height: 1px; width: 100%; border-top: 1px dashed #cbd5e1;"></div>
                    <div style="display: inline-block; padding: 0 16px; background: #ffffff; position: relative; top: -11px; color: #D4AF37; font-size: 20px;">✦</div>
                </div>

                <!-- ENGLISH SECTION -->
                <div dir="ltr" style="text-align: left; margin-bottom: 20px;">
                    <h2 style="color: #0B1C3E; font-size: 26px; font-weight: bold; margin-bottom: 16px;">Dear Team,</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">This is a system-wide announcement from PHG Connect.</p>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        On the occasion of Eid, we extend our warmest wishes to all team members across Prime Hotels Group properties. May this special time bring joy, peace, and prosperity to you and your families.
                    </p>
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        We would like to take this opportunity to thank you for your continued dedication, professionalism, and commitment to excellence. Your efforts are highly valued and play a key role in delivering exceptional experiences across all our hotels.
                    </p>
                    <p style="color: #0B1C3E; font-weight: bold; font-size: 18px; margin-bottom: 12px; line-height: 1.5;">
                        Eid Mubarak to you and your loved ones. We wish you a joyful and blessed celebration.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
                        — PHG Connect System<br>
                        Prime Hotels Group
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: bold; letter-spacing: 0.5px; font-size: 16px;">Open PHG Connect</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">&copy; ${year} PRIME Hotels Group. All rights reserved.</p>
                <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0 0;">This email was sent from the PHG Connect Intranet.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

async function sendEmails() {
    const htmlTemplate = getBeautifulEidTemplate(APP_URL);
    const BATCH_SIZE = 100;

    console.log(\`Sending \${emails.length} emails...\`);
    
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batchRecipients = emails.slice(i, i + BATCH_SIZE);
        
        const payload = batchRecipients.map(email => ({
          from: \`\${FROM_NAME} <\${FROM_EMAIL}>\`,
          to: [email],
          subject: "Eid Mubarak from PRIME Hotels | عيد مبارك",
          html: htmlTemplate,
          tags: [
            { name: "campaign", value: "eid_greeting_system" }
          ]
        }));
  
        // Fire to Resend Batch API
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": \`Bearer \${RESEND_API_KEY}\`,
          },
          body: JSON.stringify(payload),
        });
  
        const result = await response.json().catch(() => ({}));
        console.log(\`Batch \${i/BATCH_SIZE} completed with status:\`, response.status, result);
    }

    console.log("All emails sent.");
}

sendEmails();
