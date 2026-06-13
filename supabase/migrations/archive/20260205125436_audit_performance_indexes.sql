-- Audit Logs Performance Indexes
-- Adds indexes to support common filtering and sorting patterns in the Audit Logs and PII Access Logs

-- Safe index creation for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Safe index creation for pii_access_logs
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_created_at ON public.pii_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_user_id ON public.pii_access_logs(user_id);

-- Composite index for common "search by action + date" queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON public.audit_logs(action, created_at DESC);

COMMENT ON INDEX public.idx_audit_logs_action IS 'Optimizes filtering audit logs by action type';
COMMENT ON INDEX public.idx_audit_logs_entity_type IS 'Optimizes filtering audit logs by entity type';
COMMENT ON INDEX public.idx_audit_logs_created_at IS 'Optimizes sorting audit logs by date (default view)';
;
