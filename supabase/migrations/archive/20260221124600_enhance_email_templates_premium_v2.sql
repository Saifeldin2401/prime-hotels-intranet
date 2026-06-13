-- 6. Finance Template
UPDATE notification_email_templates
SET from_name = 'PRIME Connect Finance',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f0f9ff; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #bae6fd;">
            <tr><td style="background: linear-gradient(135deg, #0284c7 0%, #075985 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Finance & Control</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0c4a6e;">{{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">{{message}}</p>
                <div style="margin-bottom: 24px; padding: 16px; background: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd; display: inline-block; min-width: 200px;">
                    <div style="font-size: 12px; color: #0284c7; margin-bottom: 4px;">REQUEST AMOUNT</div>
                    <div style="font-size: 24px; font-weight: 700; color: #075985;">{{amount}}</div>
                </div>
                <br>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #0284c7;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #f7fee7; border-top: 1px solid #e2e8f0; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #0c4a6e; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Finance Alert | {{title}}\n\n{{message}}\nAmount: {{amount}}\n\nLink: {{action_url}}'
WHERE template_key = 'finance_approval_alert';

-- 7. Sales Template
UPDATE notification_email_templates
SET from_name = 'PRIME Connect Sales',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f5f3ff; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #ddd6fe;">
            <tr><td style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Sales & Revenue</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #2e1065;">{{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4c1d95;">{{message}}</p>
                <div style="margin-bottom: 24px; padding: 12px; background: #fdf4ff; border-radius: 8px; border-left: 4px solid #7c3aed; font-size: 14px;">
                    <strong>Pipeline Stage:</strong> {{stage}}
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #7c3aed;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fcfdfe; border-top: 1px solid #e2e8f0; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #7c3aed; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Sales Alert | {{title}}\n\n{{message}}\nStage: {{stage}}\n\nLink: {{action_url}}'
WHERE template_key = 'sales_pipeline_alert';

-- 8. Management/KPI Template
UPDATE notification_email_templates
SET from_name = 'PRIME Dashboard',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <tr><td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Executive Insights</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Review Period: {{period}}</p>
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0f172a;">{{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">{{message}}</p>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #0f172a;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Executive Alert | {{title}}\n\n{{message}}\nPeriod: {{period}}\n\nLink: {{action_url}}'
WHERE template_key = 'management_kpi_alert';

-- 9. Welcome Template
UPDATE notification_email_templates
SET from_name = 'PRIME Connect',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <tr><td style="background: linear-gradient(135deg, #0b1c3e 0%, #1e40af 100%); padding: 48px 32px; text-align: center;">
                <img src="{{logo_url}}" alt="PRIME" height="48" style="display: block; margin: 0 auto 16px;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 500;">Welcome to the Platform</h2>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #0f172a;">Hello {{recipient_name}},</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #475569;">{{message}}</p>
                <div style="padding: 20px; background: #f1f5f9; border-radius: 12px; margin-bottom: 32px;">
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Get started by exploring your personalized dashboard, following training modules, and connecting with your team.</p>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center" style="border-radius: 12px; background-color: #0b1c3e;">
                    <a href="{{action_url}}" target="_blank" style="display: block; padding: 16px 32px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">Get Started Now</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fcfdfe; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Welcome to PRIME Connect | {{title}}\n\nHello {{recipient_name}},\n\n{{message}}\n\nLink: {{action_url}}'
WHERE template_key = 'user_management_welcome';;
