ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS approval_push BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS training_push BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS announcement_push BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS maintenance_push BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS daily_digest_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_sounds_enabled BOOLEAN DEFAULT TRUE;

-- Update existing records to reflect new defaults
UPDATE notification_preferences
SET 
  approval_push = TRUE,
  training_push = TRUE,
  announcement_push = TRUE,
  maintenance_push = TRUE,
  quiet_hours_enabled = FALSE,
  quiet_hours_start = '22:00',
  quiet_hours_end = '08:00',
  daily_digest_enabled = FALSE,
  notification_sounds_enabled = TRUE
WHERE approval_push IS NULL;;
