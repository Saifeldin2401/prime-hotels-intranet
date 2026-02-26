-- Remove duplicate indexes on maintenance_attachments table
-- These were identified by the Supabase performance advisor

-- Drop duplicate ticket_id index (keep idx_m_attachments_ticket_id)
DROP INDEX IF EXISTS idx_maintenance_attachments_ticket_id;

-- Drop duplicate uploaded_by index (keep idx_m_attachments_uploaded_by)  
DROP INDEX IF EXISTS idx_maintenance_attachments_uploaded_by_id;;
