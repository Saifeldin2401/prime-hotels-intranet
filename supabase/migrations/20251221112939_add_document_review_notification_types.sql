-- Add document review notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_review_pending';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_changes_requested';;
