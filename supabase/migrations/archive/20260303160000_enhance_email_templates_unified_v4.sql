-- Unified premium email templates (v4)
-- Standardizes layout, supports RTL via {{dir}}/{{align}}, and uses brand variables.

DO $$
DECLARE
  base_html TEXT := '<!DOCTYPE html>
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:{{brand_gradient}};padding:28px 24px;text-align:{{align}};">
              <img src="{{logo_url}}" alt="PHG Connect" height="32" style="display:block;height:32px;margin-bottom:10px;">
              <div style="color:rgba(255,255,255,0.92);font-size:12px;letter-spacing:1.6px;font-weight:700;text-transform:uppercase;">{{business_unit_label}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:{{align}};">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f172a;">{{title}}</h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">{{message}}</p>
              {{reason_html}}
              {{#if has_data_box}}
              <div style="margin:18px 0 22px 0;padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a;font-size:14px;line-height:1.7;">
                {{data_box_content}}
              </div>
              {{/if}}
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
              <div style="margin-top:6px;font-size:11px;line-height:1.6;color:#94a3b8;">© {{year}} PHG Connect</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';

  ai_html TEXT := '<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #1e293b;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 24px;text-align:{{align}};">
              <img src="{{logo_url}}" alt="PHG Connect" height="28" style="display:block;height:28px;margin-bottom:10px;filter:brightness(0) invert(1);">
              <div style="color:#38bdf8;font-size:12px;letter-spacing:2px;font-weight:800;text-transform:uppercase;">DAILY AI INTELLIGENCE BRIEF</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:{{align}};">
              <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0f172a;">{{title}}</h1>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#64748b;">{{date}}</p>

              <div style="margin:0 0 18px 0;padding:16px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                <div style="font-size:12px;letter-spacing:1px;font-weight:800;color:#0f172a;margin-bottom:6px;">AI INSIGHTS</div>
                <div style="font-size:14px;line-height:1.8;color:#334155;">{{ai_insights}}</div>
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <div style="padding:14px;border-radius:14px;background:#f0fafb;border:1px solid #cff1f6;">
                      <div style="font-size:11px;letter-spacing:1px;font-weight:800;color:#0891b2;margin-bottom:4px;">HEALTH</div>
                      <div style="font-size:22px;font-weight:900;color:#0e7490;">{{health_score}}%</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <div style="padding:14px;border-radius:14px;background:#fffbeb;border:1px solid #fef08a;">
                      <div style="font-size:11px;letter-spacing:1px;font-weight:800;color:#a16207;margin-bottom:4px;">PENDING</div>
                      <div style="font-size:22px;font-weight:900;color:#854d0e;">{{pending_count}}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.8;color:#64748b;font-style:italic;">{{closing_remarks}}</p>

              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:12px;background:#0f172a;">
                    <a href="{{action_url}}" target="_blank" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;">Open Full Briefing</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:{{align}};">
              <div style="font-size:12px;line-height:1.6;color:#64748b;">{{footer_text}}</div>
              <div style="margin-top:6px;font-size:11px;line-height:1.6;color:#94a3b8;">© {{year}} PHG Connect</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';

  weekly_html TEXT := '<!DOCTYPE html>
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#334155;padding:28px 24px;text-align:center;">
              <img src="{{logo_url}}" alt="PHG Connect" height="28" style="display:block;height:28px;margin:0 auto 10px;">
              <div style="color:rgba(255,255,255,0.82);font-size:12px;letter-spacing:2px;font-weight:800;text-transform:uppercase;">WEEKLY MANAGEMENT DIGEST</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:{{align}};">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;color:#0f172a;">{{title}}</h1>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#64748b;">{{message}}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
                <tr>
                  <td align="center" style="padding:12px;background:#f0fdf4;border-radius:12px;border:1px solid #dcfce7;">
                    <div style="font-size:11px;letter-spacing:1px;font-weight:800;color:#166534;margin-bottom:4px;">COMPLETED</div>
                    <div style="font-size:22px;font-weight:900;color:#15803d;">{{completed_count}}</div>
                  </td>
                  <td width="10"></td>
                  <td align="center" style="padding:12px;background:#fef2f2;border-radius:12px;border:1px solid #fee2e2;">
                    <div style="font-size:11px;letter-spacing:1px;font-weight:800;color:#991b1b;margin-bottom:4px;">OVERDUE</div>
                    <div style="font-size:22px;font-weight:900;color:#b91c1c;">{{overdue_count}}</div>
                  </td>
                  <td width="10"></td>
                  <td align="center" style="padding:12px;background:#fffbeb;border-radius:12px;border:1px solid #fef3c7;">
                    <div style="font-size:11px;letter-spacing:1px;font-weight:800;color:#92400e;margin-bottom:4px;">UPCOMING</div>
                    <div style="font-size:22px;font-weight:900;color:#b45309;">{{upcoming_count}}</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:12px;background:#334155;">
                    <a href="{{action_url}}" target="_blank" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:#fcfdff;border-top:1px solid #eef2f7;text-align:{{align}};">
              <div style="font-size:12px;line-height:1.6;color:#64748b;">{{footer_text}}</div>
              <div style="margin-top:6px;font-size:11px;line-height:1.6;color:#94a3b8;">© {{year}} PHG Connect</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
BEGIN
  -- Core domain templates (base layout)
  INSERT INTO public.notification_email_templates (
    template_key, business_domain, notification_type, subject_template, html_template, text_template, from_name, from_email, is_active
  ) VALUES
    ('system_generic_alert', 'system', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect', 'notifications@phg-connect.com', true),
    ('user_management_welcome', 'user_management', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect', 'notifications@phg-connect.com', true),
    ('operations_incident_alert', 'operations', 'escalation_alert', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Operations', 'notifications@phg-connect.com', true),
    ('hr_employee_update', 'hr', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect HR', 'notifications@phg-connect.com', true),
    ('finance_approval_alert', 'finance', 'approval_required', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Finance', 'notifications@phg-connect.com', true),
    ('sales_pipeline_alert', 'sales', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Sales', 'notifications@phg-connect.com', true),
    ('management_kpi_alert', 'management', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Management', 'notifications@phg-connect.com', true),
    ('learning_assignment_new', 'learning', 'training_assigned', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Academy', 'notifications@phg-connect.com', true),
    ('learning_deadline_reminder', 'learning', 'training_deadline', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Academy', 'notifications@phg-connect.com', true),
    ('approval_request_new', 'hr', 'approval_required', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Workflow', 'notifications@phg-connect.com', true),
    ('approval_outcome', 'hr', 'approval_outcome', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Workflow', 'notifications@phg-connect.com', true),
    ('approval_escalated', 'management', 'escalation_alert', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Governance', 'notifications@phg-connect.com', true),
    ('certificate_earned', 'learning', 'system', '{{business_unit_label}} | {{title}}', base_html,
      E'{{business_unit_label}} | {{title}}\n\n{{message}}\n\n{{action_url}}',
      'PHG Connect Academy', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE
  SET
    business_domain = EXCLUDED.business_domain,
    notification_type = EXCLUDED.notification_type,
    subject_template = EXCLUDED.subject_template,
    html_template = EXCLUDED.html_template,
    text_template = EXCLUDED.text_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    is_active = true,
    updated_at = now();

  -- Specialized templates
  INSERT INTO public.notification_email_templates (
    template_key, business_domain, notification_type, subject_template, html_template, text_template, from_name, from_email, is_active
  ) VALUES
    ('ai_daily_briefing', 'management', 'system', '{{business_unit_label}} | {{title}}', ai_html,
      E'{{business_unit_label}} | {{title}}\n\n{{ai_insights}}\n\nHealth: {{health_score}}%\nPending: {{pending_count}}\n\n{{action_url}}',
      'PHG Connect AI', 'notifications@phg-connect.com', true),
    ('weekly_performance_digest', 'management', 'system', '{{business_unit_label}} | {{title}}', weekly_html,
      E'{{business_unit_label}} | {{title}}\n\nCompleted: {{completed_count}}\nOverdue: {{overdue_count}}\nUpcoming: {{upcoming_count}}\n\n{{action_url}}',
      'PHG Connect Analytics', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE
  SET
    business_domain = EXCLUDED.business_domain,
    notification_type = EXCLUDED.notification_type,
    subject_template = EXCLUDED.subject_template,
    html_template = EXCLUDED.html_template,
    text_template = EXCLUDED.text_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    is_active = true,
    updated_at = now();
END $$;
