-- Migration: Performance Tuning (Missing Indexes)
-- Description: Adds indexes to all unindexed Foreign Keys

CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_department_id ON maintenance_tickets(department_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_property_id ON leave_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_department_id ON leave_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

CREATE INDEX IF NOT EXISTS idx_employee_promotions_from_dept ON employee_promotions(from_department_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_to_dept ON employee_promotions(to_department_id);

CREATE INDEX IF NOT EXISTS idx_employee_transfers_from_dept ON employee_transfers(from_department_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_to_dept ON employee_transfers(to_department_id);

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);

-- Junction Tables (ensuring they have index on the "second" ID for reverse lookups)
CREATE INDEX IF NOT EXISTS idx_user_properties_property_id ON user_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- Soft Delete Indexes
-- (Covered in previous migration loop, but explicit ones here for critical tables just in case)
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted) WHERE is_deleted = FALSE;
