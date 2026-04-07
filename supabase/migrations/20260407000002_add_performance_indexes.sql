-- Performance Index Migration
-- Created: 2026-04-07
-- Purpose: Add critical performance indexes to reduce query times

-- Index for learning_progress lookups by user, content type and status
-- Optimizes dashboard stats and training progress queries
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_type_status 
  ON learning_progress(user_id, content_type, status)
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Index for unread notifications lookup
-- Optimizes notification badge counts and notification lists
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read_at) 
  WHERE read_at IS NULL;

-- Index for document sorting by creation date (excluding deleted)
-- Optimizes document list views
CREATE INDEX IF NOT EXISTS idx_documents_created_sort 
  ON documents(created_at DESC, is_deleted) 
  WHERE is_deleted = false;

-- Index for guest reviews by property and date
-- Optimizes guest review dashboards and reports
CREATE INDEX IF NOT EXISTS idx_guest_reviews_property_date 
  ON guest_reviews(property_id, published_at DESC)
  WHERE published_at IS NOT NULL;

-- Additional indexes for common query patterns

-- Index for training assignments by target (user/department/property)
-- Optimizes "my assignments" queries
CREATE INDEX IF NOT EXISTS idx_learning_assignments_target 
  ON learning_assignments(target_type, target_id, content_type)
  WHERE status != 'cancelled' OR status IS NULL;

-- Index for document folder lookups
-- Optimizes document folder navigation
CREATE INDEX IF NOT EXISTS idx_documents_folder_lookup 
  ON documents(folder_id, is_deleted, created_at DESC)
  WHERE is_deleted = false;

-- Index for user property access
-- Optimizes property-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_properties_lookup 
  ON user_properties(user_id, property_id);

-- Index for audit logs by entity (for audit trails)
-- Optimizes audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON audit_logs(entity_type, entity_id, created_at DESC);

-- Index for maintenance tickets by property and status
-- Optimizes maintenance dashboards
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_property_status 
  ON maintenance_tickets(property_id, status, created_at DESC)
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Index for tasks by assignee and status
-- Optimizes task lists and dashboards
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
  ON tasks(assigned_to_id, status, due_date)
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Index for training modules by published status
-- Optimizes training module listings
CREATE INDEX IF NOT EXISTS idx_training_modules_published 
  ON training_modules(is_published, created_at DESC)
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_learning_progress_user_type_status IS 'Optimizes training progress queries for dashboards';
COMMENT ON INDEX idx_notifications_user_unread IS 'Optimizes unread notification count queries';
COMMENT ON INDEX idx_documents_created_sort IS 'Optimizes document list sorting performance';
COMMENT ON INDEX idx_guest_reviews_property_date IS 'Optimizes guest review dashboard queries';
COMMENT ON INDEX idx_learning_assignments_target IS 'Optimizes learning assignment lookups by target';
COMMENT ON INDEX idx_documents_folder_lookup IS 'Optimizes document folder queries';
COMMENT ON INDEX idx_user_properties_lookup IS 'Optimizes user property access lookups';
COMMENT ON INDEX idx_audit_logs_entity IS 'Optimizes audit trail queries by entity';
COMMENT ON INDEX idx_maintenance_tickets_property_status IS 'Optimizes maintenance ticket dashboard queries';
COMMENT ON INDEX idx_tasks_assignee_status IS 'Optimizes task list queries';
COMMENT ON INDEX idx_training_modules_published IS 'Optimizes published training module listings';
