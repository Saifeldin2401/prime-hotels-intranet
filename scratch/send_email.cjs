
const https = require('https');

const data = JSON.stringify({
  from: "PHG Connect <notifications@phg-connect.com>",
  to: ["elegantlayla88@gmail.com"],
  subject: "تم إلغاء قفل حسابك - PHG Connect",
  html: `<div dir=\"rtl\" style=\"font-family: sans-serif; line-height: 1.6; color: #334155; text-align: right; background-color: #f8fafc; padding: 40px;\">
    <div style=\"max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);\">
      <h1 style=\"color: #0f172a; font-size: 24px; margin-bottom: 24px;\">تمت استعادة الوصول إلى حسابك</h1>
      <p>مرحباً Layla Ali Shrahily،</p>
      <p>نود إخطارك بأنه تم إلغاء قفل حسابك في <strong>PRIME Connect</strong> بنجاح. يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني.</p>
      <p>إذا كنت قد نسيت كلمة المرور، يمكنك استخدام رابط \"نسيت كلمة المرور\" في صفحة تسجيل الدخول.</p>
      <div style=\"margin: 32px 0;\">
        <a href=\"https://phg-connect.com/login\" style=\"display: inline-block; background-color: #0B1C3E; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;\">تسجيل الدخول إلى PRIME Connect</a>
      </div>
      <hr style=\"border: none; border-top: 1px solid #e2e8f0; margin-top: 40px;\" />
      <p style=\"font-size: 13px; color: #64748b;\">إشعار تلقائي من PHG Connect. جميع الحقوق محفوظة &copy; 2026</p>
    </div>
  </div>`
});

const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer re_eQhYG7XK_xWuoxmtwt2q3cu2XhVKnsgzn',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
