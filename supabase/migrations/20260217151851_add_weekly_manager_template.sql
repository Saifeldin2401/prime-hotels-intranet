INSERT INTO notification_email_templates (template_key, business_domain, subject_template, html_template, from_name, is_active)
VALUES 
(
    'weekly_performance_digest', 
    'management', 
    'Weekly Training Digest: Your Team Performance', 
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#1e293b;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><tr><td style="background:#334155;color:#ffffff;padding:24px;text-align:center;"><img src="{{logo_url}}" alt="PRIME" height="32" style="margin-bottom:8px;"><div style="font-size:12px;letter-spacing:1px;opacity:0.8;">WEEKLY MANAGER DIGEST</div></td></tr><tr><td style="padding:32px;"><h1 style="margin:0 0 16px 0;font-size:22px;">Team Performance Summary</h1><p style="margin:0 0 24px 0;color:#64748b;line-height:1.6;">Hello {{recipient_name}}, here is how your department performed in training this week.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;"><tr><td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;"><div style="font-size:12px;color:#166534;margin-bottom:4px;">COMPLETED</div><div style="font-size:24px;font-weight:700;color:#15803d;">{{completed_count}}</div></td><td width="12"></td><td style="padding:16px;background:#fef2f2;border-radius:8px;text-align:center;"><div style="font-size:12px;color:#991b1b;margin-bottom:4px;">OVERDUE</div><div style="font-size:24px;font-weight:700;color:#b91c1c;">{{overdue_count}}</div></td><td width="12"></td><td style="padding:16px;background:#fffbeb;border-radius:8px;text-align:center;"><div style="font-size:12px;color:#92400e;margin-bottom:4px;">DUE SOON</div><div style="font-size:24px;font-weight:700;color:#b45309;">{{upcoming_count}}</div></td></tr></table><div style="background:#f8fafc;padding:20px;border-radius:8px;border:1px solid #e2e8f0;"><p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">{{message}}</p></div><div style="margin-top:32px;text-align:center;"><a href="{{action_url}}" style="display:inline-block;background:#334155;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">View Team Dashboard</a></div></td></tr></table></td></tr></table></body></html>',
    'PRIME Analytics',
    true
)
ON CONFLICT (template_key) DO UPDATE SET 
    html_template = EXCLUDED.html_template,
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name;
;
