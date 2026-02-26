-- Add timezone to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Riyadh';

-- Ensure all notification preference columns have defaults and are set for existing users
-- (Most already have defaults from previous migrations, but let's be safe)
ALTER TABLE public.notification_preferences
ALTER COLUMN approval_push SET DEFAULT false,
ALTER COLUMN training_push SET DEFAULT false,
ALTER COLUMN announcement_push SET DEFAULT false,
ALTER COLUMN maintenance_push SET DEFAULT false,
ALTER COLUMN quiet_hours_enabled SET DEFAULT false,
ALTER COLUMN quiet_hours_start SET DEFAULT '22:00:00',
ALTER COLUMN quiet_hours_end SET DEFAULT '08:00:00',
ALTER COLUMN daily_digest_enabled SET DEFAULT false,
ALTER COLUMN notification_sounds_enabled SET DEFAULT true;

-- Note: No need to update existing rows if they are NULL, defaults apply to new rows.
-- But for existing rows that might be NULL:
UPDATE public.notification_preferences 
SET 
  approval_push = COALESCE(approval_push, false),
  training_push = COALESCE(training_push, false),
  announcement_push = COALESCE(announcement_push, false),
  maintenance_push = COALESCE(maintenance_push, false),
  quiet_hours_enabled = COALESCE(quiet_hours_enabled, false),
  quiet_hours_start = COALESCE(quiet_hours_start, '22:00:00'),
  quiet_hours_end = COALESCE(quiet_hours_end, '08:00:00'),
  daily_digest_enabled = COALESCE(daily_digest_enabled, false),
  notification_sounds_enabled = COALESCE(notification_sounds_enabled, true)
WHERE 
  approval_push IS NULL OR 
  quiet_hours_enabled IS NULL OR
  notification_sounds_enabled IS NULL;;
