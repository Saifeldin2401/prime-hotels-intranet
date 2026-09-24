-- ============================================================================
-- Migration: 20260901252000_dynamicize_stored_notification_templates.sql
-- Dynamicize stored email templates in public.notification_email_templates
-- 1. Replace hardcoded logo alt tags, copyrights, and fixed hex codes
-- 2. Inject dynamic placeholders {{header_gradient}}, {{brand_primary}},
--    {{brand_secondary}}, {{brand_accent}}, and {{org_name}}
-- ============================================================================

UPDATE public.notification_email_templates
SET html_template = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  html_template,
                  'alt="Altus"',
                  'alt="{{org_name}}"'
                ),
                '&copy; {{year}} Altus Hospitality.',
                '&copy; {{year}} {{org_name}}.'
              ),
              'background-color: #0B1528;',
              'background: {{header_gradient}}; background-color: {{brand_primary}};'
            ),
            'background-color: #C9A54D;',
            'background-color: {{brand_accent}};'
          ),
          'color: #C9A54D;',
          'color: {{brand_accent}};'
        ),
        'color: #0B1528;',
        'color: {{brand_primary}};'
      ),
      'border: 1px solid rgba(201, 165, 77, 0.4);',
      'border: 1px solid rgba(212, 175, 55, 0.4);'
    ),
    'background: linear-gradient(135deg, #d97706 0%, #92400e 100%);',
    'background: {{header_gradient}}; background-color: {{brand_primary}};'
  ),
  'background-color: #d97706;',
  'background-color: {{brand_secondary}};'
),
updated_at = now();
