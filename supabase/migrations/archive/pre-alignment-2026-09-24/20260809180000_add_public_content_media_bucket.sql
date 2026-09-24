-- Rich-text editor uploads (uploadFileToSupabase, used by CustomRichTextEditor
-- and ContentTypeBuilders) embed the returned URL directly into saved HTML
-- content as <img src>/<video src>. That URL is persisted in the article /
-- announcement body, so it must stay valid indefinitely:
--   * a public URL on the private 'media' bucket 404s (the current bug -- every
--     image embedded through the editor is broken), and
--   * a signed URL expires while sitting inside stored content.
-- Rewriting srcs at render time would mean async URL resolution inside every
-- HTML render path (knowledge viewer, announcements, training blocks), so the
-- structural fix is a bucket whose URLs are durable.
--
-- EXPLICIT TRADEOFF: this bucket is PUBLIC-READ, like 'avatars' (the only other
-- public bucket, restored for the same <img src> durability reason). Anything
-- uploaded here is readable by URL without authentication. That is acceptable
-- for decorative/explanatory imagery an author chose to embed in content every
-- authenticated employee can already read, and object paths are prefixed with
-- the uploader's UUID + timestamp so they are not enumerable. It is NOT a
-- substitute for the private 'media' library bucket -- anything access-
-- controlled must continue to go there and be served via signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media',
  'content-media',
  true,
  524288000, -- 500 MB (matches the editor's video ceiling)
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/webm','video/quicktime','video/x-matroska'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Uploads restricted to authenticated staff, into their own folder; reads are
-- public by virtue of the bucket being public.
CREATE POLICY "content_media_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "content_media_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'content-media' AND owner = auth.uid());

CREATE POLICY "content_media_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'content-media' AND owner = auth.uid());
