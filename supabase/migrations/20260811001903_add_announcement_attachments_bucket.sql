-- AnnouncementEditor.handleFileUpload has always uploaded to a bucket named
-- "attachments" that does not exist in this project, so every announcement
-- attachment upload has failed at runtime since the feature was written
-- (confirmed: 0 announcements carry attachments). Create the bucket it should
-- have targeted, following the naming/RLS convention already used by
-- maintenance-attachments / task-attachments / sop-attachments.
--
-- Private, like every bucket except avatars. The editor stores the object PATH
-- and the viewer mints a short-lived signed URL at click time, so nothing
-- depends on a permanently-valid public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
  false,
  26214400, -- 25 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Announcements are company-wide internal comms: any authenticated employee may
-- read an attachment, but only the uploader (or an admin) may add/remove one.
CREATE POLICY "announcement_attachments_authenticated_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'announcement-attachments');

CREATE POLICY "announcement_attachments_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcement-attachments');

CREATE POLICY "announcement_attachments_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'announcement-attachments' AND owner = auth.uid());
