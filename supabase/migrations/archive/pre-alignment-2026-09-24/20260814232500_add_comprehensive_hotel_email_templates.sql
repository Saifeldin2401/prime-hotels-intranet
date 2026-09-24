-- ============================================================================
-- Migration: 20260814232500_add_comprehensive_hotel_email_templates.sql
-- Description: Adds all missing operational, HR, maintenance, compliance,
--              procurement, and recognition email templates for Altus Connect.
-- ============================================================================

DO $$
DECLARE
  v_master_template TEXT := '<!DOCTYPE html>
<html lang="{{lang}}" dir="{{dir}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #F8FAFC; width: 100%; padding: 40px 0;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(11, 21, 40, 0.05);">
      <tr>
        <td height="4" style="background-color: #C9A54D; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="background-color: #0B1528; padding: 32px 40px; text-align: {{align}};">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="{{align}}">
                <img src="{{logo_url}}" alt="Altus" height="36" style="display: block; height: 36px; border: 0; outline: none;">
              </td>
              <td align="{{align_opposite}}" style="vertical-align: middle;">
                <span style="display: inline-block; padding: 4px 12px; background-color: rgba(201, 165, 77, 0.15); border: 1px solid rgba(201, 165, 77, 0.4); border-radius: 9999px; color: #C9A54D; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                  {{business_unit_label}}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px; text-align: {{align}};">
          <h1 style="margin: 0 0 16px 0; color: #0F172A; font-size: 24px; font-weight: 800; line-height: 1.3;">{{title}}</h1>
          <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">{{greeting_hello}}{{recipient_name}},</p>
          <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">{{message}}</p>
          {{#if has_data_box}}
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
            <tr>
              <td style="padding: 24px; text-align: {{align}}; color: #0F172A; font-size: 14px; line-height: 1.7;">
                {{data_box_content}}
              </td>
            </tr>
          </table>
          {{/if}}
          <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
            <tr>
              <td align="{{align}}" style="border-radius: 8px; background-color: {{brand_color}};">
                <a href="{{action_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: {{brand_color}}; color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px;">{{action_label}}</a>
              </td>
            </tr>
          </table>
          <p style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 13px; line-height: 1.6;">
            {{trouble_clicking}}<br>
            <a href="{{action_url}}" style="color: #C9A54D; word-break: break-all; text-decoration: underline;">{{action_url}}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #F1F5F9; padding: 32px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0 0 12px 0; color: #64748B; font-size: 13px; line-height: 1.6;">{{footer_text}}</p>
          <div style="margin-bottom: 16px;">
            <a href="{{app_url}}" style="color: #0B1528; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 10px;">{{dashboard_link_text}}</a> &bull;
            <a href="{{app_url}}/knowledge" style="color: #0B1528; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 10px;">{{help_link_text}}</a>
          </div>
          <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 1.5;">&copy; {{year}} Altus Hospitality. {{rights_reserved}}</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>';

BEGIN
  -- 1. Operations: Tasks & Maintenance
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('task_assigned_alert', 'operations', 'task', 'New Task Assignment | {{task_title}}', v_master_template, 'Altus Operations', 'notifications@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('task_overdue_escalation', 'operations', 'task', 'Task SLA Alert | {{task_title}} is Overdue', v_master_template, 'Altus Operations', 'notifications@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('maintenance_ticket_assigned', 'operations', 'maintenance', 'Work Order Assigned #{{ticket_id}} | {{issue_title}}', v_master_template, 'Altus Engineering', 'engineering@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('maintenance_ticket_resolved', 'operations', 'maintenance', 'Work Order Resolved #{{ticket_id}} | {{issue_title}}', v_master_template, 'Altus Engineering', 'engineering@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('vip_guest_arrival_alert', 'operations', 'guest_experience', 'VIP Arrival Alert | {{guest_name}} - {{room_number}}', v_master_template, 'Altus Guest Experience', 'vip-services@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('lost_found_match_notification', 'operations', 'housekeeping', 'Lost & Found Update #{{item_id}} | {{item_name}}', v_master_template, 'Altus Housekeeping', 'housekeeping@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  -- 2. HR & Compliance
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('leave_request_submitted_manager', 'hr', 'leave', 'Leave Request Pending | {{employee_name}} - {{leave_type}}', v_master_template, 'Altus HR', 'hr@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('leave_request_decision', 'hr', 'leave', 'Leave Request {{decision}} | {{leave_type}} ({{start_date}} - {{end_date}})', v_master_template, 'Altus HR', 'hr@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('iqama_national_id_expiry_warning', 'hr', 'compliance', 'Document Expiry Reminder | {{document_type}} expires in {{days_remaining}} days', v_master_template, 'Altus HR Compliance', 'hr-compliance@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('probation_period_review_due', 'hr', 'evaluation', 'Probation Review Due | {{employee_name}} ({{department_name}})', v_master_template, 'Altus HR', 'hr@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('employee_promotion_transfer_notice', 'hr', 'announcement', 'Official Career Notice | Congratulations {{employee_name}}!', v_master_template, 'Altus HR', 'hr@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('work_anniversary_greeting', 'hr', 'culture', 'Happy Work Anniversary, {{employee_name}}! 💐', v_master_template, 'Altus People & Culture', 'culture@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  -- 3. Standards & SOPs
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('sop_mandatory_acknowledgment', 'operations', 'sop', 'Mandatory SOP Acknowledgment | {{sop_title}}', v_master_template, 'Altus Quality & Standards', 'standards@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('sop_annual_review_reminder', 'operations', 'sop', 'Annual SOP Review Due | {{sop_title}}', v_master_template, 'Altus Quality & Standards', 'standards@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  -- 4. Procurement & CaPEx
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('purchase_request_pending_approval', 'finance', 'procurement', 'Purchase Request Approval Required #{{pr_number}} | SAR {{total_amount}}', v_master_template, 'Altus Procurement', 'procurement@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('purchase_order_issued_vendor', 'finance', 'purchasing', 'Official Purchase Order #{{po_number}} | Altus Hospitality', v_master_template, 'Altus Purchasing', 'purchasing@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('capex_milestone_breach_alert', 'finance', 'capex', 'CaPEx Project Alert | Milestone Delay: {{project_name}}', v_master_template, 'Altus CaPEx Management', 'capex@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  -- 5. Learning & Shifts & Recognition
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('recertification_due_reminder', 'operations', 'training', 'Recertification Due | {{certificate_name}} expires in {{days_remaining}} days', v_master_template, 'Altus Academy', 'academy@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('team_compliance_digest_manager', 'operations', 'training', 'Weekly Team Training Digest | {{department_name}}', v_master_template, 'Altus Academy', 'academy@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('shift_roster_published', 'operations', 'scheduling', 'New Shift Schedule Published | Week {{week_number}}', v_master_template, 'Altus Operations', 'operations@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('shift_swap_request_notification', 'operations', 'scheduling', 'Shift Swap Request | {{requestor_name}} ⇄ {{target_name}}', v_master_template, 'Altus Operations', 'operations@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('employee_of_the_month_spotlight', 'management', 'announcement', '🌟 Employee of the Month Spotlight | Congratulations {{winner_name}}!', v_master_template, 'Altus Executive Office', 'executive-office@altus-advisory.com', true)
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    from_name = EXCLUDED.from_name,
    from_email = EXCLUDED.from_email,
    html_template = EXCLUDED.html_template,
    is_active = true;

END $$;
