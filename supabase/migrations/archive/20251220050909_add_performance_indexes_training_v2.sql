-- Add performance indexes for training and learning modules (corrected)

-- Training modules and content
CREATE INDEX IF NOT EXISTS idx_training_modules_property_id ON training_modules(property_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_created_by ON training_modules(created_by);
CREATE INDEX IF NOT EXISTS idx_training_content_blocks_module_id ON training_content_blocks(training_module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);

-- Learning assignments
CREATE INDEX IF NOT EXISTS idx_learning_assignments_assigned_by ON learning_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_assignment_id ON learning_progress(assignment_id);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_by ON certificates(issued_by);
CREATE INDEX IF NOT EXISTS idx_certificates_training_module_id ON certificates(training_module_id);;
