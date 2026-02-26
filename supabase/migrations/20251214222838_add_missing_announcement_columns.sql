ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS target_audience jsonb DEFAULT '{"type": "all", "values": []}'::jsonb,
ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS send_push_notification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_acknowledgment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;;
