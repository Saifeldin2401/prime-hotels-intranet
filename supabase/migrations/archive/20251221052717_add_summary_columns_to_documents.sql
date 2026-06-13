ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS summary_ar TEXT;

COMMENT ON COLUMN documents.summary IS 'TL;DR summary in English for quick reading';
COMMENT ON COLUMN documents.summary_ar IS 'TL;DR summary in Arabic for quick reading';;
