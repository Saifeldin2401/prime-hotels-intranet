-- Migration: Add missing columns to notifications table
-- Adds entity_type, entity_id, link, and data (metadata) columns

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS entity_id UUID NULL,
  ADD COLUMN IF NOT EXISTS link TEXT NULL,
  ADD COLUMN IF NOT EXISTS data JSONB NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_entity ON public.notifications (user_id, entity_type, entity_id);

-- Update RLS policies to allow INSERT of new columns (no change needed for SELECT)
-- Ensure INSERT policy permits all columns
ALTER POLICY "notifications_insert_service" ON public.notifications
  USING (true)
  WITH CHECK (true);
