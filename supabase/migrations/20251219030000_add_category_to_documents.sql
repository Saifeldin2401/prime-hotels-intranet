-- Add category_id to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
