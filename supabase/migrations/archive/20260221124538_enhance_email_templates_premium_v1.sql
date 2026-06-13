-- 1. HR Template
UPDATE notification_email_templates
SET from_name = 'PRIME Connect HR',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <tr><td style="background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">HR & Workflows</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0f172a;">{{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">{{message}}</p>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #0f766e;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fcfdfe; border-top: 1px solid #f1f5f9; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'HR Update | {{title}}\n\n{{message}}\n\nOpen: {{action_url}}'
WHERE template_key = 'hr_employee_update';

-- 2. Learning Template
UPDATE notification_email_templates
SET from_name = 'PRIME Academy',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e7e5e4;">
            <tr><td style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Learning & Development</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1c1917;">{{title}}</h1>
                <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #44403c;">Hello {{recipient_name}},</p>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #44403c;">{{message}}</p>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #d97706;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fffaf0; border-top: 1px solid #fed7aa; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #9a3412; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'New Training | {{title}}\n\nHello {{recipient_name}},\n\n{{message}}\n\nStart: {{action_url}}'
WHERE template_key IN ('learning_assignment_new', 'learning_deadline_reminder');

-- 3. Approval Template
UPDATE notification_email_templates
SET from_name = 'PRIME Workflow',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #cbd5e1;">
            <tr><td style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Workflow Approval</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0f172a;">{{title}}</h1>
                <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #334155;">Hello {{recipient_name}},</p>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #334155;">{{message}}</p>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #1d4ed8;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Approval Required | {{title}}\n\n{{message}}\n\nReview: {{action_url}}'
WHERE template_key IN ('approval_request_new', 'approval_outcome');

-- 4. Operations Template
UPDATE notification_email_templates
SET from_name = 'PRIME Connect Operations',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #fef2f2; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #fecaca;">
            <tr><td style="background: linear-gradient(135deg, #9a3412 0%, #7c2d12 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase;">Operations Alert</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #451a03;">{{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #78350f;">{{message}}</p>
                <div style="margin-bottom: 24px; padding: 12px; background: #fffbeb; border-left: 4px solid #9a3412; font-size: 14px; color: #9a3412;">
                    <strong>Alert Priority:</strong> {{priority}}
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #9a3412;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">{{action_label}}</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fff1f2; border-top: 1px solid #fecaca; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Operations Alert | {{title}}\n\n{{message}}\nPriority: {{priority}}\n\nLink: {{action_url}}'
WHERE template_key = 'operations_incident_alert';

-- 5. Governance / Escalated
UPDATE notification_email_templates
SET from_name = 'PRIME Governance',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #fff1f2; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 16px rgba(225,29,72,0.1); border: 2px solid #fda4af;">
            <tr><td style="background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%); padding: 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="36" style="display: block; margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.9); font-size: 11px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase;">HIGH PRIORITY ESCALATION</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 800; color: #881337;">🚨 SLA Breach: {{title}}</h1>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #9f1239;">{{message}}</p>
                <div style="margin-bottom: 28px; padding: 20px; background: #fff5f5; border-radius: 12px; border: 1px dashed #e11d48;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
                        <strong>Original Approver:</strong> {{original_approver_name}}<br>
                        <strong>Time Overdue:</strong> {{time_overdue}}
                    </p>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="{{align}}" style="border-radius: 12px; background-color: #e11d48;">
                    <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">Intervene Now</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fff1f2; border-top: 1px solid #fecaca; text-align: {{align}};">
                <p style="margin: 0; font-size: 13px; color: #e11d48; line-height: 1.6; font-weight: 600;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = '🚨 ESCALATION | {{title}}\n\n{{message}}\nOverdue: {{time_overdue}}\n\nIntervene: {{action_url}}'
WHERE template_key = 'approval_escalated';;
