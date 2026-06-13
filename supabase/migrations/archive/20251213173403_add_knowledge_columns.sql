-- Add missing columns to sop_documents for Knowledge Base
ALTER TABLE sop_documents 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'sop',
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS visibility_scope TEXT DEFAULT 'property',
ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 5;

-- Add comment
COMMENT ON COLUMN sop_documents.content_type IS 'Type of content: sop, policy, guide, checklist, reference, faq, video, visual';;
