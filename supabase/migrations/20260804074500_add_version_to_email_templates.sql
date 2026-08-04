-- Add version column for template versioning (Tier 2.2)
ALTER TABLE notification_email_templates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
