-- Add remaining safe performance indexes (verified columns only)

-- Audit and notifications
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- SOPs
CREATE INDEX IF NOT EXISTS idx_sop_documents_department_id ON sop_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_created_by ON sop_documents(created_by);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_reporting_to ON profiles(reporting_to);

-- Requests
CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON requests(requester_id);;
