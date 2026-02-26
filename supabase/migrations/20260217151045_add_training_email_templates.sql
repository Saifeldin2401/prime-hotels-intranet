INSERT INTO notification_email_templates (template_key, business_domain, subject_template, html_template, from_name, is_active)
VALUES 
(
    'learning_assignment_new', 
    'hr', 
    'New Training Assigned: {{module_title}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#d97706;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;"></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">Learning & Development</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">A new training module has been assigned to you: <strong>{{module_title}}</strong>.</p><p style="margin:0 0 14px 0;line-height:1.6;">Due Date: {{due_date}}</p><p style="margin:0 0 20px 0;line-height:1.6;">Continuous learning is key to our excellence at PRIME. Please complete this module at your earliest convenience.</p><a href="{{action_url}}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Start Training</a><p style="margin:22px 0 0 0;font-size:12px;color:#7b8798;">This notification was sent by PRIME Connect Learning System.</p></td></tr></table></td></tr></table></body></html>',
    'PRIME Academy',
    true
),
(
    'learning_deadline_reminder', 
    'hr', 
    'Upcoming Deadline: {{module_title}}', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Arial,sans-serif;color:#12233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8f0;"><tr><td style="background:#b45309;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700;"><img src="{{logo_url}}" alt="PRIME" height="32" style="display:block;height:32px;"></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 12px 0;font-size:14px;color:#5b6b84;">Learning Reminder</p><h1 style="margin:0 0 16px 0;font-size:24px;color:#0b1c3e;">{{title}}</h1><p style="margin:0 0 14px 0;line-height:1.6;">Hello {{recipient_name}},</p><p style="margin:0 0 14px 0;line-height:1.6;">This is a reminder that your training <strong>{{module_title}}</strong> is due tomorrow.</p><p style="margin:0 0 20px 0;line-height:1.6;">Please ensure you complete it to maintain your certification status.</p><a href="{{action_url}}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Complete Training Now</a><p style="margin:22px 0 0 0;font-size:12px;color:#7b8798;">This notification was sent by PRIME Connect Learning System.</p></td></tr></table></td></tr></table></body></html>',
    'PRIME Academy',
    true
)
ON CONFLICT (template_key) DO UPDATE SET 
    html_template = EXCLUDED.html_template,
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name;
;
