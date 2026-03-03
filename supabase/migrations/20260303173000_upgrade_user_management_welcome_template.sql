-- Professional onboarding template for created users (temporary password flow)
UPDATE public.notification_email_templates
SET
  subject_template = '{{business_unit_label}} | {{title}}',
  html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:{{brand_gradient}};padding:28px 24px;text-align:{{align}};">
              <img src="{{logo_url}}" alt="PHG Connect" height="32" style="display:block;height:32px;margin-bottom:10px;">
              <div style="color:rgba(255,255,255,0.92);font-size:12px;letter-spacing:1.6px;font-weight:700;text-transform:uppercase;">{{business_unit_label}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:{{align}};">
              <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#0f172a;">{{title}}</h1>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">Hello {{recipient_name}},</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">{{message}}</p>

              <div style="margin:0 0 16px 0;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;text-align:{{align}};">
                <div style="font-size:12px;letter-spacing:1px;font-weight:800;color:#334155;text-transform:uppercase;margin-bottom:10px;">Temporary Login Credentials</div>
                <div style="font-size:14px;line-height:1.8;color:#0f172a;margin-bottom:6px;">
                  <span style="display:inline-block;min-width:92px;color:#64748b;">Email:</span>
                  <strong>{{credential_email}}</strong>
                </div>
                <div style="font-size:14px;line-height:1.8;color:#0f172a;">
                  <span style="display:inline-block;min-width:92px;color:#64748b;">Password:</span>
                  <strong>{{credential_password}}</strong>
                </div>
              </div>

              <div style="margin:0 0 22px 0;padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;line-height:1.7;">
                {{security_note}}
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:12px;background:{{brand_color}};">
                    <a href="{{action_url}}" target="_blank" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;">{{action_label}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:#fcfdff;border-top:1px solid #eef2f7;text-align:{{align}};">
              <div style="font-size:12px;line-height:1.6;color:#64748b;">{{footer_text}}</div>
              <div style="margin-top:6px;font-size:11px;line-height:1.6;color:#94a3b8;">&copy; {{year}} PHG Connect</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  text_template = E'{{business_unit_label}} | {{title}}\n\nHello {{recipient_name}},\n{{message}}\n\nTemporary login credentials:\nEmail: {{credential_email}}\nPassword: {{credential_password}}\n\n{{security_note}}\n\n{{action_url}}',
  updated_at = now()
WHERE template_key = 'user_management_welcome';
