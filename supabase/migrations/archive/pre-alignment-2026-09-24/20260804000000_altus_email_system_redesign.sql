-- ALTUS MISSION — Complete Email System Redesign & Brand Alignment
-- Migration Version: 20260804000000_altus_email_system_redesign.sql

-- 1. Ensure default fallback values reflect Altus branding with PHG sender domain
ALTER TABLE public.notification_email_templates 
  ALTER COLUMN from_name SET DEFAULT 'Altus Hospitality',
  ALTER COLUMN from_email SET DEFAULT 'notifications@phg-connect.com';

-- 2. Upsert all 30+ system email templates across all functional domains

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
            <a href="{{app_url}}/knowledge-base" style="color: #0B1528; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 10px;">{{help_link_text}}</a>
          </div>
          <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 1.5;">&copy; {{year}} Altus Hospitality. {{rights_reserved}}</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>';

BEGIN

  -- 1. System Generic Alert
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('system_generic_alert', 'system', 'system', 'Altus Alert | {{title}}', v_master_template, 'Altus System', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 2. User Welcome & Activation
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('user_welcome_invitation', 'user_management', 'system', 'Welcome to Altus Connect | {{title}}', v_master_template, 'Altus Team', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 3. Password Reset
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('auth_password_reset', 'user_management', 'system', 'Reset Your Altus Connect Password', v_master_template, 'Altus Security', 'security@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 4. Magic Link Authentication
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('auth_magic_link', 'user_management', 'system', 'Your Altus Connect Instant Access Link', v_master_template, 'Altus Security', 'security@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 5. Email Verification
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('auth_verification', 'user_management', 'system', 'Verify Your Email Address | Altus Connect', v_master_template, 'Altus Security', 'security@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 6. Two-Factor Authentication Code
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('auth_2fa_code', 'user_management', 'system', 'Altus Security Code: {{code}}', v_master_template, 'Altus Security', 'security@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 7. Security Alert / Suspicious Activity
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('auth_security_alert', 'user_management', 'system', 'Security Alert: New Sign-in Attempt Detected', v_master_template, 'Altus Security', 'security@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 8. Organization & Property Invitations
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('org_invitation', 'user_management', 'system', 'Invitation to Join {{org_name}} on Altus Connect', v_master_template, 'Altus Team', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 9. Staff Onboarding Welcome
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('staff_onboarding_welcome', 'hr', 'system', 'Welcome to the Altus Hospitality Team', v_master_template, 'Altus HR', 'hr@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 10. Booking Reservation Confirmation
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('booking_reservation_confirmation', 'operations', 'booking', 'Altus Hospitality | Reservation Confirmation #{{confirmation_number}}', v_master_template, 'Altus Hospitality Services', 'reservations@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 11. Booking Reservation Update
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('booking_reservation_update', 'operations', 'booking', 'Reservation Updated #{{confirmation_number}} | Altus Hospitality', v_master_template, 'Altus Hospitality Services', 'reservations@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 12. Booking Reservation Change
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('booking_reservation_change', 'operations', 'booking', 'Important Change to Reservation #{{confirmation_number}}', v_master_template, 'Altus Hospitality Services', 'reservations@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 13. Booking Reservation Cancellation
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('booking_reservation_cancellation', 'operations', 'booking', 'Reservation Cancellation Notice #{{confirmation_number}}', v_master_template, 'Altus Hospitality Services', 'reservations@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 14. Payment & Invoice Receipt
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('payment_invoice_receipt', 'finance', 'billing', 'Altus Invoice Receipt #{{invoice_number}}', v_master_template, 'Altus Finance', 'finance@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 15. Refund Notification
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('refund_notification', 'finance', 'billing', 'Refund Processed: SAR {{amount}}', v_master_template, 'Altus Finance', 'finance@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 16. Subscription & Billing Alert
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('subscription_billing_alert', 'finance', 'billing', 'Altus Subscription Billing Statement', v_master_template, 'Altus Billing', 'finance@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 17. Subscription Trial Expiration
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('subscription_trial_expiration', 'finance', 'billing', 'Your Altus Trial Expires in {{days_left}} Days', v_master_template, 'Altus Billing', 'finance@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 18. Subscription Plan Change
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('subscription_plan_change', 'finance', 'billing', 'Subscription Plan Updated to {{plan_name}}', v_master_template, 'Altus Billing', 'finance@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 19. Support Ticket Notification
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('support_ticket_notification', 'operations', 'system', 'Support Ticket Updated #{{ticket_id}}', v_master_template, 'Altus Support', 'support@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 20. Activity Notification
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('activity_notification', 'operations', 'system', 'New Activity in {{department_name}}', v_master_template, 'Altus Operations', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 21. Admin System Alert
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('admin_system_alert', 'system', 'system', 'System Administrative Notice: {{title}}', v_master_template, 'Altus System Admin', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 22. Workflow Step Notification
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('workflow_step_notification', 'operations', 'workflow', 'Workflow Action Required: {{step_name}}', v_master_template, 'Altus Workflow', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 23. Automation Trigger Email
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('automation_trigger_email', 'system', 'automation', 'Automated Event Notice | {{title}}', v_master_template, 'Altus Automation', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 24. Marketing Newsletter & Announcements
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('marketing_newsletter_template', 'sales', 'newsletter', 'Altus Luxury Hospitality Insights | {{title}}', v_master_template, 'Altus Hospitality', 'newsletter@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 25. Internal Company Announcement
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('internal_announcement', 'management', 'announcement', 'Altus Internal Announcement | {{title}}', v_master_template, 'Altus Executive Office', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 26. Training Module Assigned
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('training_module_assigned', 'operations', 'training', 'New Learning Assignment: {{module_title}}', v_master_template, 'Altus Academy', 'academy@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 27. Certificate Earned
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('training_certificate_earned', 'operations', 'training', 'Congratulations! Certificate Earned: {{certificate_name}}', v_master_template, 'Altus Academy', 'academy@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 28. Approval Request Pending
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('approval_request_pending', 'finance', 'approval', 'Approval Required: {{approval_type}} #{{request_id}}', v_master_template, 'Altus Approvals', 'approvals@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 29. Approval Status Updated
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('approval_status_updated', 'finance', 'approval', 'Approval Update: {{approval_type}} #{{request_id}}', v_master_template, 'Altus Approvals', 'approvals@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 30. Weekly Manager Performance Digest
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('weekly_performance_digest', 'management', 'system', 'Altus Weekly Management Digest | {{title}}', v_master_template, 'Altus Corporate Management', 'management@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 31. AI Recommendation Alert
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('ai_recommendation_alert', 'management', 'system', 'Altus Executive AI Insights | {{title}}', v_master_template, 'Altus Executive Intelligence', 'ai-insights@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

  -- 32. Eid & Holiday Greetings
  INSERT INTO public.notification_email_templates (template_key, business_domain, notification_type, subject_template, html_template, from_name, from_email, is_active)
  VALUES ('eid_holiday_greeting', 'management', 'announcement', 'Eid Mubarak • عيد مبارك | Altus Hospitality', v_master_template, 'Altus Hospitality', 'notifications@phg-connect.com', true)
  ON CONFLICT (template_key) DO UPDATE SET business_domain = EXCLUDED.business_domain, subject_template = EXCLUDED.subject_template, html_template = EXCLUDED.html_template, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_at = now();

END $$;
