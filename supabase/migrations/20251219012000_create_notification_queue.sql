-- Migration: Create Bulk Notification System Tables
-- Free Plan Compatible: Uses on-demand Edge Function triggers instead of pg_cron

-- ============================================
-- 1. Notification Queue Table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  notification_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_batch ON notification_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);

-- ============================================
-- 2. Batch Jobs Table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  total_count INT NOT NULL DEFAULT 0,
  processed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_batches_status ON notification_batches(status);

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on notification_queue"
  ON notification_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on notification_batches"
  ON notification_batches FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own notifications
CREATE POLICY "Users can view own queue items"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Admins/HR can view all batches
CREATE POLICY "Admins can view all batches"
  ON notification_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================
-- 4. Helper Function to Create Batch
-- ============================================
CREATE OR REPLACE FUNCTION create_notification_batch(
  p_job_type TEXT,
  p_user_ids UUID[],
  p_notification_type TEXT,
  p_notification_data JSONB,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
BEGIN
  -- Create batch record
  INSERT INTO notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), p_notification_data, p_created_by)
  RETURNING id INTO v_batch_id;

  -- Create queue entries for each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO notification_queue (batch_id, user_id, notification_type, notification_data)
    VALUES (v_batch_id, v_user_id, p_notification_type, p_notification_data);
  END LOOP;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Function to Process Queue Batch
-- ============================================
CREATE OR REPLACE FUNCTION process_notification_batch(
  p_batch_size INT DEFAULT 50
) RETURNS TABLE(processed INT, remaining INT) AS $$
DECLARE
  v_processed INT := 0;
  v_remaining INT;
  v_item RECORD;
BEGIN
  -- Lock and process pending items
  FOR v_item IN (
    SELECT id, user_id, notification_type, notification_data, batch_id
    FROM notification_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  LOOP
    -- Mark as processing
    UPDATE notification_queue SET status = 'processing', attempts = attempts + 1
    WHERE id = v_item.id;

    -- Create the actual notification
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_item.user_id,
      v_item.notification_data->>'title',
      v_item.notification_data->>'message',
      v_item.notification_type,
      v_item.notification_data
    );

    -- Mark as sent
    UPDATE notification_queue SET status = 'sent', processed_at = NOW()
    WHERE id = v_item.id;

    -- Update batch progress
    UPDATE notification_batches 
    SET processed_count = processed_count + 1
    WHERE id = v_item.batch_id;

    v_processed := v_processed + 1;
  END LOOP;

  -- Get remaining count
  SELECT COUNT(*) INTO v_remaining FROM notification_queue WHERE status = 'pending';

  -- Update any completed batches
  UPDATE notification_batches
  SET status = 'completed', completed_at = NOW()
  WHERE status = 'processing' 
  AND processed_count + failed_count >= total_count;

  RETURN QUERY SELECT v_processed, v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification_batch TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_batch TO authenticated;

-- ============================================
-- 6. Helper RPC Functions for Edge Function
-- ============================================
CREATE OR REPLACE FUNCTION increment_batch_processed(p_batch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notification_batches 
  SET processed_count = processed_count + 1
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_batch_failed(p_batch_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notification_batches 
  SET failed_count = failed_count + 1
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_batch_processed TO authenticated;
GRANT EXECUTE ON FUNCTION increment_batch_failed TO authenticated;
