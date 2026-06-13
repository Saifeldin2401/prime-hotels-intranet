-- Migration: Create user_pins table for favorites/pins feature
-- Created: 2026-02-28

-- Create table for user pins/favorites
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('document', 'sop', 'training', 'task', 'announcement', 'knowledge')),
  item_id UUID NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  display_order INT DEFAULT 0,
  UNIQUE(user_id, item_type, item_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_user_id ON user_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_item_lookup ON user_pins(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_display_order ON user_pins(user_id, display_order);

-- Enable RLS
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own pins
CREATE POLICY "Users can manage own pins"
  ON user_pins
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to get pinned items with details
CREATE OR REPLACE FUNCTION get_user_pins_with_details(p_user_id UUID)
RETURNS TABLE (
  pin_id UUID,
  item_type VARCHAR(50),
  item_id UUID,
  pinned_at TIMESTAMPTZ,
  display_order INT,
  title TEXT,
  description TEXT,
  url TEXT
) SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return pins with their details based on item_type
  RETURN QUERY
  SELECT 
    p.id AS pin_id,
    p.item_type,
    p.item_id,
    p.pinned_at,
    p.display_order,
    COALESCE(
      -- Document/SOP titles
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      -- Training titles
      (SELECT tm.title FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      -- Task titles
      (SELECT t.title FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      -- Announcement titles
      (SELECT a.title FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      -- Knowledge article titles
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type = 'knowledge'),
      'Unknown Item'
    ) AS title,
    COALESCE(
      -- Document/SOP descriptions
      (SELECT d.description FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      -- Training descriptions
      (SELECT tm.description FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      -- Task descriptions
      (SELECT t.description FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      -- Announcement content (truncated)
      (SELECT LEFT(a.content, 100) FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      ''
    ) AS description,
    CASE p.item_type
      WHEN 'document' THEN '/documents/' || p.item_id
      WHEN 'sop' THEN '/sop/' || p.item_id
      WHEN 'training' THEN '/learning/training/' || p.item_id
      WHEN 'task' THEN '/tasks/' || p.item_id
      WHEN 'announcement' THEN '/announcements/' || p.item_id
      WHEN 'knowledge' THEN '/knowledge/' || p.item_id
      ELSE '/'
    END AS url
  FROM user_pins p
  WHERE p.user_id = p_user_id
  ORDER BY p.display_order ASC, p.pinned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to reorder pins
CREATE OR REPLACE FUNCTION reorder_user_pins(
  p_user_id UUID,
  p_pin_orders JSONB -- Array of {pin_id, display_order} objects
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_id UUID;
  v_order INT;
  v_item RECORD;
BEGIN
  -- Verify user can only modify their own pins
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify pins for other users';
  END IF;

  -- Update display orders
  FOR v_item IN 
    SELECT 
      (elem->>'pin_id')::UUID as pin_id,
      (elem->>'display_order')::INT as display_order
    FROM jsonb_array_elements(p_pin_orders) as elem
  LOOP
    UPDATE user_pins
    SET display_order = v_item.display_order
    WHERE id = v_item.pin_id AND user_id = p_user_id;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_pins_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_user_pins(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE user_pins IS 'Stores user favorite/pinned items for quick dashboard access';
COMMENT ON COLUMN user_pins.item_type IS 'Type of pinned item: document, sop, training, task, announcement, or knowledge';
