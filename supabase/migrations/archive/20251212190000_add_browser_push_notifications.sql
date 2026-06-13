-- Add browser_push_enabled column to notification_preferences
ALTER TABLE notification_preferences 
ADD COLUMN browser_push_enabled BOOLEAN DEFAULT true;
