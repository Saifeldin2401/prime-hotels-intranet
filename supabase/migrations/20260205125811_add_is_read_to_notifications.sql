-- Migration: Add is_read column to notifications for frontend compatibility
-- The frontend uses is_read boolean while the DB only has read_at timestamp
-- This computed column provides the expected boolean value

-- Add is_read as a generated column derived from read_at
-- This ensures consistency: is_read is always in sync with read_at
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN GENERATED ALWAYS AS (read_at IS NOT NULL) STORED;

-- Add index for efficient filtering of unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, created_at DESC) 
WHERE read_at IS NULL;

-- Add index on is_read for general filtering
CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(is_read);

COMMENT ON COLUMN notifications.is_read IS 'Computed column: true if read_at is set, false otherwise. Used by frontend for display.';;
