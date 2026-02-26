ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = FALSE;;
