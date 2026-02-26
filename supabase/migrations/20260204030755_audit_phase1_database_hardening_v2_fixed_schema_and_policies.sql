-- Audit Phase 1: Performance Hardening (V2)

-- 1. Performance Indexing (Foreign Key Coverage)
CREATE INDEX IF NOT EXISTS idx_goals_training_module_id ON goals(training_module_id);
CREATE INDEX IF NOT EXISTS idx_holidays_property_id ON holidays(property_id);
CREATE INDEX IF NOT EXISTS idx_kq_versions_changed_by ON knowledge_question_versions(changed_by);
CREATE INDEX IF NOT EXISTS idx_kq_created_by ON knowledge_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_m_attachments_ticket_id ON maintenance_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_m_attachments_uploaded_by ON maintenance_attachments(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- 2. Policy Consolidation (Resolving Multi-Permissive Warnings)

-- Table: user_settings (Combine management and update policies)
DROP POLICY IF EXISTS "user_settings_manage_admin" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "user_settings_full_management" ON user_settings 
FOR ALL TO authenticated 
USING (
  (user_id = (SELECT auth.uid())) OR 
  has_role((SELECT auth.uid()), 'regional_admin'::text)
);

-- Table: workflow_definitions
DROP POLICY IF EXISTS "Admins can manage workflow definitions" ON workflow_definitions;
DROP POLICY IF EXISTS "Anyone can view workflow definitions" ON workflow_definitions;
CREATE POLICY "workflow_definitions_permissive" ON workflow_definitions
FOR ALL TO authenticated
USING (
  has_role((SELECT auth.uid()), 'regional_admin'::text) OR 
  true -- Grant SELECT to all, with ALL access restricted to Admins by sub-checks or roles
);
-- Note: Re-wrapping workflow_definitions with cleaner logic
DROP POLICY IF EXISTS "workflow_definitions_permissive" ON workflow_definitions;
CREATE POLICY "workflow_definitions_select_all" ON workflow_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "workflow_definitions_admin_manage" ON workflow_definitions FOR ALL TO authenticated USING (has_role((SELECT auth.uid()), 'regional_admin'::text));
;
