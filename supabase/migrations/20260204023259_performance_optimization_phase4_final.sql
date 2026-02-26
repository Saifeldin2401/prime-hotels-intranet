-- Create Missing Indexes (Batch 4 - Final)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_title ON job_postings(title);

CREATE INDEX IF NOT EXISTS idx_employee_promotions_to_dept_id ON employee_promotions(to_department_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_approved_by ON employee_promotions(approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_from_dept_id ON employee_promotions(from_department_id);

CREATE INDEX IF NOT EXISTS idx_employee_transfers_to_dept_id ON employee_transfers(to_department_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_approved_by ON employee_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_from_dept_id ON employee_transfers(from_department_id);

CREATE INDEX IF NOT EXISTS idx_sop_documents_linked_training_id ON sop_documents(linked_training_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_linked_quiz_id ON sop_documents(linked_quiz_id);
CREATE INDEX IF NOT EXISTS idx_sop_documents_approved_by ON sop_documents(approved_by);
CREATE INDEX IF NOT EXISTS idx_sop_documents_updated_by ON sop_documents(updated_by);

CREATE INDEX IF NOT EXISTS idx_employee_documents_user_id ON employee_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_transfers_employee_id ON transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_property_id ON transfers(from_property_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_property_id ON transfers(to_property_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_department_id ON transfers(from_department_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_department_id ON transfers(to_department_id);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by ON workflow_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_step_id ON workflow_executions(current_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property_id ON maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_created_by ON maintenance_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_assigned_to_id ON maintenance_schedules(assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_created_by ON training_assignment_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_target_dept_id ON training_assignment_rules(target_department_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_job_title_id ON training_assignment_rules(job_title_id);
;
