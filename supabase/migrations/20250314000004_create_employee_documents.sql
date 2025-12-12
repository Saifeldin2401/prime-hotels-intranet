-- Create document category type
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM ('cv', 'certificate', 'contract', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category document_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: View (Self + HR/Admins)
CREATE POLICY "Users can view own documents" ON employee_documents
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- Policy: Insert (Self only)
CREATE POLICY "Users can upload own documents" ON employee_documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Delete (Self only)
CREATE POLICY "Users can delete own documents" ON employee_documents
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to upload to employee-documents bucket
CREATE POLICY "Authenticated users can upload to employee-documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to read from employee-documents bucket
CREATE POLICY "Authenticated users can read employee-documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employee-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own employee-documents files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employee-documents' AND
    auth.uid() = owner
  );
