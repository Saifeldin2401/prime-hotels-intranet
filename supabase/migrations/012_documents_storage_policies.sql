-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create storage policies for the documents bucket
CREATE POLICY "Allow public read access to documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated uploads to user folders"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own files
CREATE POLICY "Allow users to update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a function to check if user can view a document
CREATE OR REPLACE FUNCTION can_view_document(document_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  doc RECORD;
  is_authorized BOOLEAN;
BEGIN
  -- Get document details
  SELECT * INTO doc FROM public.documents WHERE id = document_id LIMIT 1;
  
  -- If document doesn't exist, return false
  IF doc IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check visibility rules
  IF doc.visibility = 'public' THEN
    RETURN TRUE;
  ELSIF doc.visibility = 'private' AND doc.created_by = auth.uid() THEN
    RETURN TRUE;
  ELSIF doc.visibility = 'property' THEN
    -- Check if user has access to the property
    SELECT EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() 
      AND property_id = doc.property_id
    ) INTO is_authorized;
    RETURN is_authorized;
  ELSIF doc.visibility = 'department' THEN
    -- Check if user is in the department
    SELECT EXISTS (
      SELECT 1 FROM user_departments 
      WHERE user_id = auth.uid() 
      AND department_id = doc.department_id
    ) INTO is_authorized;
    RETURN is_authorized;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update documents RLS policy to use the function
CREATE POLICY "Enable read access for users who can view the document"
  ON public.documents
  FOR SELECT
  USING (can_view_document(id));

-- Create a function to get a secure URL for document access
CREATE OR REPLACE FUNCTION get_secure_document_url(document_id UUID)
RETURNS TEXT AS $$
DECLARE
  doc RECORD;
  file_path TEXT;
  signed_url TEXT;
BEGIN
  -- Get document details
  SELECT d.*, 
         regexp_replace(d.file_url, '^.*documents/', '') as relative_path
  INTO doc
  FROM public.documents d
  WHERE d.id = document_id
  LIMIT 1;
  
  -- Check if user can view the document
  IF NOT can_view_document(document_id) THEN
    RAISE EXCEPTION 'Not authorized to access this document';
  END IF;
  
  -- Create signed URL (valid for 1 hour)
  SELECT storage.create_signed_url('documents', doc.relative_path, 3600) INTO signed_url;
  
  RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
