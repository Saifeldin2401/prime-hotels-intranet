/**
 * Shared Email Template Library
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised collection of purpose-built email templates used across all
 * edge functions.  Each template is a function that returns the full HTML
 * string with {{variable}} placeholders for the send-email renderer.
 *
 * These templates serve as *code-level defaults*.  If a matching
 * `notification_email_templates` row exists in the database, that row
 * takes precedence (see `resolveTemplate()` in send-email/index.ts).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Brand Constants ──────────────────────────────────────────────────────────
const BRAND = {
  navy: "#0B1C3E",
  gold: "#D4AF37",
  navyGradient: "linear-gradient(135deg, #0B1C3E 0%, #1a365d 100%)",
  goldAccent: "#C9A54D",
} as const;

// ── Wrapper: shared outer shell used by all templates ────────────────────────
function wrapInShell(opts: {
  lang?: string;
  dir?: string;
  title: string;
  preheader: string;
  headerGradient: string;
  headerContent: string;
  bodyContent: string;
  footerContent?: string;
}): string {
  const lang = opts.lang || "{{lang}}";
  const dir = opts.dir || "{{dir}}";
  const align = dir === "rtl" ? "right" : "{{align}}";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${opts.title}</title>
    <!--[if mso]>
    <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
    <style>
        :root { color-scheme: light dark; supported-color-schemes: light dark; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .preheader { display:none!important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
        .wrapper { width:100%; background-color:#f1f5f9; padding:40px 0; }
        .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; box-shadow:0 4px 24px rgba(11,28,62,.08),0 1px 3px rgba(0,0,0,.06); overflow:hidden; }
        .header { padding:36px 40px 32px; text-align:center; }
        .header img { max-height:44px; width:auto; }
        .pill { display:inline-block; margin-top:14px; padding:5px 16px; background:rgba(255,255,255,.15); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.2); border-radius:9999px; color:#fff; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; }
        .content { padding:40px 40px 32px; text-align:${align}; }
        .h1 { color:${BRAND.navy}; font-size:22px; font-weight:700; margin:0 0 24px; letter-spacing:-.3px; line-height:1.3; }
        .greeting { font-size:16px; margin:0 0 16px; color:#475569; }
        .msg { font-size:15px; color:#475569; margin:0 0 28px; line-height:1.7; }
        .data-box { background:#f8fafc; border:1px solid #e2e8f0; border-${align}:4px solid {{brand_color}}; border-radius:8px; padding:20px 24px; margin-bottom:28px; font-size:14px; color:#334155; line-height:1.6; }
        .kv-row { padding:8px 0; border-bottom:1px solid #e2e8f0; }
        .kv-row:last-child { border-bottom:none; }
        .kv-label { font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
        .kv-value { font-size:15px; color:#0f172a; font-weight:600; }
        .btn-wrap { margin:32px 0; text-align:${align}; }
        .btn { display:inline-block; background:${opts.headerGradient}; color:#ffffff!important; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; letter-spacing:.3px; box-shadow:0 2px 8px rgba(11,28,62,.2); }
        .divider { border:none; border-top:1px solid #e2e8f0; margin:32px 0 24px; }
        .muted { font-size:13px; color:#94a3b8; margin:0; line-height:1.5; }
        .muted a { color:{{brand_color}}; word-break:break-all; text-decoration:underline; display:inline-block; margin-top:6px; }
        .footer { background:${BRAND.navy}; padding:28px 40px; text-align:center; }
        .footer p { margin:0; font-size:13px; color:rgba(255,255,255,.6); line-height:1.6; }
        .footer-links { margin:16px 0; }
        .footer-links a { color:${BRAND.gold}; text-decoration:none; font-size:13px; font-weight:600; margin:0 12px; letter-spacing:.3px; }
        .footer-divider { border:none; border-top:1px solid rgba(255,255,255,.1); margin:16px 0; }
        .footer-copy { font-size:12px; color:rgba(255,255,255,.4); }
        @media only screen and (max-width:620px) {
            .wrapper { padding:16px 8px!important; }
            .container { border-radius:12px!important; }
            .content { padding:28px 20px 24px!important; }
            .header { padding:28px 20px 24px!important; }
            .footer { padding:24px 20px!important; }
            .h1 { font-size:20px!important; }
            .btn { padding:12px 24px!important; font-size:14px!important; }
        }
        @media (prefers-color-scheme:dark) {
            body,.wrapper { background-color:#0f172a!important; }
            .container { background-color:#1e293b!important; box-shadow:0 4px 24px rgba(0,0,0,.3)!important; }
            .h1 { color:#f1f5f9!important; }
            .greeting,.msg { color:#cbd5e1!important; }
            .data-box { background:#0f172a!important; border-color:#334155!important; color:#cbd5e1!important; }
            .kv-value { color:#f1f5f9!important; }
            .muted { color:#64748b!important; }
            .footer { background:#020617!important; }
        }
        [data-ogsc] .h1 { color:#f1f5f9!important; }
        [data-ogsc] .greeting,[data-ogsc] .msg { color:#cbd5e1!important; }
    </style>
</head>
<body>
    <div class="preheader">${opts.preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
    <div class="wrapper">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="width:600px;"><tr><td><![endif]-->
        <div class="container">
            <div class="header" style="background:${opts.headerGradient};">
                ${opts.headerContent}
            </div>
            <div class="content">
                ${opts.bodyContent}
            </div>
            <div class="footer">
                ${opts.footerContent || `<p>{{footer_text}}</p>
                <div class="footer-links">
                    <a href="{{app_url}}">{{dashboard_link_text}}</a> &bull;
                    <a href="{{app_url}}/knowledge">{{help_link_text}}</a> &bull;
                    <a href="{{preferences_url}}">{{preferences_link_text}}</a>
                </div>
                <hr class="footer-divider">
                <p class="footer-copy">&copy; {{year}} Altus Hospitality. {{rights_reserved}}</p>`}
            </div>
        </div>
        <!--[if mso]></td></tr></table><![endif]-->
    </div>
</body>
</html>`;
}

// ── Standard header block (logo + pill badge) ────────────────────────────────
function standardHeader(pillLabel = "{{business_unit_label}}"): string {
  return `<img src="{{logo_url}}" alt="Altus Hospitality">
                <br>
                <div class="pill">${pillLabel}</div>`;
}

// ── Standard CTA button with Outlook VML fallback ────────────────────────────
function ctaButton(
  href = "{{action_url}}",
  label = "{{action_label}}",
  fillColor = "{{brand_color}}",
): string {
  return `<div class="btn-wrap">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" fillcolor="${fillColor}" stroke="f">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${label}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${href}" class="btn">${label}</a>
                    <!--<![endif]-->
                </div>`;
}

// ── Trouble-clicking helper ──────────────────────────────────────────────────
function troubleClicking(href = "{{action_url}}"): string {
  return `<hr class="divider">
                <p class="muted">
                    {{trouble_clicking}}<br>
                    <a href="${href}">${href}</a>
                </p>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Password Reset
// ─────────────────────────────────────────────────────────────────────────────
export function passwordResetTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "{{message}}",
    headerGradient: "linear-gradient(135deg, #0B1C3E 0%, #1E40AF 100%)",
    headerContent: standardHeader("🔐 {{business_unit_label}}"),
    bodyContent: `
                <h1 class="h1">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>
                ${ctaButton()}
                <p class="muted" style="margin-top:24px;">⏱ This link will expire in 60 minutes for your security.</p>
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Training Assignment
// ─────────────────────────────────────────────────────────────────────────────
export function trainingAssignmentTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "A new training module has been assigned to you",
    headerGradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
    headerContent: standardHeader("📚 {{business_unit_label}}"),
    bodyContent: `
                <h1 class="h1">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", "#D97706")}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Training Deadline Reminder
// ─────────────────────────────────────────────────────────────────────────────
export function trainingDeadlineReminderTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "Your training deadline is approaching",
    headerGradient: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
    headerContent: standardHeader("⚠️ {{business_unit_label}}"),
    bodyContent: `
                <h1 class="h1">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", "#DC2626")}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Certificate Earned 🎓
// ─────────────────────────────────────────────────────────────────────────────
export function certificateEarnedTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "Congratulations on completing your training!",
    headerGradient: `linear-gradient(135deg, ${BRAND.navy} 0%, #1a365d 100%)`,
    headerContent: `<img src="{{logo_url}}" alt="Altus Hospitality">
                <br>
                <div class="pill" style="background:rgba(212,175,55,.25);border-color:${BRAND.gold};color:${BRAND.gold};">🎓 Certificate Earned</div>`,
    bodyContent: `
                <div style="text-align:center;margin-bottom:28px;">
                    <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,${BRAND.gold},${BRAND.goldAccent});text-align:center;line-height:72px;font-size:36px;">🏆</div>
                </div>
                <h1 class="h1" style="text-align:center;">{{title}}</h1>
                <p class="greeting" style="text-align:center;">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg" style="text-align:center;">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box" style="border-left-color:${BRAND.gold};text-align:center;">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", BRAND.navy)}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Approval Required
// ─────────────────────────────────────────────────────────────────────────────
export function approvalRequiredTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "An item requires your approval",
    headerGradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    headerContent: standardHeader("📋 {{business_unit_label}}"),
    bodyContent: `
                <h1 class="h1">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box" style="border-left-color:#2563EB;">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", "#2563EB")}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Approval Escalation (SLA breach)
// ─────────────────────────────────────────────────────────────────────────────
export function approvalEscalationTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "Urgent: An approval has breached its SLA deadline",
    headerGradient: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
    headerContent: `<img src="{{logo_url}}" alt="Altus Hospitality">
                <br>
                <div class="pill" style="background:rgba(220,38,38,.3);border-color:rgba(255,255,255,.4);">🚨 Escalation Alert</div>`,
    bodyContent: `
                <h1 class="h1" style="color:#DC2626;">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box" style="border-left-color:#DC2626;background:#fef2f2;">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", "#DC2626")}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Weekly Manager Report
// ─────────────────────────────────────────────────────────────────────────────
export function weeklyManagerReportTemplate(): string {
  return wrapInShell({
    title: "{{title}}",
    preheader: "Your weekly department summary is ready",
    headerGradient: `linear-gradient(135deg, ${BRAND.navy} 0%, #334155 100%)`,
    headerContent: standardHeader("📊 {{business_unit_label}}"),
    bodyContent: `
                <h1 class="h1">{{title}}</h1>
                <p class="greeting">{{greeting_hello}}{{recipient_name}},</p>
                <p class="msg">{{message}}</p>

                {{#if has_data_box}}
                <div class="data-box">
                    {{data_box_content}}
                </div>
                {{/if}}

                ${ctaButton("{{action_url}}", "{{action_label}}", BRAND.navy)}
                ${troubleClicking()}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry — map template keys to their generator functions
// ─────────────────────────────────────────────────────────────────────────────
export const EMAIL_TEMPLATES: Record<string, () => string> = {
  auth_password_reset: passwordResetTemplate,
  training_assignment: trainingAssignmentTemplate,
  training_deadline_reminder: trainingDeadlineReminderTemplate,
  certificate_earned: certificateEarnedTemplate,
  approval_required: approvalRequiredTemplate,
  approval_escalation: approvalEscalationTemplate,
  weekly_manager_report: weeklyManagerReportTemplate,
};

/**
 * Look up a code-level template by key.
 * Returns `null` if no specialised template exists (the caller should fall
 * back to `defaultHtmlTemplate()`).
 */
export function getCodeTemplate(templateKey: string): string | null {
  const factory = EMAIL_TEMPLATES[templateKey];
  return factory ? factory() : null;
}
