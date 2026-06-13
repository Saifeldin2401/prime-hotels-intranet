-- Add content-type specific fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Update content_type to use the enum if possible, but it's currently text. 
-- We'll just leave it as text for compatibility with the current code.

COMMENT ON COLUMN documents.checklist_items IS 'Array of checklist items {id, title, is_required, order}';
COMMENT ON COLUMN documents.faq_items IS 'Array of Q&A pairs {id, question, answer, order}';
COMMENT ON COLUMN documents.video_url IS 'External video URL (YouTube, Vimeo, etc.)';
COMMENT ON COLUMN documents.images IS 'Array of image objects {id, url, caption, order}';
;
