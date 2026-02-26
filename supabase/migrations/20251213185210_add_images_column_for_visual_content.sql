-- Add images column for Visual content type (diagrams/infographics)
ALTER TABLE sop_documents
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sop_documents.images IS 'Array of image objects for visual content types: [{url, caption, order}]';;
