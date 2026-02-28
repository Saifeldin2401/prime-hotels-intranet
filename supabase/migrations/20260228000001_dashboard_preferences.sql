-- Create table for dashboard preferences
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_visibility JSONB DEFAULT '{}', -- { widgetId: boolean }
  widget_order JSONB DEFAULT '[]', -- [widgetId1, widgetId2, ...]
  property_filter UUID,
  department_filter UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own preferences
CREATE POLICY "Users can manage own dashboard preferences"
  ON user_dashboard_preferences
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_user_id 
  ON user_dashboard_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_dashboard_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dashboard_preferences_updated_at ON user_dashboard_preferences;
CREATE TRIGGER set_dashboard_preferences_updated_at
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_preferences_updated_at();
