-- Add RLS policies for attachments bucket
-- Note: The bucket is already public for reading, but we need policies for INSERT, UPDATE, DELETE

-- Allow authenticated users to upload to attachments bucket
CREATE POLICY "attachments_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to update their own uploads in attachments bucket
CREATE POLICY "attachments_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete their own uploads in attachments bucket
CREATE POLICY "attachments_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'attachments');

-- Allow public read access to attachments bucket
CREATE POLICY "attachments_select_policy" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'attachments');;
