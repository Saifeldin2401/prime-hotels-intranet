-- ============================================================================
-- Document Notifications System
-- Notification rules for folder activity and document expiry alerts
-- ============================================================================

-- Create document notification rules table
CREATE TABLE IF NOT EXISTS document_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    notify_on_new BOOLEAN DEFAULT TRUE,
    notify_on_update BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate rules
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_notification_rules_unique 
ON document_notification_rules(user_id, COALESCE(folder_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_notification_rules_user ON document_notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_document_notification_rules_folder ON document_notification_rules(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_notification_rules_lookup ON document_notification_rules(user_id, folder_id);

-- Create index on documents.expires_at for daily cron job
CREATE INDEX IF NOT EXISTS idx_documents_expires_at_active 
ON documents(expires_at) 
WHERE expires_at IS NOT NULL AND is_archived = FALSE;

-- Create index on documents.review_reminder_date for cron job
CREATE INDEX IF NOT EXISTS idx_documents_review_reminder_active 
ON documents(review_reminder_date) 
WHERE review_reminder_date IS NOT NULL AND is_archived = FALSE;

-- Enable Row Level Security
ALTER TABLE document_notification_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View notification rules
-- Users can view their own rules
CREATE POLICY "document_notification_rules_select_own"
    ON document_notification_rules FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policy: Create notification rules
-- Users can create their own rules
CREATE POLICY "document_notification_rules_insert_own"
    ON document_notification_rules FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        (
            folder_id IS NULL OR
            EXISTS (
                SELECT 1 FROM document_folders df
                WHERE df.id = folder_id
                AND (
                    df.is_system = TRUE OR
                    df.created_by = auth.uid() OR
                    public.has_property_access(auth.uid(), df.property_id)
                )
            )
        )
    );

-- RLS Policy: Update notification rules
-- Users can update their own rules
CREATE POLICY "document_notification_rules_update_own"
    ON document_notification_rules FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Delete notification rules
-- Users can delete their own rules
CREATE POLICY "document_notification_rules_delete_own"
    ON document_notification_rules FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Function to create notifications for new documents in watched folders
CREATE OR REPLACE FUNCTION notify_document_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_rule RECORD;
    v_folder_name TEXT;
BEGIN
    -- Get folder name if document is in a folder
    IF NEW.folder_id IS NOT NULL THEN
        SELECT name INTO v_folder_name FROM document_folders WHERE id = NEW.folder_id;
    ELSE
        v_folder_name := 'All Documents';
    END IF;
    
    -- Create notifications for users watching this folder
    FOR v_rule IN 
        SELECT user_id 
        FROM document_notification_rules 
        WHERE (folder_id = NEW.folder_id OR folder_id IS NULL)
        AND notify_on_new = TRUE
        AND user_id != NEW.created_by  -- Don't notify the creator
    LOOP
        -- Insert into notifications table (assumes notifications table exists)
        INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
        VALUES (
            v_rule.user_id,
            'document_created',
            'New Document: ' || NEW.title,
            'A new document has been added to ' || v_folder_name,
            'document',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Trigger to notify on document creation
DROP TRIGGER IF EXISTS document_created_notification ON documents;
CREATE TRIGGER document_created_notification
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION notify_document_created();

-- Function to create notifications for document updates
CREATE OR REPLACE FUNCTION notify_document_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_rule RECORD;
    v_folder_name TEXT;
BEGIN
    -- Only notify if title or status changed (not just view counts, etc.)
    IF NEW.title = OLD.title AND NEW.status = OLD.status AND NEW.folder_id IS NOT DISTINCT FROM OLD.folder_id THEN
        RETURN NEW;
    END IF;
    
    -- Get folder name
    IF NEW.folder_id IS NOT NULL THEN
        SELECT name INTO v_folder_name FROM document_folders WHERE id = NEW.folder_id;
    ELSE
        v_folder_name := 'All Documents';
    END IF;
    
    -- Create notifications for users watching this folder
    FOR v_rule IN 
        SELECT user_id 
        FROM document_notification_rules 
        WHERE (folder_id = NEW.folder_id OR folder_id IS NULL)
        AND notify_on_update = TRUE
        AND user_id != COALESCE(NEW.updated_by, NEW.created_by)  -- Don't notify the updater
    LOOP
        INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
        VALUES (
            v_rule.user_id,
            'document_updated',
            'Updated Document: ' || NEW.title,
            'The document has been updated in ' || v_folder_name,
            'document',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Trigger to notify on document update
DROP TRIGGER IF EXISTS document_updated_notification ON documents;
CREATE TRIGGER document_updated_notification
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION notify_document_updated();

-- Function to check for expiring documents and create notifications
CREATE OR REPLACE FUNCTION check_expiring_documents()
RETURNS TABLE (
    documents_notified INTEGER,
    documents_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_notified INTEGER := 0;
    v_expired INTEGER := 0;
    v_doc RECORD;
BEGIN
    -- Notify about documents that need review (based on review_reminder_date)
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by,
            d.review_reminder_date,
            p.email AS owner_email,
            p.full_name AS owner_name
        FROM documents d
        LEFT JOIN profiles p ON COALESCE(d.owner_id, d.created_by) = p.id
        WHERE d.review_reminder_date IS NOT NULL
        AND d.review_reminder_date <= NOW()
        AND d.review_reminder_date > NOW() - INTERVAL '1 day'  -- Within last 24 hours
        AND d.is_archived = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.entity_id = d.id 
            AND n.type = 'document_review_reminder'
            AND n.created_at > d.review_reminder_date - INTERVAL '1 day'
        )
    LOOP
        -- Create notification for document owner/creator
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_review_reminder',
                'Document Review Required: ' || v_doc.title,
                'This document is scheduled for review today.',
                'document',
                v_doc.id
            );
            v_notified := v_notified + 1;
        END IF;
    END LOOP;
    
    -- Notify about documents expiring soon (within 7 days)
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by,
            d.expires_at,
            p.email AS owner_email,
            p.full_name AS owner_name
        FROM documents d
        LEFT JOIN profiles p ON COALESCE(d.owner_id, d.created_by) = p.id
        WHERE d.expires_at IS NOT NULL
        AND d.expires_at <= NOW() + INTERVAL '7 days'
        AND d.expires_at > NOW()
        AND d.is_archived = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.entity_id = d.id 
            AND n.type = 'document_expiring_soon'
            AND n.created_at > NOW() - INTERVAL '7 days'
        )
    LOOP
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_expiring_soon',
                'Document Expiring Soon: ' || v_doc.title,
                'This document will expire on ' || v_doc.expires_at::DATE::TEXT,
                'document',
                v_doc.id
            );
            v_notified := v_notified + 1;
        END IF;
    END LOOP;
    
    -- Archive expired documents and notify
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by
        FROM documents d
        WHERE d.expires_at IS NOT NULL
        AND d.expires_at < NOW()
        AND d.is_archived = FALSE
    LOOP
        -- Archive the document
        UPDATE documents 
        SET is_archived = TRUE, updated_at = NOW()
        WHERE id = v_doc.id;
        
        -- Notify owner
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_expired',
                'Document Archived: ' || v_doc.title,
                'This document has expired and been automatically archived.',
                'document',
                v_doc.id
            );
        END IF;
        
        v_expired := v_expired + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_notified, v_expired;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE document_notification_rules IS 'User preferences for receiving notifications about document changes';
COMMENT ON COLUMN document_notification_rules.folder_id IS 'NULL means watch all documents, otherwise watch specific folder';
COMMENT ON COLUMN document_notification_rules.notify_on_new IS 'Send notification when new document is added to watched folder';
COMMENT ON COLUMN document_notification_rules.notify_on_update IS 'Send notification when document in watched folder is updated';
COMMENT ON FUNCTION check_expiring_documents IS 'Daily cron job function to check for documents needing review or expiring soon';
;
