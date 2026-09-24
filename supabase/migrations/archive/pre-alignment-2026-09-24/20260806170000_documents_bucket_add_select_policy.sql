-- The 'documents' storage bucket had INSERT/UPDATE/DELETE policies (own folder, training
-- folder) but no SELECT policy at all, so createSignedUrl() -- which requires read access on
-- the storage.objects row -- always failed with "Object not found" for every user, including
-- the uploader, regardless of the documents-table-level access check (can_view_document)
-- passing. Real per-document authorization already happens one layer up: a client only learns
-- an object's storage path via get_secure_document_url(), which enforces can_view_document()
-- before returning anything. This policy just lets the storage layer allow signing once that
-- gate has already been passed.
CREATE POLICY "Allow authenticated to read documents bucket objects" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
