-- 1. Approval Required Template
INSERT INTO notification_email_templates (template_key, business_domain, subject_template, html_template, from_name, is_active)
VALUES 
(
    'approval_request_new', 
    'system', 
    'Approval Required: {{title}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#1d4ed8;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;"></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">Workflow Approval</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">{{requester_name}} has submitted a request that requires your approval.</p><p style="margin:0 0 14px 0;line-height:1.6;"><strong>Summary:</strong> {{message}}</p><p style="margin:0 0 20px 0;line-height:1.6;">Please review the details in the portal to take action.</p><a href="{{action_url}}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open Approval Center</a><p style="margin:22px 0 0 0;font-size:12px;color:#7b8798;">This is an automated workflow notification from PRIME Connect.</p></td></tr></table></td></tr></table></body></html>',
    'PRIME Workflow',
    true
),
-- 2. Approval Outcome Template
(
    'approval_outcome', 
    'system', 
    'Decision: {{title}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:{{header_color}};color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;"></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">Workflow Update</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">{{message}}</p>{{reason_html}}<p style="margin:20px 0 0 0;line-height:1.6;">You can view the full record in your dashboard.</p><a href="{{action_url}}" style="display:inline-block;background:{{header_color}};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">View Details</a></td></tr></table></td></tr></table></body></html>',
    'PRIME Workflow',
    true
),
-- 3. Approval Escalated Template
(
    'approval_escalated', 
    'management', 
    'SLA ESCALATION: {{title}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#fff1f2;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #fecaca;"><tr><td style="background:#e11d48;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;"></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#e11d48;font-weight:700;">HIGH PRIORITY ESCALATION</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">SLA Breach: {{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">This is an automated escalation. A workflow request has exceeded its service level agreement (SLA) threshold and requires immediate executive oversight.</p><p style="margin:0 12px 16px 0;padding:12px;background:#f8fafc;border-left:4px solid #e11d48;line-height:1.6;"><strong>Details:</strong> {{message}}<br><strong>Waiting for:</strong> {{original_approver_name}}<br><strong>Time Overdue:</strong> {{time_overdue}}</p><a href="{{action_url}}" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Intervene Now</a></td></tr></table></td></tr></table></body></html>',
    'PRIME Governance',
    true
),
-- 4. AI Daily Briefing Template
(
    'ai_daily_briefing', 
    'management', 
    'Daily Briefing: {{property_name}} - {{date}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#1e293b;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="700" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);"><tr><td style="background:#0f172a;color:#ffffff;padding:24px 32px;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;margin-bottom:8px;"><div style="font-size:14px;opacity:0.8;">DAILY DIGITAL BRIEFING</div></td></tr><tr><td style="padding:32px;"><h1 style="margin:0 0 8px 0;font-size:26px;color:#0f172a;">Executive Overview</h1><p style="margin:0 0 24px 0;color:#64748b;">Good morning {{recipient_name}}. Here is your automated briefing for today.</p><div style="margin-bottom:24px;padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><h2 style="margin:0 0 12px 0;font-size:18px;color:#0f172a;">AI Insights</h2><p style="margin:0;line-height:1.7;color:#334155;">{{ai_insights}}</p></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="50%" style="padding-right:12px;vertical-align:top;"><div style="padding:16px;background:#f0fafb;border-radius:8px;border:1px solid #cff1f6;"><h3 style="margin:0 0 8px 0;font-size:14px;color:#0891b2;">Property Health</h3><div style="font-size:24px;font-weight:700;color:#0e7490;">{{health_score}}%</div></div></td><td width="50%" style="padding-left:12px;vertical-align:top;"><div style="padding:16px;background:#fefce8;border-radius:8px;border:1px solid #fef08a;"><h3 style="margin:0 0 8px 0;font-size:14px;color:#a16207;">Pending Tasks</h3><div style="font-size:24px;font-weight:700;color:#854d0e;">{{pending_count}}</div></div></td></tr></table><p style="margin:24px 0 0 0;line-height:1.6;">{{closing_remarks}}</p><div style="margin-top:32px;"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">Open Management Dashboard</a></div></td></tr></table></td></tr></table></body></html>',
    'PRIME AI Assistant',
    true
)
ON CONFLICT (template_key) DO UPDATE SET 
    html_template = EXCLUDED.html_template,
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name;
;
