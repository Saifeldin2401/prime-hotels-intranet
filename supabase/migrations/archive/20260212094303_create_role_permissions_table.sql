-- Dynamic role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

-- RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can read role_permissions"
  ON role_permissions FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage role_permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('corporate_admin', 'regional_admin')
    )
  );

-- Seed default permissions from hardcoded values
INSERT INTO role_permissions (role, permission, granted)
VALUES
  -- corporate_admin
  ('corporate_admin', 'training.view', true),
  ('corporate_admin', 'training.create', true),
  ('corporate_admin', 'training.edit', true),
  ('corporate_admin', 'training.delete', true),
  ('corporate_admin', 'training.assign', true),
  ('corporate_admin', 'training.report', true),
  ('corporate_admin', 'users.view', true),
  ('corporate_admin', 'users.create', true),
  ('corporate_admin', 'users.edit', true),
  ('corporate_admin', 'users.delete', true),
  ('corporate_admin', 'users.assign_roles', true),
  ('corporate_admin', 'documents.view', true),
  ('corporate_admin', 'documents.create', true),
  ('corporate_admin', 'documents.edit', true),
  ('corporate_admin', 'documents.delete', true),
  ('corporate_admin', 'documents.approve', true),
  ('corporate_admin', 'announcements.view', true),
  ('corporate_admin', 'announcements.create', true),
  ('corporate_admin', 'announcements.edit', true),
  ('corporate_admin', 'announcements.delete', true),
  ('corporate_admin', 'system.view_logs', true),
  ('corporate_admin', 'system.manage_settings', true),
  ('corporate_admin', 'system.export_data', true),

  -- regional_admin (same as corporate_admin)
  ('regional_admin', 'training.view', true),
  ('regional_admin', 'training.create', true),
  ('regional_admin', 'training.edit', true),
  ('regional_admin', 'training.delete', true),
  ('regional_admin', 'training.assign', true),
  ('regional_admin', 'training.report', true),
  ('regional_admin', 'users.view', true),
  ('regional_admin', 'users.create', true),
  ('regional_admin', 'users.edit', true),
  ('regional_admin', 'users.delete', true),
  ('regional_admin', 'users.assign_roles', true),
  ('regional_admin', 'documents.view', true),
  ('regional_admin', 'documents.create', true),
  ('regional_admin', 'documents.edit', true),
  ('regional_admin', 'documents.delete', true),
  ('regional_admin', 'documents.approve', true),
  ('regional_admin', 'announcements.view', true),
  ('regional_admin', 'announcements.create', true),
  ('regional_admin', 'announcements.edit', true),
  ('regional_admin', 'announcements.delete', true),
  ('regional_admin', 'system.view_logs', true),
  ('regional_admin', 'system.manage_settings', true),
  ('regional_admin', 'system.export_data', true),

  -- regional_hr
  ('regional_hr', 'training.view', true),
  ('regional_hr', 'training.create', true),
  ('regional_hr', 'training.edit', true),
  ('regional_hr', 'training.assign', true),
  ('regional_hr', 'training.report', true),
  ('regional_hr', 'users.view', true),
  ('regional_hr', 'users.create', true),
  ('regional_hr', 'users.edit', true),
  ('regional_hr', 'users.delete', true),
  ('regional_hr', 'documents.view', true),
  ('regional_hr', 'documents.create', true),
  ('regional_hr', 'documents.edit', true),
  ('regional_hr', 'documents.delete', true),
  ('regional_hr', 'documents.approve', true),
  ('regional_hr', 'announcements.view', true),
  ('regional_hr', 'announcements.create', true),
  ('regional_hr', 'announcements.edit', true),
  ('regional_hr', 'announcements.delete', true),
  ('regional_hr', 'system.export_data', true),

  -- property_manager
  ('property_manager', 'training.view', true),
  ('property_manager', 'training.create', true),
  ('property_manager', 'training.edit', true),
  ('property_manager', 'training.assign', true),
  ('property_manager', 'training.report', true),
  ('property_manager', 'users.view', true),
  ('property_manager', 'users.edit', true),
  ('property_manager', 'documents.view', true),
  ('property_manager', 'documents.create', true),
  ('property_manager', 'documents.edit', true),
  ('property_manager', 'documents.delete', true),
  ('property_manager', 'documents.approve', true),
  ('property_manager', 'announcements.view', true),
  ('property_manager', 'announcements.create', true),
  ('property_manager', 'announcements.edit', true),
  ('property_manager', 'announcements.delete', true),

  -- property_hr
  ('property_hr', 'training.view', true),
  ('property_hr', 'training.assign', true),
  ('property_hr', 'users.view', true),
  ('property_hr', 'documents.view', true),
  ('property_hr', 'documents.create', true),
  ('property_hr', 'documents.edit', true),
  ('property_hr', 'announcements.view', true),

  -- department_head
  ('department_head', 'training.view', true),
  ('department_head', 'training.assign', true),
  ('department_head', 'users.view', true),
  ('department_head', 'documents.view', true),
  ('department_head', 'announcements.view', true),

  -- manager
  ('manager', 'training.view', true),
  ('manager', 'training.assign', true),
  ('manager', 'users.view', true),
  ('manager', 'documents.view', true),
  ('manager', 'announcements.view', true),

  -- staff
  ('staff', 'training.view', true),
  ('staff', 'documents.view', true),
  ('staff', 'announcements.view', true)

ON CONFLICT (role, permission) DO NOTHING;

COMMENT ON TABLE role_permissions IS 'Dynamic permission assignments per role. Admin-editable via the Role Management UI.';;
