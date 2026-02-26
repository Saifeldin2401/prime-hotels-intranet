-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-attachments', 'maintenance-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to this bucket
-- We use DO block to avoid error if policy already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads maintenance'
    ) THEN
        CREATE POLICY "Allow authenticated uploads maintenance"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'maintenance-attachments');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public read maintenance'
    ) THEN
        CREATE POLICY "Allow public read maintenance"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'maintenance-attachments');
    END IF;
END $$;;
