-- Add performance indexes to core foreign keys
-- These are the most frequently queried relationships

-- Departments and organizational structure
CREATE INDEX IF NOT EXISTS idx_departments_property_id ON departments(property_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_property_id ON user_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_user_id ON user_properties(user_id);

-- Documents (heavily queried)
CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_document_acknowledgments_document_id ON document_acknowledgments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_acknowledgments_user_id ON document_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);;
