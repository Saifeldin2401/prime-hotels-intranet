-- ============================================================================
-- Migration: 20260814231500_update_email_sender_and_templates_to_altus.sql
-- Description: Rebrand all email template from_names, subjects, html/text bodies,
--              and corporate system settings to Altus / Altus Connect.
-- ============================================================================

-- 1. Update notification_email_templates from_name
UPDATE notification_email_templates
SET from_name = CASE
    WHEN from_name = 'PRIME Connect HR' THEN 'Altus HR'
    WHEN from_name = 'PRIME Connect Operations' THEN 'Altus Operations'
    WHEN from_name = 'PRIME Connect Finance' THEN 'Altus Finance'
    WHEN from_name = 'PRIME Connect Sales' THEN 'Altus Sales'
    WHEN from_name = 'PRIME Dashboard' THEN 'Altus Dashboard'
    WHEN from_name = 'PRIME Academy' THEN 'Altus Academy'
    WHEN from_name = 'PRIME Workflow' THEN 'Altus Workflow'
    WHEN from_name = 'PRIME Governance' THEN 'Altus Governance'
    WHEN from_name = 'PRIME AI Assistant' THEN 'Altus AI Assistant'
    WHEN from_name = 'PRIME Connect' THEN 'Altus Connect'
    WHEN from_name = 'PHG Connect' THEN 'Altus Connect'
    WHEN from_name ILIKE 'PRIME Connect %' THEN REPLACE(from_name, 'PRIME Connect', 'Altus')
    WHEN from_name ILIKE 'PRIME %' THEN REPLACE(from_name, 'PRIME', 'Altus')
    WHEN from_name ILIKE 'PHG %' THEN REPLACE(from_name, 'PHG', 'Altus')
    ELSE from_name
END
WHERE from_name ILIKE '%prime%' OR from_name ILIKE '%phg%';

-- 2. Update notification_email_templates subject_template
UPDATE notification_email_templates
SET subject_template = REPLACE(REPLACE(REPLACE(subject_template, 'PRIME Connect', 'Altus Connect'), 'PRIME', 'Altus'), 'PHG Connect', 'Altus Connect')
WHERE subject_template ILIKE '%prime%' OR subject_template ILIKE '%phg%';

-- 3. Update notification_email_templates html_template and text_template
UPDATE notification_email_templates
SET html_template = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(html_template, 'alt="PRIME"', 'alt="Altus"'),
                  'alt="PRIME Connect"', 'alt="Altus Connect"'
                ),
                'alt="PHG Connect"', 'alt="Altus Connect"'
              ),
              'PRIME Connect', 'Altus Connect'
            ),
            'PHG Connect', 'Altus Connect'
          ),
          'PRIME Hotels Group', 'Altus Hospitality'
        ),
        'Prime Hotels Group', 'Altus Hospitality'
      ),
      'مجموعة فنادق برايم', 'آلتوس للضيافة'
    ),
    text_template = CASE 
      WHEN text_template IS NOT NULL THEN
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(text_template, 'PRIME Connect', 'Altus Connect'),
              'PHG Connect', 'Altus Connect'
            ),
            'PRIME Hotels', 'Altus Hospitality'
          ),
          'Prime Hotels', 'Altus Hospitality'
        )
      ELSE text_template
    END
WHERE html_template ILIKE '%prime%' 
   OR html_template ILIKE '%phg%' 
   OR text_template ILIKE '%prime%' 
   OR text_template ILIKE '%phg%';

-- 4. Update system_settings
UPDATE system_settings
SET value = '"Altus Hospitality"'::jsonb
WHERE key = 'company_name';

UPDATE system_settings
SET value = '"Altus Connect"'::jsonb
WHERE key = 'app_name';

UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{name}', '"Altus Hospitality Group"'),
    '{brand}', '"Altus Hotels & Resorts"'
  ),
  '{academy_name}', '"Altus Academy"'
)
WHERE key = 'company_profile';

UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(value, '{logo_text}', '"ALTUS HOSPITALITY"'),
  '{certificate_seal}', '"Altus Academy"'
)
WHERE key = 'branding';
