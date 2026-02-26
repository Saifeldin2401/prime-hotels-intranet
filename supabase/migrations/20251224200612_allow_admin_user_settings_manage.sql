-- ============================================
-- ALLOW ADMINS TO MANAGE USER SETTINGS
-- ============================================

CREATE POLICY "user_settings_manage_admin" ON user_settings
FOR ALL USING (
  auth_has_role(auth.uid(), 'regional_admin')
);;
