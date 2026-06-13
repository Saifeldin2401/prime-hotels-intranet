-- Add performance indexes for approval workflows

-- Approvals
CREATE INDEX IF NOT EXISTS idx_approval_requests_current_approver_id ON approval_requests(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approval_request_id ON approval_history(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver_id ON approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver_id ON document_approvals(approver_id);

-- Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_property_id ON announcements(property_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id ON announcement_attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON announcement_reads(user_id);;
