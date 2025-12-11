-- Create junction table for training modules and documents
CREATE TABLE training_module_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_module_id, document_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_training_module_documents_module ON training_module_documents(training_module_id);
CREATE INDEX idx_training_module_documents_doc ON training_module_documents(document_id);

-- Add RLS policies
ALTER TABLE training_module_documents ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read
CREATE POLICY "Users can view training module documents" ON training_module_documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only system roles can insert/update/delete
CREATE POLICY "System can manage training module documents" ON training_module_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('regional_admin', 'regional_hr', 'property_manager')
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_training_module_documents_updated_at
  BEFORE UPDATE ON training_module_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
