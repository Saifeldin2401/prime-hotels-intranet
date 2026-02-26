-- 10. AI Daily Briefing
UPDATE notification_email_templates
SET from_name = 'PRIME AI Assistant',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 700px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
            <tr><td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: {{align}};">
                <img src="{{logo_url}}" alt="PRIME" height="32" style="display: block; margin-bottom: 12px; filter: brightness(0) invert(1);">
                <div style="color: #38bdf8; font-size: 11px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">DAILY AI INTELLIGENCE BRIEF</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700; color: #0f172a;">Good morning, {{recipient_name}}</h1>
                <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #64748b;">Here is your automated strategic overview for <strong>{{date}}</strong>.</p>
                
                <div style="margin-bottom: 32px; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 8px;">✨</span> AI Insights
                    </h3>
                    <p style="margin: 0; line-height: 1.8; color: #334155; font-size: 15px;">{{ai_insights}}</p>
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="50%" style="padding-right: 10px; vertical-align: top;">
                            <div style="padding: 20px; background: #f0fafb; border-radius: 12px; border: 1px solid #cff1f6;">
                                <div style="font-size: 12px; color: #0891b2; margin-bottom: 4px; font-weight: 600;">PROPERTY HEALTH</div>
                                <div style="font-size: 28px; font-weight: 800; color: #0e7490;">{{health_score}}%</div>
                            </div>
                        </td>
                        <td width="50%" style="padding-left: 10px; vertical-align: top;">
                            <div style="padding: 20px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef08a;">
                                <div style="font-size: 12px; color: #a16207; margin-bottom: 4px; font-weight: 600;">PENDING TASKS</div>
                                <div style="font-size: 28px; font-weight: 800; color: #854d0e;">{{pending_count}}</div>
                            </div>
                        </td>
                    </tr>
                </table>

                <p style="margin: 32px 0 32px 0; font-style: italic; color: #64748b; font-size: 14px; line-height: 1.6;">"{{closing_remarks}}"</p>

                <table role="presentation" width="100%"><tr><td align="center" style="border-radius: 12px; background-color: #0f172a;">
                    <a href="{{action_url}}" target="_blank" style="display: block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">Open Full Briefing</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #f1f5f9; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Daily AI Briefing | {{date}}\n\nInsights: {{ai_insights}}\nHealth Score: {{health_score}}%\nPending: {{pending_count}}\n\nFull Dashboard: {{action_url}}'
WHERE template_key = 'ai_daily_briefing';

-- 11. Weekly performance digest
UPDATE notification_email_templates
SET from_name = 'PRIME Analytics',
    html_template = '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ''Inter'', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr><td align="center"><table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <tr><td style="background: #334155; padding: 40px 32px; text-align: center;">
                <img src="{{logo_url}}" alt="PRIME" height="32" style="margin-bottom: 8px;">
                <div style="color: rgba(255,255,255,0.7); font-size: 11px; letter-spacing: 1.5px; font-weight: 600;">WEEKLY MANAGEMENT DIGEST</div>
            </td></tr>
            <tr><td style="padding: 40px 32px; text-align: {{align}};">
                <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #0f172a;">Weekly Performance Summary</h1>
                <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #64748b;">Hello {{recipient_name}}, here is your team''s performance overview for this week.</p>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                    <tr>
                        <td align="center" style="padding: 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #dcfce7;">
                            <div style="font-size: 11px; color: #166534; font-weight: 700; margin-bottom: 4px;">COMPLETED</div>
                            <div style="font-size: 24px; font-weight: 800; color: #15803d;">{{completed_count}}</div>
                        </td>
                        <td width="12"></td>
                        <td align="center" style="padding: 16px; background: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
                            <div style="font-size: 11px; color: #b91c1c; font-weight: 700; margin-bottom: 4px;">OVERDUE</div>
                            <div style="font-size: 24px; font-weight: 800; color: #b91c1c;">{{overdue_count}}</div>
                        </td>
                        <td width="12"></td>
                        <td align="center" style="padding: 16px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
                            <div style="font-size: 11px; color: #92400e; font-weight: 700; margin-bottom: 4px;">UPCOMING</div>
                            <div style="font-size: 24px; font-weight: 800; color: #b45309;">{{upcoming_count}}</div>
                        </td>
                    </tr>
                </table>

                <div style="padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #475569;">{{message}}</p>
                </div>

                <table role="presentation" width="100%" style="margin-top: 32px;"><tr><td align="center" style="border-radius: 12px; background-color: #334155;">
                    <a href="{{action_url}}" target="_blank" style="display: block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">View Regional Dashboard</a>
                </td></tr></table>
            </td></tr>
            <tr><td style="padding: 24px 32px; background-color: #fcfdfe; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">{{footer_text}}</p>
            </td></tr>
        </table></td></tr>
    </table>
</body></html>',
    text_template = 'Weekly Digest | {{recipient_name}}\n\nCompleted: {{completed_count}}\nOverdue: {{overdue_count}}\nUpcoming: {{upcoming_count}}\n\nView: {{action_url}}'
WHERE template_key = 'weekly_performance_digest';;
