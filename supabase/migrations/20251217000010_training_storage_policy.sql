-- Allow authenticated users to upload/manage files in the 'training' folder of 'documents' bucket
CREATE POLICY "Allow authenticated uploads to training folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = 'training'
);

CREATE POLICY "Allow authenticated updates to training folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = 'training'
)
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = 'training'
);

CREATE POLICY "Allow authenticated deletes to training folder"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = 'training'
);
