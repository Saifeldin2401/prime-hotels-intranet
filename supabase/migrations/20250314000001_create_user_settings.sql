-- Create user_settings table for user preferences

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
-- Users can view their own settings
CREATE POLICY "user_settings_select_own"
    ON user_settings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert/update their own settings
CREATE POLICY "user_settings_insert_own"
    ON user_settings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
    ON user_settings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
