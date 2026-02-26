-- System settings table for global application configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'security', 'notifications', 'branding', 'hr', 'operations')),
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Seed default settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('session_timeout_minutes', '30'::jsonb, 'security', 'Session timeout in minutes'),
  ('max_login_attempts', '5'::jsonb, 'security', 'Maximum login attempts before account lock'),
  ('password_min_length', '8'::jsonb, 'security', 'Minimum password length'),
  ('password_expiry_days', '90'::jsonb, 'security', 'Days before password expires'),
  ('force_2fa', 'false'::jsonb, 'security', 'Force two-factor authentication for all users'),
  ('default_language', '"en"'::jsonb, 'general', 'Default language for new users'),
  ('maintenance_mode', 'false'::jsonb, 'general', 'Enable maintenance mode'),
  ('app_name', '"PRIME Connect"'::jsonb, 'branding', 'Application display name'),
  ('company_name', '"PRIME Hotels"'::jsonb, 'branding', 'Company name'),
  ('email_notifications_enabled', 'true'::jsonb, 'notifications', 'Enable email notifications globally'),
  ('in_app_notifications_enabled', 'true'::jsonb, 'notifications', 'Enable in-app notifications globally'),
  ('auto_approve_leave', 'false'::jsonb, 'hr', 'Auto-approve leave requests under certain conditions'),
  ('probation_period_days', '90'::jsonb, 'hr', 'Default probation period in days'),
  ('iqama_expiry_warning_days', '60'::jsonb, 'hr', 'Days before Iqama expiry to show warning'),
  ('default_work_week', '["Sun","Mon","Tue","Wed","Thu"]'::jsonb, 'operations', 'Default work week days'),
  ('check_in_required', 'true'::jsonb, 'operations', 'Require daily check-in for staff')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "All authenticated users can read settings"
  ON system_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify settings
CREATE POLICY "Admins can modify settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin')
    )
  );

CREATE POLICY "Admins can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin')
    )
  );

COMMENT ON TABLE system_settings IS 'Global application configuration settings';;
